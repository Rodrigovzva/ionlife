<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos',
        'productos' => []
    ]);
    exit();
}

try {
    // Obtener productos activos
    $stmt = $pdo->query("
        SELECT id, codigo_producto, nombre_producto, tamano, precio_compra, precio_venta, precio_mayorista, estado
        FROM productos 
        WHERE estado = 'activo' 
        ORDER BY nombre_producto
    ");
    
    $productos = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'productos' => $productos
    ]);

} catch (PDOException $e) {
    error_log("Error al obtener productos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener productos',
        'productos' => []
    ]);
}
?>

