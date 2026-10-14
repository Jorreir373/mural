/* ==========================================================================
   Mural del aula  -  menú, navegación y galerías
   ========================================================================== */
(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const TIPOS = {
    mesa:  { singular: 'mesa',  plural: 'mesas',   todas: 'Todas las mesas',   en: 'la mesa',  hint: 'Mesa: dibujá o firmá sobre la tabla.' },
    silla: { singular: 'silla', plural: 'sillas',  todas: 'Todas las sillas',  en: 'la silla', hint: 'Silla: dejá tu marca en el asiento.' },
    pared: { singular: 'pared', plural: 'paredes', todas: 'Todas las paredes', en: 'la pared', hint: 'Pared: la superficie más grande para escribir.' }
  };

  const ADMIN = new URLSearchParams(location.search).has('admin');

  /* ------------------------------------------------------------------ API */
  async function api(action, opts) {
    opts = opts || {};
    const qs = new URLSearchParams(Object.assign({ action: action }, opts.params || {}));
    let res;
    try {
      res = await fetch('api.php?' + qs.toString(), opts.body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.body) }
        : { cache: 'no-store' });
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor.');
    }
    let data;
    try { data = await res.json(); }
    catch (e) { throw new Error('El servidor no respondió como se esperaba. Abrí la página desde el servidor PHP (localhost), no haciendo doble clic en el archivo.'); }
    if (!res.ok || !data.ok) throw new Error(data.error || 'Ocurrió un error.');
    return data;
  }

  function showAlert(msg) {
    const el = $('#app-alert');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.hidden = false;
  }

  let toastTimer = null;
  window.mostrarAviso = function (msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  };

  /* ------------------------------------------------------ contadores (nav) */
  async function refreshCounts() {
    try {
      const { counts } = await api('counts');
      $$('[data-count]').forEach((el) => { el.textContent = counts[el.dataset.count] ?? 0; });
      showAlert('');
    } catch (e) { showAlert(e.message); }
  }

  /* ------------------------------------------------------ menú (el aula) */
  // Medidas del aula.png (1024 x 572): piso, mesas, sillas y paredes
  const SW = 1024, SH = 572;
  const FLOOR = { x: 166, y: 92, w: 691, h: 394 };
  const COLS = [0.0912, 0.3142, 0.5407, 0.7655];    // posición X de cada columna de mesas (relativa al piso)
  const ROWS = [0.1453, 0.4219, 0.7063];            // posición Y de cada fila
  const TABLE = { w: 0.1434, h: 0.1128 };
  const CHAIR = { w: 0.0699, h: 0.0835 };

  const pctX = (v) => (v / SW * 100).toFixed(3) + '%';
  const pctY = (v) => (v / SH * 100).toFixed(3) + '%';

  function place(el, x, y, w, h) {
    el.style.left = pctX(x); el.style.top = pctY(y);
    el.style.width = pctX(w); el.style.height = pctY(h);
  }

  function hotButton(tipo, cls, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hot ' + cls;
    b.dataset.tipo = tipo;
    b.setAttribute('aria-label', label);
    return b;
  }

  function wall(label, pts, withImg) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys);
    const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const b = hotButton('pared', 'hot--wall', label);
    place(b, bx, by, bw, bh);
    b.style.clipPath = 'polygon(' + pts.map((p) =>
      ((p[0] - bx) / bw * 100).toFixed(2) + '% ' + ((p[1] - by) / bh * 100).toFixed(2) + '%').join(',') + ')';
    if (withImg) {
      const img = document.createElement('img');
      img.src = 'assets/img/pared_menu.png'; img.alt = ''; img.draggable = false;
      b.appendChild(img);
    }
    return b;
  }

  function buildStage() {
    const stage = $('#stage');
    let n = 0;
    ROWS.forEach((ry) => COLS.forEach((cx) => {
      n++;
      const tx = FLOOR.x + cx * FLOOR.w, ty = FLOOR.y + ry * FLOOR.h;
      const tw = TABLE.w * FLOOR.w, th = TABLE.h * FLOOR.h;

      const mesa = hotButton('mesa', 'hot--table', 'Mesa ' + n + ': dejar mi huella');
      place(mesa, tx, ty, tw, th);
      mesa.innerHTML = '<img src="assets/img/mesa_menu.png" alt="" draggable="false">';

      const cw = CHAIR.w * FLOOR.w, ch = CHAIR.h * FLOOR.h;
      const silla = hotButton('silla', 'hot--chair', 'Silla ' + n + ': dejar mi huella');
      place(silla, tx + (tw - cw) / 2, ty + th + 1.5, cw, ch);
      silla.innerHTML = '<img src="assets/img/silla_menu.png" alt="" draggable="false">';

      stage.append(mesa, silla);
    }));

    // Paredes: la de abajo usa pared_menu.png; las otras tres usan la misma zona resaltada
    stage.append(
      wall('Pared del pizarrón: dejar mi huella',  [[125, 7], [899, 7], [857, 92], [166, 92]], false),
      wall('Pared izquierda: dejar mi huella',     [[125, 7], [166, 92], [166, 486], [125, 488]], false),
      wall('Pared derecha: dejar mi huella',       [[899, 7], [857, 92], [857, 486], [899, 488]], false),
      wall('Pared del fondo: dejar mi huella',     [[125, 488], [899, 488], [868, 562], [155, 562]], true)
    );

    const hint = $('#stage-hint'), base = hint.textContent;
    stage.addEventListener('pointerover', (e) => {
      const h = e.target.closest('.hot');
      if (!h) return;
      stage.dataset.hover = h.dataset.tipo;
      hint.textContent = TIPOS[h.dataset.tipo].hint;
    });
    stage.addEventListener('pointerout', (e) => {
      const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.hot') : null;
      if (to) return;
      delete stage.dataset.hover; hint.textContent = base;
    });
    stage.addEventListener('focusin', (e) => {
      const h = e.target.closest('.hot'); if (!h) return;
      stage.dataset.hover = h.dataset.tipo; hint.textContent = TIPOS[h.dataset.tipo].hint;
    });
    stage.addEventListener('focusout', () => { delete stage.dataset.hover; hint.textContent = base; });
    stage.addEventListener('click', (e) => {
      const h = e.target.closest('.hot');
      if (h) location.hash = '#editor/' + h.dataset.tipo;
    });
  }

  /* -------------------------------------------------------------- vistas */
  let currentView = 'menu', currentTipo = null, lastHash = '#menu', ignoreHash = false;

  function showView(name) {
    ['menu', 'editor', 'gallery'].forEach((v) => { $('#view-' + v).hidden = v !== name; });
    currentView = name;
    window.scrollTo(0, 0);
  }

  function route() {
    if (ignoreHash) { ignoreHash = false; return; }

    // Si estaba dibujando y todavía no guardó, preguntamos antes de salir.
    if (currentView === 'editor' && window.MuralEditor.isDirty()) {
      const next = location.hash;
      if (next !== lastHash && !confirm('Si salís ahora se pierde tu dibujo. ¿Querés salir igual?')) {
        ignoreHash = true; location.hash = lastHash; return;
      }
    }

    const parts = (location.hash.replace(/^#/, '') || 'menu').split('/');
    const vista = parts[0], tipo = parts[1];
    lastHash = location.hash || '#menu';

    if (vista === 'editor' && TIPOS[tipo]) return openEditor(tipo);
    if (vista === 'galeria' && TIPOS[tipo]) return openGallery(tipo);
    showView('menu'); document.title = 'Mural del aula | Secundaria Técnica 1';
    stopAutoRefresh(); refreshCounts();
  }

  /* --------------------------------------------------------------- editor */
  function openEditor(tipo) {
    currentTipo = tipo;
    stopAutoRefresh();
    showView('editor');
    window.MuralEditor.open(tipo);
    $('#editor-title').textContent = 'Tu huella en ' + TIPOS[tipo].en;
    document.title = 'Tu huella en ' + TIPOS[tipo].en + ' | Mural del aula';
  }

  $('#btn-back').addEventListener('click', () => { location.hash = '#menu'; });
  $('#btn-undo').addEventListener('click', () => window.MuralEditor.undo());
  $('#btn-clear').addEventListener('click', () => window.MuralEditor.clear());

  /* ------------------------------------------------- guardar (nombre + mensaje) */
  const modalGuardar = bootstrap.Modal.getOrCreateInstance($('#modal-guardar'));
  const modalListo   = bootstrap.Modal.getOrCreateInstance($('#modal-listo'));
  let pendingPNG = null;

  function paintStatic(container, tipo, urls) {
    container.dataset.tipo = tipo;
    container.textContent = '';
    (Array.isArray(urls) ? urls : [urls]).forEach((u) => {
      const img = document.createElement('img');
      img.className = 'overlay'; img.src = u; img.alt = ''; img.loading = 'lazy'; img.draggable = false;
      container.appendChild(img);
    });
  }

  $('#btn-finish').addEventListener('click', () => {
    const png = window.MuralEditor.exportPNG();
    if (!png) { window.mostrarAviso('Todavía no dejaste ninguna huella. Dibujá algo primero.'); return; }
    pendingPNG = png;
    paintStatic($('#save-preview'), currentTipo, png);
    $('#form-error').hidden = true;
    modalGuardar.show();
  });

  $('#modal-guardar').addEventListener('shown.bs.modal', () => $('#in-nombre').focus());
  $('#in-mensaje').addEventListener('input', (e) => { $('#msg-count').textContent = e.target.value.length + ' / 200'; });

  $('#form-guardar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nombre = $('#in-nombre').value.trim();
    const mensaje = $('#in-mensaje').value.trim();
    const err = $('#form-error');
    err.hidden = true;
    if (!nombre) {
      err.textContent = 'Escribí tu nombre para poder dejar la huella.'; err.hidden = false;
      $('#in-nombre').focus(); return;
    }
    const btn = $('#btn-save');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      await api('save', { body: { tipo: currentTipo, nombre: nombre, mensaje: mensaje, imagen: pendingPNG } });
      window.MuralEditor.markSaved();
      pendingPNG = null;
      $('#form-guardar').reset(); $('#msg-count').textContent = '0 / 200';

      const t = TIPOS[currentTipo];
      $('#modal-listo-title').textContent = '¡Listo, ' + nombre + '!';
      $('#listo-text').textContent = 'Tu huella ya quedó en ' + t.en + '. Ahora podés verla junto a las de tus compañeros.';
      $('#listo-ver').textContent = t.todas === 'Todas las mesas' ? 'Ver todas las mesas' : 'Ver ' + t.todas.toLowerCase();
      $('#listo-ver').setAttribute('href', '#galeria/' + currentTipo);
      $('#modal-guardar').addEventListener('hidden.bs.modal', () => modalListo.show(), { once: true });
      modalGuardar.hide();
      refreshCounts();
    } catch (e) {
      err.textContent = e.message; err.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar huella';
    }
  });

  // Los botones del modal "listo" navegan con el hash; hay que cerrar el modal a mano.
  $$('#modal-listo a').forEach((a) => a.addEventListener('click', () => {
    modalListo.hide();
  }));

  /* -------------------------------------------------------------- galería */
  let galleryMode = 'cards', galleryData = [], galleryTipo = null, refreshTimer = null;

  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function openGallery(tipo) {
    galleryTipo = tipo; currentTipo = tipo;
    showView('gallery');
    $('#gallery-title').textContent = TIPOS[tipo].todas;
    document.title = TIPOS[tipo].todas + ' | Mural del aula';
    $('#gallery-summary').textContent = 'Cargando...';
    galleryData = [];
    await loadGallery(true);
    stopAutoRefresh();
    refreshTimer = setInterval(() => loadGallery(false), 20000);   // se actualiza sola durante la expo
  }
  function stopAutoRefresh() { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; } }

  async function loadGallery(force) {
    if (!galleryTipo) return;
    try {
      const { huellas } = await api('list', { params: { tipo: galleryTipo } });
      showAlert('');
      const same = huellas.map((h) => h.id).join() === galleryData.map((h) => h.id).join();
      if (force || !same) { galleryData = huellas; renderGallery(); }
    } catch (e) {
      showAlert(e.message);
      if (force) { $('#gallery-summary').textContent = ''; }
    }
  }

  function renderGallery() {
    const t = TIPOS[galleryTipo], list = galleryData;
    const cards = $('#gallery-cards'), mural = $('#gallery-mural'), empty = $('#gallery-empty');

    $('#gallery-summary').textContent = list.length
      ? list.length + (list.length === 1 ? ' huella' : ' huellas') + ' en las ' + t.plural + '. La más nueva aparece primero.'
      : '';

    empty.hidden = list.length > 0;
    $('#gallery-empty-text').textContent = 'Todavía nadie dejó su huella en ' + t.en + '. Podés ser la primera persona.';

    cards.hidden = !list.length || galleryMode !== 'cards';
    mural.hidden = !list.length || galleryMode !== 'mural';
    cards.textContent = '';

    list.forEach((h) => {
      const card = document.createElement('article');
      card.className = 'huella-card';

      const thumb = document.createElement('button');
      thumb.type = 'button'; thumb.className = 'thumb';
      thumb.setAttribute('aria-label', 'Ver más grande la huella de ' + h.nombre);
      const surf = document.createElement('div'); surf.className = 'surface surface--static';
      paintStatic(surf, h.tipo, h.imagen);
      thumb.appendChild(surf);
      thumb.addEventListener('click', () => openHuella(h));

      const meta = document.createElement('div'); meta.className = 'huella-meta';
      const name = document.createElement('div'); name.className = 'huella-name'; name.textContent = h.nombre;
      const date = document.createElement('div'); date.className = 'huella-date'; date.textContent = fmtDate(h.creado);
      meta.append(name, date);
      if (h.mensaje) {
        const msg = document.createElement('p'); msg.className = 'huella-msg'; msg.textContent = h.mensaje;
        meta.appendChild(msg);
      }
      card.append(thumb, meta);

      if (ADMIN) {
        const act = document.createElement('div'); act.className = 'huella-actions';
        const del = document.createElement('button'); del.type = 'button'; del.className = 'px-btn px-btn--danger';
        del.textContent = 'Borrar';
        del.addEventListener('click', () => borrarHuella(h));
        act.appendChild(del); card.appendChild(act);
      }
      cards.appendChild(card);
    });

    // "Todas juntas": las más viejas abajo y las nuevas encima, como marcas reales sobre la misma superficie
    paintStatic($('#mural-surface'), galleryTipo, list.slice().reverse().map((h) => h.imagen));
    const ul = $('#mural-list'); ul.textContent = '';
    list.forEach((h) => {
      const li = document.createElement('li');
      const s = document.createElement('strong'); s.textContent = h.nombre; li.appendChild(s);
      if (h.mensaje) { const p = document.createElement('p'); p.textContent = h.mensaje; li.appendChild(p); }
      ul.appendChild(li);
    });
  }

  $$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
    galleryMode = b.dataset.mode;
    $$('.seg-btn').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    renderGallery();
  }));
  $('#gallery-back').addEventListener('click', () => { location.hash = '#menu'; });
  $('#gallery-refresh').addEventListener('click', () => loadGallery(true));
  $('#gallery-add').addEventListener('click', () => { location.hash = '#editor/' + galleryTipo; });

  /* --------------------------------------------- ver una huella en grande */
  const modalHuella = bootstrap.Modal.getOrCreateInstance($('#modal-huella'));
  let huellaActual = null;

  function openHuella(h) {
    huellaActual = h;
    $('#huella-title').textContent = h.nombre;
    paintStatic($('#huella-surface'), h.tipo, h.imagen);
    const msg = $('#huella-msg');
    msg.textContent = h.mensaje || 'No dejó ningún mensaje.';
    msg.className = h.mensaje ? 'huella-msg' : 'huella-date';
    $('#huella-date').textContent = fmtDate(h.creado);
    $('#huella-delete').hidden = !ADMIN;
    modalHuella.show();
  }
  $('#huella-delete').addEventListener('click', async () => { if (huellaActual) { await borrarHuella(huellaActual); modalHuella.hide(); } });

  async function borrarHuella(h) {
    let clave = sessionStorage.getItem('mural_clave') || prompt('Clave de administrador:');
    if (!clave) return;
    if (!confirm('¿Borrar la huella de ' + h.nombre + '? No se puede deshacer.')) return;
    try {
      await api('delete', { body: { id: h.id, clave: clave } });
      sessionStorage.setItem('mural_clave', clave);
      window.mostrarAviso('Huella borrada.');
      await loadGallery(true); refreshCounts();
    } catch (e) {
      sessionStorage.removeItem('mural_clave');
      window.mostrarAviso(e.message);
    }
  }

  /* ------------------------------------------------------ protección al cerrar */
  window.addEventListener('beforeunload', (e) => {
    if (currentView === 'editor' && window.MuralEditor.isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ----------------------------------------------------------------- inicio */
  buildStage();
  window.addEventListener('hashchange', route);
  route();
})();
