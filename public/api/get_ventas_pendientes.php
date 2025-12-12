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
    
    // Obtener ventas pendientes con información de cliente (incluyendo GPS)
    $sql = "
        SELECT 
            v.*,
            c.nombre_completo as cliente_nombre,
            c.latitud,
            c.longitud,
            c.direccion,
            u.nombre as vendedor_nombre,
            u.username as vendedor_username
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        WHERE v.estado_venta = 'pendiente'
        ORDER BY v.fecha_registro DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $ventas = $stmt->fetchAll();
    
    // Si no hay vendedor_nombre, usar username
    foreach ($ventas as &$venta) {
        if (empty($venta['vendedor_nombre'])) {
            $venta['vendedor_nombre'] = $venta['vendedor_username'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'ventas' => $ventas,
        'total' => count($ventas)
    ]);
    
} catch (Exception $e) {
    error_log("Error al obtener ventas pendientes: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener ventas pendientes: ' . $e->getMessage()
    ]);
}
?>

