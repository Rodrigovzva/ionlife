<?php
require_once 'config.php';

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
$required = ['fecha_registro', 'cliente_id', 'vendedor_id', 'tipo_venta', 'estado_venta', 'subtotal', 'total', 'metodo_pago'];
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
        'message' => 'Debe agregar al menos un producto a la venta'
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
    // Generar número de venta único
    $stmt = $pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venta, 6) AS UNSIGNED)), 0) as max_num FROM ventas WHERE numero_venta LIKE 'VENT-%'");
    $result = $stmt->fetch();
    $nextNum = intval($result['max_num']) + 1;
    $numeroVenta = 'VENT-' . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
    
    // Convertir productos a JSON
    $productosJson = json_encode($input['productos'], JSON_UNESCAPED_UNICODE);
    
    // Insertar venta
    $stmt = $pdo->prepare("
        INSERT INTO ventas (
            numero_venta, fecha_registro, cliente_id, vendedor_id, tipo_venta, estado_venta,
            subtotal, descuento_porcentaje, descuento_monto, total,
            metodo_pago, monto_recibido, cambio, notas_venta, productos_json
        ) VALUES (
            :numero_venta, :fecha_registro, :cliente_id, :vendedor_id, :tipo_venta, :estado_venta,
            :subtotal, :descuento_porcentaje, :descuento_monto, :total,
            :metodo_pago, :monto_recibido, :cambio, :notas_venta, :productos_json
        )
    ");

    $stmt->execute([
        ':numero_venta' => $numeroVenta,
        ':fecha_registro' => $input['fecha_registro'],
        ':cliente_id' => intval($input['cliente_id']),
        ':vendedor_id' => intval($input['vendedor_id']),
        ':tipo_venta' => $input['tipo_venta'],
        ':estado_venta' => $input['estado_venta'],
        ':subtotal' => floatval($input['subtotal']),
        ':descuento_porcentaje' => isset($input['descuento_porcentaje']) ? floatval($input['descuento_porcentaje']) : 0,
        ':descuento_monto' => isset($input['descuento_monto']) ? floatval($input['descuento_monto']) : 0,
        ':total' => floatval($input['total']),
        ':metodo_pago' => $input['metodo_pago'],
        ':monto_recibido' => isset($input['monto_recibido']) ? floatval($input['monto_recibido']) : 0,
        ':cambio' => isset($input['cambio']) ? floatval($input['cambio']) : 0,
        ':notas_venta' => !empty($input['notas_venta']) ? trim($input['notas_venta']) : null,
        ':productos_json' => $productosJson
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Venta registrada correctamente',
        'id' => $pdo->lastInsertId(),
        'numero_venta' => $numeroVenta
    ]);

} catch (PDOException $e) {
    error_log("Error al guardar venta: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar la venta: ' . $e->getMessage()
    ]);
}
?>

