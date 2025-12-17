<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit();
}

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit();
}

// Obtener datos JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id']) || !isset($input['estado'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Faltan datos requeridos: id y estado'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$productoId = intval($input['id']);
$estado = trim($input['estado']);

// Validar estado
if (!in_array($estado, ['activo', 'inactivo', 'descontinuado'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Estado inválido'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    // Verificar que el producto existe
    $stmt = $pdo->prepare("SELECT id FROM productos WHERE id = ?");
    $stmt->execute([$productoId]);
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Producto no encontrado'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Actualizar estado
    $stmt = $pdo->prepare("UPDATE productos SET estado = ? WHERE id = ?");
    $stmt->execute([$estado, $productoId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Estado actualizado correctamente'
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Error al actualizar estado del producto: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar el estado: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

