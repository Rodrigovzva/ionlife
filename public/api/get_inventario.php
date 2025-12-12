<?php
require_once 'config.php';

// Verificar sesión
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Obtener todos los productos con información de inventario
    $sql = "
        SELECT 
            id,
            codigo_producto,
            nombre_producto,
            tamano,
            precio_compra,
            precio_venta,
            precio_mayorista,
            proveedor,
            fecha_vencimiento,
            imagen_producto,
            estado,
            COALESCE(stock_actual, 0) as stock_actual,
            COALESCE(stock_minimo, 0) as stock_minimo,
            ubicacion_almacen,
            notas,
            created_at,
            updated_at
        FROM productos
        ORDER BY nombre_producto ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $productos = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'productos' => $productos,
        'total' => count($productos)
    ]);
    
} catch (Exception $e) {
    error_log("Error al obtener inventario: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener inventario: ' . $e->getMessage()
    ]);
}
?>

