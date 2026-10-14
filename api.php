<?php
/**
 * API del Mural  -  responde siempre JSON.
 *
 *  GET  api.php?action=list&tipo=mesa|silla|pared   -> lista de huellas (más nuevas primero)
 *  GET  api.php?action=counts                       -> cantidad de huellas por superficie
 *  POST api.php?action=save    (JSON)               -> guarda una huella nueva
 *  POST api.php?action=delete  (JSON)               -> borra una huella (requiere clave)
 */
declare(strict_types=1);
if (!function_exists("mb_substr")) { function mb_substr($s, $a, $l = null) { return substr($s, $a, $l); } }
date_default_timezone_set('America/Argentina/Buenos_Aires');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg        = require __DIR__ . '/config.php';
$dataDir    = __DIR__ . '/data';
$uploadDir  = __DIR__ . '/uploads';
$dataFile   = $dataDir . '/huellas.json';

foreach ([$dataDir, $uploadDir] as $d) {
    if (!is_dir($d)) { @mkdir($d, 0775, true); }
}

function responder(array $payload, int $code = 200) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fallo(string $mensaje, int $code = 400) {
    responder(['ok' => false, 'error' => $mensaje], $code);
}

/** Lee el archivo JSON (con el archivo ya abierto y bloqueado). */
function leer_todo($fp): array {
    rewind($fp);
    $txt = stream_get_contents($fp);
    $arr = json_decode($txt ?: '[]', true);
    return is_array($arr) ? $arr : [];
}

/** Abre huellas.json con bloqueo para que dos personas no se pisen al guardar. */
function abrir_datos(string $file, bool $escritura) {
    $fp = @fopen($file, 'c+');
    if (!$fp) { fallo('No se pudo abrir el archivo de datos. Revisá los permisos de la carpeta data/.', 500); }
    flock($fp, $escritura ? LOCK_EX : LOCK_SH);
    return $fp;
}

function limpiar_texto(string $t, int $max): string {
    $t = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $t) ?? '';
    $t = trim(preg_replace('/[ \t]+/u', ' ', $t) ?? '');
    return mb_substr($t, 0, $max);
}

function para_cliente(array $h): array {
    return [
        'id'      => $h['id'],
        'tipo'    => $h['tipo'],
        'nombre'  => $h['nombre'],
        'mensaje' => $h['mensaje'],
        'creado'  => $h['creado'],
        'imagen'  => 'uploads/' . $h['id'] . '.png',
    ];
}

$action = $_GET['action'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

/* ----------------------------------------------------------- LISTAR */
if ($action === 'list' && $metodo === 'GET') {
    $tipo = $_GET['tipo'] ?? '';
    if (!in_array($tipo, $cfg['tipos'], true)) { fallo('Superficie inválida.'); }
    $fp = abrir_datos($dataFile, false);
    $todas = leer_todo($fp);
    flock($fp, LOCK_UN); fclose($fp);
    $lista = [];
    foreach ($todas as $h) {
        if (($h['tipo'] ?? '') === $tipo) { $lista[] = para_cliente($h); }
    }
    $lista = array_reverse($lista); // más nuevas primero
    responder(['ok' => true, 'huellas' => $lista]);
}

/* ---------------------------------------------------------- CONTEOS */
if ($action === 'counts' && $metodo === 'GET') {
    $fp = abrir_datos($dataFile, false);
    $todas = leer_todo($fp);
    flock($fp, LOCK_UN); fclose($fp);
    $cuenta = array_fill_keys($cfg['tipos'], 0);
    foreach ($todas as $h) {
        if (isset($cuenta[$h['tipo'] ?? ''])) { $cuenta[$h['tipo']]++; }
    }
    responder(['ok' => true, 'counts' => $cuenta]);
}

/* Las acciones siguientes reciben JSON por POST */
if ($metodo !== 'POST') { fallo('Acción no válida.', 404); }
$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) { fallo('Datos inválidos.'); }

/* ----------------------------------------------------------- GUARDAR */
if ($action === 'save') {
    $tipo    = (string)($in['tipo'] ?? '');
    $nombre  = limpiar_texto((string)($in['nombre'] ?? ''), $cfg['max_nombre']);
    $mensaje = limpiar_texto((string)($in['mensaje'] ?? ''), $cfg['max_mensaje']);
    $imagen  = (string)($in['imagen'] ?? '');

    if (!in_array($tipo, $cfg['tipos'], true)) { fallo('Superficie inválida.'); }
    if ($nombre === '') { fallo('Falta tu nombre.'); }

    // Imagen: tiene que ser un PNG en base64 del tamaño esperado
    if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $imagen, $m)) { fallo('La imagen no es válida.'); }
    $bin = base64_decode($m[1], true);
    if ($bin === false || strlen($bin) > $cfg['max_png_bytes']) { fallo('La imagen es demasiado grande.'); }
    if (substr($bin, 0, 8) !== "\x89PNG\r\n\x1a\n") { fallo('La imagen no es un PNG.'); }
    $info = @getimagesizefromstring($bin);
    if (!$info || $info[0] !== $cfg['ancho_dibujo'] || $info[1] !== $cfg['alto_dibujo'] || $info[2] !== IMAGETYPE_PNG) {
        fallo('La imagen tiene un tamaño inesperado.');
    }

    // Anti-spam sencillo por IP
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
    $marca = sys_get_temp_dir() . '/mural_' . md5($ip);
    if (is_file($marca) && (time() - (int)@filemtime($marca)) < $cfg['espera_segundos']) {
        fallo('Esperá un momento antes de guardar otra huella.', 429);
    }
    @touch($marca);

    $id = date('Ymd_His') . '_' . bin2hex(random_bytes(4));
    if (file_put_contents($uploadDir . '/' . $id . '.png', $bin, LOCK_EX) === false) {
        fallo('No se pudo guardar la imagen. Revisá los permisos de la carpeta uploads/.', 500);
    }

    $fp = abrir_datos($dataFile, true);
    $todas = leer_todo($fp);
    $nueva = [
        'id'      => $id,
        'tipo'    => $tipo,
        'nombre'  => $nombre,
        'mensaje' => $mensaje,
        'creado'  => date('c'),
    ];
    $todas[] = $nueva;
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($todas, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);

    responder(['ok' => true, 'huella' => para_cliente($nueva)]);
}

/* ------------------------------------------------------------ BORRAR */
if ($action === 'delete') {
    $clave = (string)($in['clave'] ?? '');
    $id    = (string)($in['id'] ?? '');
    if (!hash_equals((string)$cfg['admin_password'], $clave)) { fallo('Clave incorrecta.', 403); }
    if (!preg_match('/^[0-9]{8}_[0-9]{6}_[0-9a-f]{8}$/', $id)) { fallo('Identificador inválido.'); }

    $fp = abrir_datos($dataFile, true);
    $todas = leer_todo($fp);
    $quedan = array_values(array_filter($todas, function ($h) use ($id) { return ($h['id'] ?? '') !== $id; }));
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($quedan, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    @unlink($uploadDir . '/' . $id . '.png');

    responder(['ok' => true]);
}

fallo('Acción no válida.', 404);
