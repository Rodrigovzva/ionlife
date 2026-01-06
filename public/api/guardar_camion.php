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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Crear tabla si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS camiones_almacen_movil (
            id INT AUTO_INCREMENT PRIMARY KEY,
            placa VARCHAR(20) NOT NULL UNIQUE,
            descripcion VARCHAR(255) NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_placa (placa),
            INDEX idx_activo (activo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Validar campos requeridos
    if (empty($input['placa'])) {
        echo json_encode([
            'success' => false,
            'message' => 'La placa del camión es requerida'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    $placa = strtoupper(trim($input['placa']));
    $descripcion = !empty($input['descripcion']) ? trim($input['descripcion']) : null;
    $activo = isset($input['activo']) ? intval($input['activo']) : 1;
    
    // Verificar si la placa ya existe
    $stmt = $pdo->prepare("SELECT id FROM camiones_almacen_movil WHERE placa = ?");
    $stmt->execute([$placa]);
    $existe = $stmt->fetch();
    
    if ($existe) {
        echo json_encode([
            'success' => false,
            'message' => 'Ya existe un camión con la placa: ' . $placa
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Insertar nuevo camión
    $stmt = $pdo->prepare("
        INSERT INTO camiones_almacen_movil (placa, descripcion, activo)
        VALUES (?, ?, ?)
    ");
    
    $stmt->execute([$placa, $descripcion, $activo]);
    
    $camionId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Camión registrado correctamente',
        'camion_id' => $camionId,
        'placa' => $placa
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Error de base de datos al guardar camión: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error al guardar camión: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar camión: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

