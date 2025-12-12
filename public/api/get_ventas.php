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
    $where[] = "v.estado_venta = :estado";
    $filtros[':estado'] = $_GET['estado'];
}

// Filtro de tipo
if (!empty($_GET['tipo_venta'])) {
    $where[] = "v.tipo_venta = :tipo_venta";
    $filtros[':tipo_venta'] = $_GET['tipo_venta'];
}

// Filtro de número de venta
if (!empty($_GET['numero_venta'])) {
    $where[] = "v.numero_venta LIKE :numero_venta";
    $filtros[':numero_venta'] = '%' . $_GET['numero_venta'] . '%';
}

// Construir WHERE clause
$whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Consulta SQL
$sql = "
    SELECT 
        v.*,
        c.nombre_completo as cliente_nombre,
        u.nombre as vendedor_nombre,
        u.username as vendedor_username
    FROM ventas v
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
    error_log("Error al obtener ventas: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener ventas: ' . $e->getMessage()
    ]);
}
?>

