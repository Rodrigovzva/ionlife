<?php
// Asegurar que no haya output antes del JSON
ob_start();

require_once 'config.php';

// Limpiar cualquier output previo
ob_clean();

// Establecer headers JSON
header('Content-Type: application/json; charset=utf-8');

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Verificar sesión
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Obtener datos del cuerpo de la petición
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

// Validar campos requeridos
$required = ['fecha_registro', 'cliente_id', 'vendedor_id', 'tipo_pedido', 'estado_pedido', 'subtotal', 'total', 'metodo_pago'];
foreach ($required as $field) {
    if (!isset($input[$field]) || $input[$field] === '') {
        echo json_encode([
            'success' => false,
            'message' => "El campo " . str_replace('_', ' ', $field) . " es requerido"
        ]);
        exit();
    }
}

// Validar que haya productos
if (empty($input['productos']) || !is_array($input['productos']) || count($input['productos']) === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Debe agregar al menos un producto al pedido'
    ]);
    exit();
}

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
    // Generar número de pedido único (formato: 001, 002, 003, etc.)
    $stmt = $pdo->query("SELECT COALESCE(MAX(CAST(numero_pedido AS UNSIGNED)), 0) as max_num FROM pedidos");
    $result = $stmt->fetch();
    $nextNum = intval($result['max_num']) + 1;
    $numeroPedido = str_pad($nextNum, 3, '0', STR_PAD_LEFT); // Formato: 001, 002, 003, etc.
    
    // Convertir productos a JSON
    $productosJson = json_encode($input['productos'], JSON_UNESCAPED_UNICODE);
    
    // Insertar pedido (con fecha_programada si existe)
    $campos = "numero_pedido, fecha_registro, cliente_id, vendedor_id, tipo_pedido, estado_pedido,
            subtotal, descuento_porcentaje, descuento_monto, total,
            metodo_pago, monto_recibido, cambio, notas_pedido, productos_json";
    $valores = ":numero_pedido, :fecha_registro, :cliente_id, :vendedor_id, :tipo_pedido, :estado_pedido,
            :subtotal, :descuento_porcentaje, :descuento_monto, :total,
            :metodo_pago, :monto_recibido, :cambio, :notas_pedido, :productos_json";
    
    $params = [
        ':numero_pedido' => $numeroPedido,
        ':fecha_registro' => $input['fecha_registro'],
        ':cliente_id' => intval($input['cliente_id']),
        ':vendedor_id' => intval($input['vendedor_id']),
        ':tipo_pedido' => $input['tipo_pedido'],
        ':estado_pedido' => $input['estado_pedido'],
        ':subtotal' => floatval($input['subtotal']),
        ':descuento_porcentaje' => isset($input['descuento_porcentaje']) ? floatval($input['descuento_porcentaje']) : 0,
        ':descuento_monto' => isset($input['descuento_monto']) ? floatval($input['descuento_monto']) : 0,
        ':total' => floatval($input['total']),
        ':metodo_pago' => $input['metodo_pago'],
        ':monto_recibido' => isset($input['monto_recibido']) ? floatval($input['monto_recibido']) : 0,
        ':cambio' => isset($input['cambio']) ? floatval($input['cambio']) : 0,
        ':notas_pedido' => !empty($input['notas_pedido']) ? trim($input['notas_pedido']) : null,
        ':productos_json' => $productosJson
    ];
    
    // Agregar fecha_programada si existe y no está vacía
    if (!empty($input['fecha_programada'])) {
        $campos .= ", fecha_programada";
        $valores .= ", :fecha_programada";
        $params[':fecha_programada'] = $input['fecha_programada'];
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO pedidos ($campos) VALUES ($valores)
    ");

    $stmt->execute($params);

    // Limpiar cualquier output antes de enviar JSON
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Pedido registrado correctamente',
        'id' => $pdo->lastInsertId(),
        'numero_venta' => $numeroPedido,
        'numero_pedido' => $numeroPedido
    ]);
    exit();

} catch (PDOException $e) {
    error_log("Error al guardar pedido: " . $e->getMessage());
    
    // Limpiar cualquier output antes de enviar JSON
    ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el pedido: ' . $e->getMessage()
    ]);
    exit();
}
?>

