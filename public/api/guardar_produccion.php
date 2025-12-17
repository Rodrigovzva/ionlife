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
$required = ['fecha', 'operador', 'linea', 'tamano', 'cantidad_producida', 'litros_producidos'];
foreach ($required as $field) {
    if (!isset($input[$field]) || $input[$field] === '') {
        echo json_encode([
            'success' => false,
            'message' => "El campo " . str_replace('_', ' ', $field) . " es requerido"
        ]);
        exit();
    }
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // Verificar si existe la tabla control_produccion, si no, crearla
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS control_produccion (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fecha DATE NOT NULL,
            operador VARCHAR(100) NOT NULL,
            linea VARCHAR(50) NOT NULL,
            tamano INT NOT NULL,
            cantidad_producida INT NOT NULL,
            litros_producidos DECIMAL(10, 2) NOT NULL,
            cantidad_disponible INT NOT NULL DEFAULT 0,
            estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible',
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_fecha (fecha),
            INDEX idx_linea (linea),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Verificar y agregar columnas si no existen (para tablas ya creadas)
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'cantidad_disponible'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN cantidad_disponible INT NOT NULL DEFAULT 0 AFTER litros_producidos");
        // Inicializar cantidad_disponible con cantidad_producida para registros existentes
        $pdo->exec("UPDATE control_produccion SET cantidad_disponible = cantidad_producida WHERE cantidad_disponible = 0");
    }
    
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'estado'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible' AFTER cantidad_disponible");
        // Inicializar estado para registros existentes
        $pdo->exec("UPDATE control_produccion SET estado = 'disponible' WHERE estado IS NULL");
    }

    // Preparar datos
    $fecha = $input['fecha'];
    $operador = trim($input['operador']);
    $linea = trim($input['linea']);
    $tamano = intval($input['tamano']);
    $cantidad_producida = intval($input['cantidad_producida']);
    $litros_producidos = floatval($input['litros_producidos']);

    // Insertar registro de producción
    $stmt = $pdo->prepare("
        INSERT INTO control_produccion 
        (fecha, operador, linea, tamano, cantidad_producida, litros_producidos, cantidad_disponible, estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'disponible')
    ");

    $stmt->execute([
        $fecha,
        $operador,
        $linea,
        $tamano,
        $cantidad_producida,
        $litros_producidos,
        $cantidad_producida // cantidad_disponible inicia igual a cantidad_producida
    ]);

    $produccionId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Producción registrada correctamente',
        'produccion_id' => $produccionId,
        'data' => [
            'fecha' => $fecha,
            'operador' => $operador,
            'linea' => $linea,
            'tamano' => $tamano,
            'cantidad_producida' => $cantidad_producida,
            'litros_producidos' => $litros_producidos
        ]
    ]);

} catch (PDOException $e) {
    error_log("Error en guardar_produccion.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar la producción: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Error en guardar_produccion.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
exit();
?>

