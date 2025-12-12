<?php
require_once 'config.php';

// Verificar si el usuario está logueado
if (isLoggedIn()) {
    echo json_encode([
        'success' => true,
        'logged_in' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'nombre' => $_SESSION['nombre'] ?? $_SESSION['username']
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'logged_in' => false,
        'message' => 'No hay sesión activa'
    ]);
}
?>

