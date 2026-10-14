<?php
// Versión para que el navegador recargue CSS/JS cuando los modificás.
function v(string $f): int { return (int)@filemtime(__DIR__ . '/' . $f) ?: 1; }
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mural del aula | Secundaria Técnica 1</title>
  <meta name="description" content="Dejá tu huella en una mesa, una silla o una pared del aula.">
  <link rel="preload" href="assets/vendor/fonts/pixelify-sans-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/vendor/bootstrap.min.css">
  <link rel="stylesheet" href="assets/css/style.css?v=<?= v('assets/css/style.css') ?>">
</head>
<body>

<a class="skip-link" href="#contenido">Ir al contenido</a>

<header class="topbar">
  <a class="brand" href="#menu" aria-label="Volver al menú principal">
    <img src="assets/img/silla_menu.png" alt="" width="34" height="23">
    <span class="brand-text">
      <strong>Mural del aula</strong>
      <small>Secundaria Técnica 1</small>
    </span>
  </a>
  <nav class="topnav" aria-label="Ver las huellas">
    <a href="#galeria/mesa">Mesas <span class="count" data-count="mesa">0</span></a>
    <a href="#galeria/silla">Sillas <span class="count" data-count="silla">0</span></a>
    <a href="#galeria/pared">Paredes <span class="count" data-count="pared">0</span></a>
  </nav>
</header>

<div id="app-alert" class="app-alert" role="alert" hidden></div>

<main id="contenido">

  <!-- ============================ MENÚ PRINCIPAL ============================ -->
  <section id="view-menu" class="view menu-layout" aria-labelledby="menu-title">
    <div class="menu-side">
      <h1 id="menu-title">Dejá tu huella en el aula</h1>
      <p class="lead-text">
        Elegí una mesa, una silla o una pared. Dibujá, firmá o escribí tu nombre,
        y sumá lo que nunca falta en un aula: chicle, yerba, migas de pan.
      </p>

      <h2 class="side-title">Lo que ya dejaron</h2>
      <div class="gallery-links">
        <a class="gallery-link" href="#galeria/mesa">
          <img src="assets/img/mesa_menu.png" alt="" width="66" height="35">
          <span><strong>Todas las mesas</strong><small><span data-count="mesa">0</span> huellas</small></span>
        </a>
        <a class="gallery-link" href="#galeria/silla">
          <img src="assets/img/silla_menu.png" alt="" width="66" height="45">
          <span><strong>Todas las sillas</strong><small><span data-count="silla">0</span> huellas</small></span>
        </a>
        <a class="gallery-link" href="#galeria/pared">
          <span class="wall-icon" aria-hidden="true"></span>
          <span><strong>Todas las paredes</strong><small><span data-count="pared">0</span> huellas</small></span>
        </a>
      </div>
    </div>

    <div class="menu-stage-col">
      <div class="stage" id="stage" role="group" aria-label="Aula vista desde arriba: elegí una mesa, una silla o una pared">
        <img class="stage-bg" src="assets/img/aula.png" alt="" draggable="false">
        <!-- Mesas, sillas y paredes se generan con JavaScript (assets/js/app.js) -->
      </div>
      <p class="stage-hint" id="stage-hint" aria-live="polite">Tocá una mesa, una silla o una pared para empezar.</p>
    </div>
  </section>

  <!-- ================================ EDITOR ================================ -->
  <section id="view-editor" class="view" aria-labelledby="editor-title" hidden>
    <div class="view-head">
      <button type="button" class="px-btn px-btn--ghost" id="btn-back">Volver al menú</button>
      <h2 id="editor-title" tabindex="-1">Tu huella en la mesa</h2>
      <div class="head-actions">
        <button type="button" class="px-btn" id="btn-undo">Deshacer</button>
        <button type="button" class="px-btn" id="btn-clear">Borrar todo</button>
        <button type="button" class="px-btn px-btn--primary" id="btn-finish">Terminar</button>
      </div>
    </div>

    <div class="editor-body">
      <aside class="tools" id="tools" aria-label="Herramientas de dibujo">
        <fieldset>
          <legend>Herramienta</legend>
          <div class="tool-grid">
            <button type="button" class="tool" data-tool="pen" aria-pressed="true">Birome</button>
            <button type="button" class="tool" data-tool="marker" aria-pressed="false">Marcador</button>
            <button type="button" class="tool" data-tool="corrector" aria-pressed="false">Corrector</button>
            <button type="button" class="tool" data-tool="eraser" aria-pressed="false">Borrador</button>
            <button type="button" class="tool" data-tool="text" aria-pressed="false">Texto</button>
          </div>
        </fieldset>

        <fieldset id="fs-text" hidden>
          <legend>Tu texto</legend>
          <input type="text" id="text-input" class="form-control" maxlength="30" placeholder="Tu nombre o una frase" autocomplete="off">
          <select id="text-font" class="form-select" aria-label="Tipo de letra">
            <option value="pixel">Letra pixel</option>
            <option value="imprenta">Letra de imprenta</option>
            <option value="manuscrita">Letra manuscrita</option>
          </select>
        </fieldset>

        <fieldset id="fs-color">
          <legend>Color</legend>
          <div class="swatches" id="swatches" role="group" aria-label="Colores"></div>
          <label class="custom-color">
            <input type="color" id="color-custom" value="#1d3fc0" aria-label="Elegir otro color">
            <span>Otro color</span>
          </label>
        </fieldset>

        <fieldset>
          <legend id="size-label">Grosor</legend>
          <input type="range" id="size" min="1" max="12" value="3" aria-labelledby="size-label">
        </fieldset>

        <fieldset>
          <legend>Extras</legend>
          <div class="tool-grid tool-grid--extras">
            <button type="button" class="tool tool--stamp" data-tool="chicle" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Chicle</span></button>
            <button type="button" class="tool tool--stamp" data-tool="yerba" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Yerba</span></button>
            <button type="button" class="tool tool--stamp" data-tool="pan" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Pan</span></button>
            <button type="button" class="tool tool--stamp" data-tool="galleta" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Galletita</span></button>
            <button type="button" class="tool tool--stamp" data-tool="migas" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Migas</span></button>
            <button type="button" class="tool tool--stamp" data-tool="mancha" aria-pressed="false"><canvas width="24" height="24" aria-hidden="true"></canvas><span>Mate</span></button>
          </div>
        </fieldset>
      </aside>

      <div class="canvas-col">
        <div class="surface surface--editor" id="surface" data-tipo="mesa">
          <canvas id="draw" width="512" height="286" aria-label="Superficie para dibujar"></canvas>
          <canvas id="ghost" width="512" height="286" aria-hidden="true"></canvas>
        </div>
        <p class="canvas-help" id="canvas-help" aria-live="polite">Arrastrá para dibujar o firmar.</p>
      </div>
    </div>
  </section>

  <!-- ================================ GALERÍA ================================ -->
  <section id="view-gallery" class="view" aria-labelledby="gallery-title" hidden>
    <div class="view-head">
      <button type="button" class="px-btn px-btn--ghost" id="gallery-back">Volver al menú</button>
      <h2 id="gallery-title" tabindex="-1">Todas las mesas</h2>
      <div class="head-actions">
        <div class="seg" role="group" aria-label="Forma de ver las huellas">
          <button type="button" class="seg-btn" data-mode="cards" aria-pressed="true">Una por una</button>
          <button type="button" class="seg-btn" data-mode="mural" aria-pressed="false">Todas juntas</button>
        </div>
        <button type="button" class="px-btn" id="gallery-refresh">Actualizar</button>
        <button type="button" class="px-btn px-btn--primary" id="gallery-add">Dejar mi huella</button>
      </div>
    </div>

    <p class="gallery-summary" id="gallery-summary" aria-live="polite"></p>

    <div id="gallery-empty" class="empty" hidden>
      <p id="gallery-empty-text">Todavía no hay huellas acá.</p>
    </div>

    <div id="gallery-mural" hidden>
      <div class="surface surface--static" id="mural-surface" data-tipo="mesa"></div>
      <ul class="firmas" id="mural-list"></ul>
    </div>

    <div id="gallery-cards" class="cards"></div>
  </section>
</main>

<div id="toast" class="toast-px" role="status" aria-live="polite" hidden></div>

<!-- ===================== Modal: nombre y mensaje ===================== -->
<div class="modal fade" id="modal-guardar" tabindex="-1" aria-labelledby="modal-guardar-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content" id="form-guardar" novalidate>
      <div class="modal-header">
        <h2 class="modal-title" id="modal-guardar-title">Tu huella está lista</h2>
      </div>
      <div class="modal-body">
        <div class="surface surface--static preview" id="save-preview" data-tipo="mesa"></div>

        <label for="in-nombre" class="form-label">¿Cómo te llamás?</label>
        <input type="text" class="form-control" id="in-nombre" maxlength="40" required autocomplete="off">

        <label for="in-mensaje" class="form-label">Dejá un mensaje junto a tu huella (opcional)</label>
        <textarea class="form-control" id="in-mensaje" rows="3" maxlength="200"></textarea>
        <div class="char-count" id="msg-count" aria-hidden="true">0 / 200</div>

        <div class="form-error" id="form-error" role="alert" hidden></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="px-btn px-btn--ghost" data-bs-dismiss="modal">Seguir dibujando</button>
        <button type="submit" class="px-btn px-btn--primary" id="btn-save">Guardar huella</button>
      </div>
    </form>
  </div>
</div>

<!-- ===================== Modal: listo ===================== -->
<div class="modal fade" id="modal-listo" tabindex="-1" aria-labelledby="modal-listo-title" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-listo-title">¡Listo!</h2>
      </div>
      <div class="modal-body">
        <p id="listo-text">Tu huella ya quedó en el aula.</p>
      </div>
      <div class="modal-footer">
        <a class="px-btn px-btn--ghost" id="listo-ver" href="#galeria/mesa">Ver todas las mesas</a>
        <a class="px-btn px-btn--primary" href="#menu" id="listo-menu">Volver al menú</a>
      </div>
    </div>
  </div>
</div>

<!-- ===================== Modal: ver una huella ===================== -->
<div class="modal fade" id="modal-huella" tabindex="-1" aria-labelledby="huella-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="huella-title">Huella</h2>
        <button type="button" class="px-btn px-btn--ghost" data-bs-dismiss="modal">Cerrar</button>
      </div>
      <div class="modal-body">
        <div class="surface surface--static" id="huella-surface" data-tipo="mesa"></div>
        <p class="huella-msg" id="huella-msg"></p>
        <p class="huella-date" id="huella-date"></p>
        <button type="button" class="px-btn px-btn--danger" id="huella-delete" hidden>Borrar esta huella</button>
      </div>
    </div>
  </div>
</div>

<script src="assets/vendor/bootstrap.bundle.min.js"></script>
<script src="assets/js/editor.js?v=<?= v('assets/js/editor.js') ?>"></script>
<script src="assets/js/app.js?v=<?= v('assets/js/app.js') ?>"></script>
</body>
</html>
