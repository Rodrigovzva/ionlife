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
    
    // Agregar columna placa_camion si no existe
    $columns = $pdo->query("SHOW COLUMNS FROM transferencias_almacenes")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('placa_camion', $columns)) {
        try {
            $pdo->exec("ALTER TABLE transferencias_almacenes ADD COLUMN placa_camion VARCHAR(20) NULL AFTER almacen_destino");
            $pdo->exec("CREATE INDEX idx_placa_camion ON transferencias_almacenes(placa_camion)");
        } catch (PDOException $e) {
            // Si el índice ya existe, ignorar el error
            if (strpos($e->getMessage(), 'Duplicate key name') === false) {
                throw $e;
            }
        }
    }
    
    $activo = isset($_GET['activo']) ? intval($_GET['activo']) : 1;
    
    $sql = "SELECT * FROM camiones_almacen_movil WHERE activo = ? ORDER BY placa ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$activo]);
    
    $camiones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'camiones' => $camiones,
        'total' => count($camiones)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Error al obtener camiones: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener camiones: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

