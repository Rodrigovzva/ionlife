<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos',
        'clientes' => []
    ]);
    exit();
}

try {
    // Obtener clientes activos
    $stmt = $pdo->query("
        SELECT id, nombre_completo, numero_ci, telefono_principal, correo, tipo_cliente
        FROM clientes 
        WHERE estado = 'activo' 
        ORDER BY nombre_completo
    ");
    
    $clientes = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'clientes' => $clientes
    ]);

} catch (PDOException $e) {
    error_log("Error al obtener clientes: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener clientes',
        'clientes' => []
    ]);
}
?>

