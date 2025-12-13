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
    
    // Obtener pedidos pendientes con información de cliente (incluyendo GPS)
    $sql = "
        SELECT 
            v.*,
            CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
            c.latitud,
            c.longitud,
            c.direccion,
            c.zona,
            u.nombre as vendedor_nombre,
            u.username as vendedor_username
        FROM pedidos v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        WHERE v.estado_pedido = 'pendiente'
        ORDER BY v.fecha_registro DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $pedidos = $stmt->fetchAll();
    
    // Si no hay vendedor_nombre, usar username
    foreach ($pedidos as &$pedido) {
        if (empty($pedido['vendedor_nombre'])) {
            $pedido['vendedor_nombre'] = $pedido['vendedor_username'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'ventas' => $pedidos, // Mantener 'ventas' para compatibilidad con frontend
        'pedidos' => $pedidos,
        'total' => count($pedidos)
    ]);
    
} catch (Exception $e) {
    error_log("Error al obtener pedidos pendientes: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener pedidos pendientes: ' . $e->getMessage()
    ]);
}
?>

