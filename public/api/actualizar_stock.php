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
if (empty($input['producto_id']) || !isset($input['stock_actual'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Faltan datos requeridos'
    ]);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Actualizar stock del producto
    $sql = "UPDATE productos SET 
            stock_actual = :stock_actual,
            stock_minimo = :stock_minimo,
            ubicacion_almacen = :ubicacion_almacen,
            updated_at = NOW()
            WHERE id = :producto_id";
    
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([
        ':stock_actual' => intval($input['stock_actual']),
        ':stock_minimo' => isset($input['stock_minimo']) ? intval($input['stock_minimo']) : 0,
        ':ubicacion_almacen' => !empty($input['ubicacion_almacen']) ? trim($input['ubicacion_almacen']) : null,
        ':producto_id' => intval($input['producto_id'])
    ]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Stock actualizado correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró el producto o no hubo cambios'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error al actualizar stock: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar stock: ' . $e->getMessage()
    ]);
}
?>

