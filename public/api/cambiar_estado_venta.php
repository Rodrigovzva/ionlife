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

// Validar campos requeridos (aceptar tanto venta_id como pedido_id para compatibilidad)
$pedidoId = $input['pedido_id'] ?? $input['venta_id'] ?? null;
if (empty($pedidoId) || empty($input['nuevo_estado'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Faltan datos requeridos'
    ]);
    exit();
}

// Validar que el estado sea válido
$estadosValidos = ['pendiente', 'completada', 'cancelada'];
if (!in_array($input['nuevo_estado'], $estadosValidos)) {
    echo json_encode([
        'success' => false,
        'message' => 'Estado no válido'
    ]);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Actualizar estado del pedido
    $stmt = $pdo->prepare("
        UPDATE pedidos 
        SET estado_pedido = :nuevo_estado,
            updated_at = NOW()
        WHERE id = :pedido_id
    ");
    
    $stmt->execute([
        ':nuevo_estado' => $input['nuevo_estado'],
        ':pedido_id' => intval($input['venta_id'] ?? $input['pedido_id'] ?? 0)
    ]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Estado del pedido actualizado correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró el pedido o no hubo cambios'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error al cambiar estado de pedido: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar el estado: ' . $e->getMessage()
    ]);
}
?>

