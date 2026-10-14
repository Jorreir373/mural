# Mural del aula — Secundaria Técnica 1

Página web para la expo: cada persona deja su huella (dibujo, firma o nombre, más chicle, yerba, migas…)
sobre una **mesa**, una **silla** o una **pared** del aula. Después se pueden ver todas las huellas,
quién las dejó y el mensaje que escribió.

## Cómo probarlo (3 formas)

**1) Lo más simple: PHP incluido**  
Instalá PHP 8 (o 7.4+) y desde una terminal, dentro de esta carpeta:

    php -S 0.0.0.0:8000

Abrí `http://localhost:8000` en el navegador. Desde otras compus o celulares de la misma red WiFi:
`http://IP-DE-TU-COMPU:8000` (por ejemplo `http://192.168.0.15:8000`).

**2) XAMPP / Laragon / WAMP**  
Copiá la carpeta `mural` dentro de `htdocs` (XAMPP) o `www` (Laragon/WAMP), encendé Apache y abrí
`http://localhost/mural/`.

**3) Hosting con PHP**  
Subí todo por FTP. Las carpetas `data/` y `uploads/` tienen que tener permiso de escritura (755 o 775).

> No abras `index.php` con doble clic: PHP necesita un servidor para guardar las huellas.

## Cómo está armado

    index.php            Pantalla única: menú del aula, editor y galerías
    api.php              Guarda y lista las huellas (AJAX, responde JSON)
    config.php           Clave de administrador, límites de texto y tamaño
    assets/css/style.css Diseño
    assets/js/app.js     Menú del aula, navegación, galerías, guardado
    assets/js/editor.js  Herramientas de dibujo, texto y extras (chicle, yerba…)
    assets/img/          Tus imágenes (aula, mesa, silla, pared y los png del menú)
    assets/vendor/       Bootstrap 5 y tipografías (todo local, funciona sin internet)
    data/huellas.json    Quién dejó cada huella, mensaje y fecha
    uploads/             Un PNG transparente por cada huella

## Cambiar las imágenes

Reemplazá los archivos de `assets/img/` **manteniendo el mismo nombre y proporción (1024×572)**:
`aula.png`, `mesa.jpg`, `silla.jpg`, `pared.jpg`. Los íconos del menú son `mesa_menu.png`,
`silla_menu.png` y `pared_menu.png`.
Si cambiás la zona donde se puede dibujar, ajustá `BOUNDS` al principio de `assets/js/editor.js`.
Si cambiás la posición de las mesas en el aula, ajustá las constantes de `assets/js/app.js`
(`FLOOR`, `COLS`, `ROWS`).

## Moderar (borrar huellas)

1. Cambiá `admin_password` en `config.php`.
2. Entrá a `http://localhost:8000/?admin=1`. En las galerías aparece el botón **Borrar**.

## Antes y después de la expo

- **Empezar de cero:** borrá los `.png` de `uploads/` y dejá `data/huellas.json` con solo `[]`.
- **Guardar todo como recuerdo:** copiá las carpetas `data/` y `uploads/`.
- **Pantalla completa:** F11 en el navegador. Funciona con mouse, pantalla táctil y lápiz.
