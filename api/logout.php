<?php
require_once 'config.php';

// Cerrar sesión
logout();

echo json_encode([
    'success' => true,
    'message' => 'Sesión cerrada correctamente'
]);
?>

