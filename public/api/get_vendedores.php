<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ]);
    exit();
}

try {
    // Obtener usuarios que pueden ser vendedores
    // Por ahora, todos los usuarios activos (en producción, crear tabla de vendedores)
    $stmt = $pdo->query("
        SELECT id, username, nombre, email 
        FROM usuarios 
        WHERE activo = 1 
        ORDER BY nombre, username
    ");
    
    $vendedores = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'vendedores' => $vendedores
    ]);

} catch (PDOException $e) {
    error_log("Error al obtener vendedores: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener vendedores',
        'vendedores' => []
    ]);
}
?>

