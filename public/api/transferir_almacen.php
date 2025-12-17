<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

// Determinar tipo de transferencia
$almacenOrigen = isset($input['almacen_origen']) ? trim($input['almacen_origen']) : 'produccion';
$almacenDestino = isset($input['almacen_destino']) ? trim($input['almacen_destino']) : '';

// Validar campos requeridos según el origen
if ($almacenOrigen === 'produccion') {
    $required = ['produccion_id', 'cantidad_transferir', 'almacen_destino'];
} else {
    // Desde despachos hacia almacén móvil
    $required = ['cantidad_transferir', 'almacen_destino', 'tamano'];
}

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

    // Crear tabla de transferencias si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS transferencias_almacenes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            produccion_id INT NULL,
            almacen_origen VARCHAR(50) NOT NULL DEFAULT 'produccion',
            almacen_destino VARCHAR(50) NOT NULL,
            cantidad INT NOT NULL,
            tamano INT NOT NULL,
            litros DECIMAL(10, 2) NOT NULL,
            operador VARCHAR(100) NOT NULL,
            fecha_transferencia DATETIME DEFAULT CURRENT_TIMESTAMP,
            observaciones TEXT,
            INDEX idx_produccion (produccion_id),
            INDEX idx_fecha (fecha_transferencia),
            INDEX idx_almacen_destino (almacen_destino),
            INDEX idx_almacen_origen (almacen_origen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Agregar almacen_origen si no existe (migración)
    $columns = $pdo->query("SHOW COLUMNS FROM transferencias_almacenes")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('almacen_origen', $columns)) {
        $pdo->exec("ALTER TABLE transferencias_almacenes ADD COLUMN almacen_origen VARCHAR(50) NOT NULL DEFAULT 'produccion' AFTER produccion_id");
        $pdo->exec("ALTER TABLE transferencias_almacenes ADD INDEX idx_almacen_origen (almacen_origen)");
    }
    
    // Permitir produccion_id NULL si no es NULL (migración)
    $produccionIdInfo = $pdo->query("SHOW COLUMNS FROM transferencias_almacenes WHERE Field = 'produccion_id'")->fetch();
    if ($produccionIdInfo && strpos($produccionIdInfo['Null'], 'NO') !== false) {
        $pdo->exec("ALTER TABLE transferencias_almacenes MODIFY produccion_id INT NULL");
    }

    $cantidadTransferir = intval($input['cantidad_transferir']);
    $almacenDestino = trim($input['almacen_destino']);
    $almacenOrigen = isset($input['almacen_origen']) ? trim($input['almacen_origen']) : 'produccion';
    $observaciones = isset($input['observaciones']) ? trim($input['observaciones']) : null;
    $operador = $_SESSION['nombre'] ?? $_SESSION['username'] ?? 'Sistema';

    if ($cantidadTransferir <= 0) {
        throw new Exception('La cantidad a transferir debe ser mayor a cero');
    }

    // Iniciar transacción
    $pdo->beginTransaction();

    if ($almacenOrigen === 'produccion') {
        // Transferencia desde producción
        $produccionId = intval($input['produccion_id']);
        
        // Obtener registro de producción
        $stmt = $pdo->prepare("SELECT * FROM control_produccion WHERE id = ? FOR UPDATE");
        $stmt->execute([$produccionId]);
        $produccion = $stmt->fetch();

        if (!$produccion) {
            throw new Exception('Registro de producción no encontrado');
        }

        // Validar cantidad disponible
        if ($cantidadTransferir > $produccion['cantidad_disponible']) {
            throw new Exception('La cantidad a transferir excede la cantidad disponible');
        }

        // Calcular litros a transferir
        $litrosTransferir = ($cantidadTransferir * $produccion['tamano']) / 1000;
        $tamano = $produccion['tamano'];

        // Actualizar cantidad disponible en producción
        $nuevaCantidadDisponible = $produccion['cantidad_disponible'] - $cantidadTransferir;
        $nuevoEstado = 'disponible';
        
        if ($nuevaCantidadDisponible == 0) {
            $nuevoEstado = 'transferido_despachos';
        } else if ($nuevaCantidadDisponible < $produccion['cantidad_disponible']) {
            $nuevoEstado = 'parcialmente_transferido';
        }

        $stmt = $pdo->prepare("
            UPDATE control_produccion 
            SET cantidad_disponible = ?, 
                estado = ?
            WHERE id = ?
        ");
        $stmt->execute([$nuevaCantidadDisponible, $nuevoEstado, $produccionId]);

        // Registrar transferencia
        $stmt = $pdo->prepare("
            INSERT INTO transferencias_almacenes 
            (produccion_id, almacen_origen, almacen_destino, cantidad, tamano, litros, operador, observaciones)
            VALUES (?, 'produccion', ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $produccionId,
            $almacenDestino,
            $cantidadTransferir,
            $tamano,
            $litrosTransferir,
            $operador,
            $observaciones
        ]);
        
    } else if ($almacenOrigen === 'despachos') {
        // Transferencia desde despachos hacia almacén móvil
        $tamano = intval($input['tamano']);
        
        // Verificar stock disponible en despachos
        $sqlStock = "
            SELECT 
                COALESCE(SUM(CASE WHEN almacen_destino = 'despachos' THEN cantidad ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN almacen_origen = 'despachos' THEN cantidad ELSE 0 END), 0) as disponible
            FROM transferencias_almacenes
            WHERE tamano = ?
        ";
        $stmt = $pdo->prepare($sqlStock);
        $stmt->execute([$tamano]);
        $stock = $stmt->fetch();
        
        $stockDisponible = intval($stock['disponible'] ?? 0);
        
        if ($cantidadTransferir > $stockDisponible) {
            throw new Exception("La cantidad a transferir ($cantidadTransferir) excede el stock disponible ($stockDisponible) en almacén de despachos");
        }

        // Calcular litros a transferir
        $litrosTransferir = ($cantidadTransferir * $tamano) / 1000;

        // Registrar transferencia (sin produccion_id para transferencias desde despachos)
        $stmt = $pdo->prepare("
            INSERT INTO transferencias_almacenes 
            (produccion_id, almacen_origen, almacen_destino, cantidad, tamano, litros, operador, observaciones)
            VALUES (NULL, 'despachos', ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $almacenDestino,
            $cantidadTransferir,
            $tamano,
            $litrosTransferir,
            $operador,
            $observaciones
        ]);
    } else {
        throw new Exception('Almacén de origen no válido');
    }

    $transferenciaId = $pdo->lastInsertId();

    // Confirmar transacción
    $pdo->commit();

    $responseData = [
        'cantidad_transferida' => $cantidadTransferir,
        'litros_transferidos' => round($litrosTransferir, 2),
        'almacen_destino' => $almacenDestino
    ];
    
    if ($almacenOrigen === 'produccion') {
        $responseData['cantidad_disponible_restante'] = $nuevaCantidadDisponible;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Transferencia realizada correctamente',
        'transferencia_id' => $transferenciaId,
        'data' => $responseData
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Error en transferir_almacen.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
exit();
?>

