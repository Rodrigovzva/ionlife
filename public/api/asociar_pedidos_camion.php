<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit();
}

if (!isLoggedIn()) {
    ob_clean();
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'No autorizado'], JSON_UNESCAPED_UNICODE);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

// Validar campos requeridos
if (empty($input['camion_id']) || empty($input['placa_camion']) || empty($input['pedidos']) || !is_array($input['pedidos'])) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Camión y pedidos son requeridos'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Verificar si existe la columna camion_id en la tabla pedidos, si no, crearla
    $columns = $pdo->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('camion_id', $columns)) {
        try {
            $pdo->exec("ALTER TABLE pedidos ADD COLUMN camion_id INT NULL AFTER vendedor_id");
        } catch (PDOException $e) {
            // Ignorar si la columna ya existe
            if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                throw $e;
            }
        }
        try {
            $pdo->exec("CREATE INDEX idx_camion ON pedidos(camion_id)");
        } catch (PDOException $e) {
            // Ignorar si el índice ya existe
            if (strpos($e->getMessage(), 'Duplicate key name') === false) {
                throw $e;
            }
        }
    }
    
    if (!in_array('placa_camion', $columns)) {
        try {
            $pdo->exec("ALTER TABLE pedidos ADD COLUMN placa_camion VARCHAR(20) NULL AFTER camion_id");
        } catch (PDOException $e) {
            // Ignorar si la columna ya existe
            if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                throw $e;
            }
        }
        try {
            $pdo->exec("CREATE INDEX idx_placa_camion ON pedidos(placa_camion)");
        } catch (PDOException $e) {
            // Ignorar si el índice ya existe
            if (strpos($e->getMessage(), 'Duplicate key name') === false) {
                throw $e;
            }
        }
    }
    
    $camionId = intval($input['camion_id']);
    $placaCamion = trim($input['placa_camion']);
    $pedidosIds = array_map('intval', $input['pedidos']);
    
    // Verificar que todos los pedidos existen y están en estado pendiente
    $placeholders = implode(',', array_fill(0, count($pedidosIds), '?'));
    $sql = "SELECT id FROM pedidos WHERE id IN ($placeholders) AND estado_pedido = 'pendiente'";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($pedidosIds);
    $pedidosValidos = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($pedidosValidos) !== count($pedidosIds)) {
        ob_clean();
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Algunos pedidos no existen o no están en estado pendiente'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Actualizar los pedidos con la información del camión
    $sql = "UPDATE pedidos SET camion_id = ?, placa_camion = ? WHERE id IN ($placeholders)";
    $params = array_merge([$camionId, $placaCamion], $pedidosIds);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'message' => 'Pedidos asociados al camión correctamente',
        'pedidos_asociados' => count($pedidosIds)
    ], JSON_UNESCAPED_UNICODE);
    exit();
    
} catch (PDOException $e) {
    ob_clean();
    error_log("Error al asociar pedidos al camión (PDO): " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
} catch (Exception $e) {
    ob_clean();
    error_log("Error al asociar pedidos al camión: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
?>

