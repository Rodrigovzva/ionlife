<?php
require_once 'config.php';

// Verificar sesión
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Obtener filtros
$filtros = [];
$where = [];

// Filtro de fecha
if (!empty($_GET['fecha_desde'])) {
    $where[] = "DATE(v.fecha_registro) >= :fecha_desde";
    $filtros[':fecha_desde'] = $_GET['fecha_desde'];
}

if (!empty($_GET['fecha_hasta'])) {
    $where[] = "DATE(v.fecha_registro) <= :fecha_hasta";
    $filtros[':fecha_hasta'] = $_GET['fecha_hasta'];
}

// Filtro de cliente
if (!empty($_GET['cliente_id'])) {
    $where[] = "v.cliente_id = :cliente_id";
    $filtros[':cliente_id'] = intval($_GET['cliente_id']);
}

// Filtro de vendedor
if (!empty($_GET['vendedor_id'])) {
    $where[] = "v.vendedor_id = :vendedor_id";
    $filtros[':vendedor_id'] = intval($_GET['vendedor_id']);
}

// Filtro de estado
if (!empty($_GET['estado'])) {
    $where[] = "v.estado_pedido = :estado";
    $filtros[':estado'] = $_GET['estado'];
}

// Filtro de tipo
if (!empty($_GET['tipo_pedido'])) {
    $where[] = "v.tipo_pedido = :tipo_pedido";
    $filtros[':tipo_pedido'] = $_GET['tipo_pedido'];
}

// Filtro de número de pedido
if (!empty($_GET['numero_pedido'])) {
    $where[] = "v.numero_pedido LIKE :numero_pedido";
    $filtros[':numero_pedido'] = '%' . $_GET['numero_pedido'] . '%';
}

// Construir WHERE clause
$whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Consulta SQL
$sql = "
    SELECT 
        v.*,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        u.nombre as vendedor_nombre,
        u.username as vendedor_username
    FROM pedidos v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN usuarios u ON v.vendedor_id = u.id
    $whereClause
    ORDER BY v.fecha_registro DESC
";

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($filtros);
    
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
    error_log("Error al obtener pedidos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener pedidos: ' . $e->getMessage()
    ]);
}
?>

