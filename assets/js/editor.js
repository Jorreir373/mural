/* ==========================================================================
   Editor de huellas
   - Dibuja sobre un canvas transparente de 512x286 (la mitad de la foto de
     la superficie). Todo se pinta "pixel a pixel" para que combine con el
     estilo del aula.
   - Al terminar se exporta solo el dibujo (PNG transparente); la mesa, silla
     o pared de fondo se pone con CSS, así se pueden superponer todas las
     huellas de la misma superficie.
   ========================================================================== */
(function () {
  'use strict';

  const W = 512, H = 286;                       // tamaño del dibujo (debe coincidir con config.php)
  // Zona dibujable de cada superficie: [x, y, ancho, alto] en píxeles del canvas
  const BOUNDS = {
    mesa:  [50, 31, 412, 218],                  // solo la tabla de madera
    silla: [52, 3, 412, 278],                   // solo el asiento
    pared: [0, 0, 512, 257]                     // la pared sin el zócalo
  };

  const PALETTE = ['#1d3fc0', '#111111', '#d62828', '#1a9c4b', '#7b3fe4',
                   '#f28c28', '#ff4f9a', '#8a5a2b', '#f4d21f', '#ffffff'];
  const CORRECTOR_COLOR = '#fbfbf6';

  const HELP = {
    pen:       'Arrastrá para dibujar o firmar.',
    marker:    'Marcador: trazo grueso para escribir grande.',
    corrector: 'Corrector: tachá o tapá lo que quieras.',
    eraser:    'Borrador: pasalo por encima de lo que dibujaste.',
    text:      'Escribí tu texto y tocá la superficie para ponerlo.',
    chicle:    'Tocá para pegar un chicle.',
    galleta:   'Tocá para dejar una galletita (a veces mordida).',
    pan:       'Tocá para dejar un pedazo de pan.',
    yerba:     'Arrastrá para tirar yerba de mate.',
    migas:     'Arrastrá para desparramar migas.',
    mancha:    'Tocá para derramar un poco de mate.'
  };

  const FREEHAND = { pen: 1, marker: 1, corrector: 1, eraser: 1 };
  const SCATTER  = { yerba: 1, migas: 1 };
  const STAMPS   = { chicle: 1, galleta: 1, pan: 1, mancha: 1 };
  const NO_COLOR = { corrector: 1, eraser: 1, chicle: 1, galleta: 1, pan: 1, yerba: 1, migas: 1, mancha: 1 };

  /* ------------------------------------------------------------- sprites */
  const SPRITES = {
    chicle: {
      grids: [[
        '...OOOO....',
        '.OOPPpPOO..',
        'OPPPPPPPPO.',
        'OPpPPPPPPDO',
        'OPPPPPPPDDO',
        '.OPPPPDDDO.',
        '..OODDDOO..',
        '....OOOO...'
      ]],
      palettes: [
        { O: '#7e2a52', P: '#f47fb0', p: '#ffb3d3', D: '#c74c85' },
        { O: '#245e4b', P: '#7fdcb0', p: '#c9f7e3', D: '#43a882' },
        { O: '#55556a', P: '#e6e6ee', p: '#ffffff', D: '#b4b4c6' }
      ]
    },
    galleta: {
      grids: [[
        '..OOOOO..',
        '.OTTTTTO.',
        'OTTcTTTTO',
        'OTTTTTcTO',
        'OTcTTTTTO',
        'OTTTTcTTO',
        'OTTcTTTTO',
        '.OTTTTTO.',
        '..OOOOO..'
      ]],
      bite: true,
      palettes: [{ O: '#9a6428', T: '#e0aa5e', c: '#5a3517' }]
    },
    pan: {
      grids: [[
        '.OOO..OOO.',
        'OCCCOOCCCO',
        'OCCCCCCCCO',
        'OCcCCCCcCO',
        'OCCCCCCCCO',
        'OCCCcCCCCO',
        'OCCCCCCCCO',
        'OCCCCCCCCO',
        '.OOOOOOOO.'
      ]],
      palettes: [{ O: '#9a5a24', C: '#f3dca6', c: '#e0bd78' }]
    }
  };

  const YERBA_COLORS = ['#5f7d24', '#7a9636', '#496018', '#8b6b2a', '#a08240'];
  const MIGAS_COLORS = ['#fff0c4', '#e6c481', '#b98a4c', '#f7e3ab', '#8d6532'];

  /* ------------------------------------------------------------- estado */
  const $ = (s) => document.querySelector(s);
  const canvas = $('#draw'), ghost = $('#ghost'), surface = $('#surface');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const gctx = ghost.getContext('2d');

  const state = {
    tipo: 'mesa', tool: 'pen', color: PALETTE[0], size: 3,
    text: '', font: 'pixel', v: null,
    drawing: false, last: null, dirty: false
  };
  let history = [];

  /* ---------------------------------------------------------- utilidades */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rint = (n) => Math.floor(Math.random() * n);

  function newVariant() {
    return { rot: rint(4), flip: Math.random() < 0.5, pal: rint(3), bite: Math.random() < 0.4, seed: rint(1e9) };
  }

  function stampScale() { return 2 + Math.round(state.size / 4); }

  /* ------------------------------------------------ pinceles (píxel a píxel) */
  function dot(c, cx, cy, d, clear) {
    const R = Math.floor(d / 2);
    for (let dy = -R; dy <= R; dy++) {
      const hw = Math.floor(Math.sqrt(R * R + R - dy * dy) + 0.5);
      if (clear) c.clearRect(cx - hw, cy + dy, hw * 2 + 1, 1);
      else c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }

  function line(c, x0, y0, x1, y1, d, clear) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      dot(c, x0, y0, d, clear);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function brushInfo() {
    const s = state.size;
    switch (state.tool) {
      case 'pen':       return { d: s,         color: state.color };
      case 'marker':    return { d: s * 2,     color: state.color };
      case 'corrector': return { d: s * 2,     color: CORRECTOR_COLOR };
      case 'eraser':    return { d: s * 3 + 3, color: '#ffffff', clear: true };
    }
    return null;
  }

  function scatter(c, x, y, radius, colors, count, rng) {
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
      const q = rng(), s = q < 0.12 ? 3 : (q < 0.45 ? 2 : 1);
      c.fillStyle = colors[Math.floor(rng() * colors.length)];
      c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), s, s);
    }
  }
  const scatterRadius = () => 4 + state.size * 1.6;

  /* ----------------------------------------------- sellos (sprites/blob) */
  const stampCache = new Map();

  function spriteCells(grid, rot, flip) {
    let g = grid.map((r) => r.split(''));
    if (flip) g = g.map((r) => r.slice().reverse());
    for (let i = 0; i < rot; i++) {
      const h = g.length, w = g[0].length, n = [];
      for (let x = 0; x < w; x++) { n[x] = []; for (let y = h - 1; y >= 0; y--) n[x].push(g[y][x]); }
      g = n;
    }
    return g;
  }

  function biteCells(g, seed) {           // le saca un mordisco a la galletita
    const rng = mulberry32(seed);
    const h = g.length, w = g[0].length;
    const cx = rng() < 0.5 ? 0 : w - 1, cy = rng() < 0.5 ? 0 : h - 1;
    const r = 2.9 + rng() * 0.8;
    const out = g.map((row) => row.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (Math.hypot(x - cx, y - cy) < r) out[y][x] = '.';
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (out[y][x] === '.' || out[y][x] === 'O') continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (out[y + dy] && out[y + dy][x + dx]) === '.');
      if (near) out[y][x] = 'O';
    }
    return out;
  }

  function blobCanvas(scale, seed) {       // mancha de mate derramado
    const R = 5 + scale * 4, size = R * 2 + 3;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const rng = mulberry32(seed);
    const waves = [1, 2, 3, 5].map((k) => ({ k, a: rng() * 0.16 + 0.03, p: rng() * 6.28 }));
    const noise = (ang) => waves.reduce((s, w) => s + w.a * Math.sin(w.k * ang + w.p), 0);
    const cx = size / 2, cy = size / 2;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
      const lim = R * (0.78 + noise(Math.atan2(dy, dx)));
      const dist = Math.hypot(dx, dy);
      if (dist < lim) {
        x.globalAlpha = dist > lim - 1.6 ? 0.75 : 0.5;
        x.fillStyle = dist > lim - 1.6 ? '#4f3219' : '#86592f';
        x.fillRect(px, py, 1, 1);
      }
    }
    // gotitas alrededor
    x.globalAlpha = 0.7; x.fillStyle = '#5a3a1e';
    for (let i = 0; i < 4 + scale * 2; i++) {
      const a = rng() * 6.28, r = R * (0.9 + rng() * 0.15);
      x.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1 + (rng() < 0.3), 1 + (rng() < 0.3));
    }
    return c;
  }

  function stampCanvas(tool, v, scale) {
    const key = [tool, v.rot, v.flip, v.pal, v.bite, v.bite ? v.seed : 0, tool === 'mancha' ? v.seed : 0, scale].join('|');
    if (stampCache.has(key)) return stampCache.get(key);
    let c;
    if (tool === 'mancha') {
      c = blobCanvas(scale, v.seed);
    } else {
      const spr = SPRITES[tool];
      let cells = spriteCells(spr.grids[0], v.rot, v.flip);
      if (spr.bite && v.bite) cells = biteCells(cells, v.seed);
      const pal = spr.palettes[v.pal % spr.palettes.length];
      c = document.createElement('canvas');
      c.width = cells[0].length * scale; c.height = cells.length * scale;
      const x = c.getContext('2d');
      cells.forEach((row, y) => row.forEach((ch, xx) => {
        if (ch === '.') return;
        x.fillStyle = pal[ch]; x.fillRect(xx * scale, y * scale, scale, scale);
      }));
    }
    if (stampCache.size > 300) stampCache.clear();
    stampCache.set(key, c);
    return c;
  }

  /* --------------------------------------------------------------- texto */
  const FONTS = {
    pixel:      (s) => '600 ' + s + 'px "Pixelify Sans", "Courier New", monospace',
    imprenta:   (s) => '800 ' + s + 'px Nunito, "Arial Black", Arial, sans-serif',
    manuscrita: (s) => 'italic 700 ' + (s + 2) + 'px "Segoe Script", "Bradley Hand", "Marker Felt", "Comic Sans MS", cursive'
  };
  const textCache = new Map();

  function textCanvas() {
    const text = state.text.trim();
    if (!text) return null;
    const px = 9 + state.size * 2;
    const key = [text, state.font, px, state.color].join('|');
    if (textCache.has(key)) return textCache.get(key);
    const m = document.createElement('canvas').getContext('2d');
    m.font = FONTS[state.font](px);
    const w = Math.ceil(m.measureText(text).width) + 6, h = Math.ceil(px * 1.5) + 4;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = FONTS[state.font](px);
    x.textBaseline = 'middle'; x.fillStyle = state.color;
    x.fillText(text, 3, h / 2 + 1);
    const img = x.getImageData(0, 0, w, h), d = img.data;   // bordes duros: sin suavizado
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
    x.putImageData(img, 0, 0);
    if (textCache.size > 100) textCache.clear();
    textCache.set(key, c);
    return c;
  }

  /* ---------------------------------------------------------- historial */
  function snapshot() {
    history.push(ctx.getImageData(0, 0, W, H));
    if (history.length > 30) history.shift();
    state.dirty = true;
  }
  function undo() {
    if (!history.length) return;
    ctx.putImageData(history.pop(), 0, 0);
    state.dirty = history.length > 0;
  }
  function clearAll() {
    if (!hasInk()) return;
    snapshot();
    ctx.clearRect(0, 0, W, H);
  }
  function hasInk() {
    const d = ctx.getImageData(0, 0, W, H).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  }

  /* ------------------------------------------------------------- acciones */
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  function placeStamp(p) {
    const sc = stampCanvas(state.tool, state.v, stampScale());
    ctx.drawImage(sc, Math.round(p.x - sc.width / 2), Math.round(p.y - sc.height / 2));
    state.v = newVariant();
  }

  function placeText(p) {
    const tc = textCanvas();
    if (!tc) {
      if (window.mostrarAviso) window.mostrarAviso('Primero escribí tu texto en el cuadro de la izquierda.');
      $('#text-input').focus();
      return false;
    }
    ctx.drawImage(tc, Math.round(p.x - tc.width / 2), Math.round(p.y - tc.height / 2));
    return true;
  }

  function begin(p) {
    const t = state.tool;
    if (t === 'text') {
      if (!textCanvas()) { placeText(p); return; }
      snapshot(); placeText(p); return;
    }
    snapshot();
    if (FREEHAND[t]) {
      const b = brushInfo();
      ctx.fillStyle = b.color;
      state.drawing = true; state.last = p;
      dot(ctx, Math.floor(p.x), Math.floor(p.y), b.d, b.clear);
    } else if (SCATTER[t]) {
      state.drawing = true; state.last = p;
      sprinkle(p);
    } else if (STAMPS[t]) {
      placeStamp(p);
    }
  }

  function sprinkle(p) {
    const r = scatterRadius();
    const colors = state.tool === 'yerba' ? YERBA_COLORS : MIGAS_COLORS;
    const count = Math.max(4, Math.round(r * (state.tool === 'yerba' ? 1.4 : 0.9)));
    scatter(ctx, p.x, p.y, r, colors, count, Math.random);
  }

  function move(p) {
    if (!state.drawing) return;
    const t = state.tool;
    if (FREEHAND[t]) {
      const b = brushInfo();
      ctx.fillStyle = b.color;
      line(ctx, state.last.x, state.last.y, p.x, p.y, b.d, b.clear);
      state.last = p;
    } else if (SCATTER[t]) {
      const dx = p.x - state.last.x, dy = p.y - state.last.y, dist = Math.hypot(dx, dy);
      const steps = Math.floor(dist / 3);
      for (let i = 1; i <= steps; i++) sprinkle({ x: state.last.x + dx * i / steps, y: state.last.y + dy * i / steps });
      if (steps) state.last = p;
    }
  }

  function end() { state.drawing = false; state.last = null; }

  /* ---------------------------------------------------------------- ghost */
  function drawGhost(p) {
    gctx.clearRect(0, 0, W, H);
    if (!p || state.drawing) return;
    const t = state.tool;
    gctx.save();
    gctx.globalAlpha = 0.55;
    if (FREEHAND[t]) {
      const b = brushInfo();
      gctx.fillStyle = b.color;
      dot(gctx, Math.floor(p.x), Math.floor(p.y), b.d, false);
      if (b.clear) { gctx.globalAlpha = 0.9; gctx.strokeStyle = '#000'; gctx.lineWidth = 1;
        gctx.strokeRect(Math.floor(p.x - b.d / 2) + 0.5, Math.floor(p.y - b.d / 2) + 0.5, b.d, b.d); }
    } else if (t === 'text') {
      const tc = textCanvas();
      if (tc) gctx.drawImage(tc, Math.round(p.x - tc.width / 2), Math.round(p.y - tc.height / 2));
    } else if (SCATTER[t]) {
      gctx.strokeStyle = '#000'; gctx.globalAlpha = 0.35; gctx.setLineDash([3, 3]);
      gctx.beginPath(); gctx.arc(p.x, p.y, scatterRadius(), 0, Math.PI * 2); gctx.stroke();
    } else if (STAMPS[t]) {
      const sc = stampCanvas(t, state.v, stampScale());
      gctx.drawImage(sc, Math.round(p.x - sc.width / 2), Math.round(p.y - sc.height / 2));
    }
    gctx.restore();
  }

  /* -------------------------------------------------------------- eventos */
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    gctx.clearRect(0, 0, W, H);
    begin(pos(e));
  });
  canvas.addEventListener('pointermove', (e) => {
    const evs = (state.drawing && e.getCoalescedEvents) ? e.getCoalescedEvents() : [];
    if (evs.length) evs.forEach((ev) => move(pos(ev))); else move(pos(e));
    drawGhost(pos(e));
  });
  const stop = () => end();
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', () => { gctx.clearRect(0, 0, W, H); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !$('#view-editor').hidden) {
      if (document.activeElement && document.activeElement.id === 'text-input') return;
      e.preventDefault(); undo();
    }
  });

  /* ------------------------------------------------------------ interfaz */
  const swatchBox = $('#swatches'), colorCustom = $('#color-custom');
  PALETTE.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch'; b.style.backgroundColor = c;
    b.setAttribute('aria-label', 'Color ' + (i + 1)); b.dataset.color = c;
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => setColor(c));
    swatchBox.appendChild(b);
  });

  function setColor(c) {
    state.color = c;
    swatchBox.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === c ? 'true' : 'false'));
    if (/^#[0-9a-f]{6}$/i.test(c)) colorCustom.value = c;
  }
  colorCustom.addEventListener('input', () => setColor(colorCustom.value));

  function setTool(t) {
    state.tool = t;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tool === t ? 'true' : 'false'));
    $('#fs-text').hidden = t !== 'text';
    $('#fs-color').classList.toggle('is-disabled', !!NO_COLOR[t]);
    $('#size-label').textContent = FREEHAND[t] ? 'Grosor' : (t === 'text' ? 'Tamaño de letra' : (SCATTER[t] ? 'Cantidad' : 'Tamaño'));
    $('#canvas-help').textContent = HELP[t];
    if (STAMPS[t]) state.v = newVariant();
    if (t === 'text') $('#text-input').focus();
    gctx.clearRect(0, 0, W, H);
  }
  document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

  $('#size').addEventListener('input', (e) => { state.size = +e.target.value; });
  $('#text-input').addEventListener('input', (e) => { state.text = e.target.value; });
  $('#text-font').addEventListener('change', (e) => { state.font = e.target.value; });

  // Íconos de los extras (dibujados con los mismos sprites)
  function paintIcons() {
    document.querySelectorAll('.tool--stamp').forEach((btn) => {
      const t = btn.dataset.tool, c = btn.querySelector('canvas'), x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      const v = { rot: 0, flip: false, pal: 0, bite: t === 'galleta', seed: 7 };
      if (SPRITES[t] || t === 'mancha') {
        const sc = stampCanvas(t, v, t === 'mancha' ? 1 : 2);
        x.drawImage(sc, Math.round((24 - sc.width) / 2), Math.round((24 - sc.height) / 2));
      } else {
        const rng = mulberry32(t === 'yerba' ? 11 : 5);
        scatter(x, 12, 12, 9, t === 'yerba' ? YERBA_COLORS : MIGAS_COLORS, t === 'yerba' ? 46 : 32, rng);
      }
    });
  }

  /* ---------------------------------------------------------- API pública */
  function open(tipo) {
    state.tipo = tipo;
    surface.dataset.tipo = tipo;
    canvas.width = W; canvas.height = H;            // limpia y reinicia el contexto
    const b = BOUNDS[tipo] || BOUNDS.mesa;
    ctx.beginPath(); ctx.rect(b[0], b[1], b[2], b[3]); ctx.clip();   // no se dibuja fuera de la superficie
    gctx.clearRect(0, 0, W, H);
    history = []; state.dirty = false; state.drawing = false;
    stampCache.clear(); textCache.clear();
    state.v = newVariant();
    setTool('pen');
    if (document.fonts && document.fonts.load) {
      document.fonts.load('600 16px "Pixelify Sans"');
      document.fonts.load('800 16px Nunito');
    }
  }

  function exportPNG() {
    if (!hasInk()) return null;
    return canvas.toDataURL('image/png');
  }

  window.MuralEditor = {
    open: open,
    undo: undo,
    clear: clearAll,
    exportPNG: exportPNG,
    isDirty: () => state.dirty,
    markSaved: () => { state.dirty = false; history = []; }
  };

  paintIcons();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => textCache.clear());
})();
