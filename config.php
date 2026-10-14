<?php
/**
 * Configuración del Mural.
 * CAMBIÁ la clave de administrador antes de la expo.
 */
return [
    // Clave para borrar huellas (por si alguien dibuja algo que no corresponde).
    // Se usa entrando a la página con  ?admin=1
    'admin_password' => 'expo2026',

    // Superficies permitidas
    'tipos' => ['mesa', 'silla', 'pared'],

    // Medidas del dibujo (deben coincidir con editor.js)
    'ancho_dibujo' => 512,
    'alto_dibujo'  => 286,

    // Límites de texto
    'max_nombre'  => 40,
    'max_mensaje' => 200,

    // Tamaño máximo del PNG en bytes
    'max_png_bytes' => 1500000,

    // Segundos mínimos entre dos guardados desde la misma IP (anti-spam)
    'espera_segundos' => 3,
];
