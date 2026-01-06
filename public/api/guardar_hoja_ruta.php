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
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS hojas_de_rutas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_hoja VARCHAR(20) NOT NULL UNIQUE,
                fecha DATE NOT NULL,
                almacen_movil VARCHAR(100) NULL,
                vendedor_id INT NULL,
                estado ENUM('borrador', 'asignada', 'en_ruta', 'completada', 'cancelada') NOT NULL DEFAULT 'borrador',
                total_pedidos INT NOT NULL DEFAULT 0,
                total_paradas INT NOT NULL DEFAULT 0,
                observaciones TEXT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_asignacion DATETIME NULL,
                fecha_inicio DATETIME NULL,
                fecha_fin DATETIME NULL,
                INDEX idx_fecha (fecha),
                INDEX idx_estado (estado),
                INDEX idx_numero_hoja (numero_hoja),
                INDEX idx_vendedor (vendedor_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    } catch (PDOException $e) {
        // Si la tabla ya existe, verificar si necesita migración de columnas
        error_log("Nota al crear tabla hojas_de_rutas: " . $e->getMessage());
    }
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS hoja_ruta_pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hoja_ruta_id INT NOT NULL,
            pedido_id INT NOT NULL,
            orden_secuencia INT NOT NULL,
            cliente_id INT NOT NULL,
            estado ENUM('pendiente', 'en_ruta', 'entregado', 'no_entregado') NOT NULL DEFAULT 'pendiente',
            fecha_entrega DATETIME NULL,
            observaciones TEXT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hoja_ruta (hoja_ruta_id),
            INDEX idx_pedido (pedido_id),
            INDEX idx_cliente (cliente_id),
            INDEX idx_orden (hoja_ruta_id, orden_secuencia),
            FOREIGN KEY (hoja_ruta_id) REFERENCES hojas_de_rutas(id) ON DELETE CASCADE,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            UNIQUE KEY unique_hoja_pedido (hoja_ruta_id, pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Validar campos requeridos
    if (empty($input['fecha']) || empty($input['pedidos']) || !is_array($input['pedidos']) || count($input['pedidos']) === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Fecha y al menos un pedido son requeridos'
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    $fecha = $input['fecha'];
    $pedidos = $input['pedidos'];
    $vendedorId = !empty($input['vendedor_id']) ? intval($input['vendedor_id']) : null;
    // almacen_movil puede ser texto o número
    $almacenMovilId = !empty($input['almacen_movil_id']) ? trim($input['almacen_movil_id']) : null;
    $observaciones = !empty($input['observaciones']) ? trim($input['observaciones']) : null;
    $estado = !empty($input['estado']) ? $input['estado'] : 'borrador';
    
    // Generar número de hoja de ruta
    $numeroHoja = generarNumeroHojaRuta($pdo, $fecha);
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    // Insertar hoja de ruta
    $stmt = $pdo->prepare("
        INSERT INTO hojas_de_rutas (
            numero_hoja, fecha, almacen_movil, vendedor_id, estado,
            total_pedidos, total_paradas, observaciones
        ) VALUES (
            :numero_hoja, :fecha, :almacen_movil, :vendedor_id, :estado,
            :total_pedidos, :total_paradas, :observaciones
        )
    ");
    
    $totalPedidos = count($pedidos);
    $stmt->execute([
        ':numero_hoja' => $numeroHoja,
        ':fecha' => $fecha,
        ':almacen_movil' => $almacenMovilId,
        ':vendedor_id' => $vendedorId,
        ':estado' => $estado,
        ':total_pedidos' => $totalPedidos,
        ':total_paradas' => $totalPedidos, // Por ahora, cada pedido es una parada
        ':observaciones' => $observaciones
    ]);
    
    $hojaRutaId = $pdo->lastInsertId();
    
    // Insertar pedidos en la hoja de ruta
    foreach ($pedidos as $orden => $pedidoData) {
        $pedidoId = intval($pedidoData['id']);
        $clienteId = intval($pedidoData['cliente_id']);
        
        // Obtener cliente_id si no viene
        if (!$clienteId && !empty($pedidoId)) {
            $stmtCliente = $pdo->prepare("SELECT cliente_id FROM pedidos WHERE id = ?");
            $stmtCliente->execute([$pedidoId]);
            $result = $stmtCliente->fetch();
            if ($result) {
                $clienteId = intval($result['cliente_id']);
            }
        }
        
        $stmtPedido = $pdo->prepare("
            INSERT INTO hoja_ruta_pedidos (
                hoja_ruta_id, pedido_id, orden_secuencia, cliente_id, estado, observaciones
            ) VALUES (
                :hoja_ruta_id, :pedido_id, :orden_secuencia, :cliente_id, 'pendiente', :observaciones
            )
        ");
        
        $stmtPedido->execute([
            ':hoja_ruta_id' => $hojaRutaId,
            ':pedido_id' => $pedidoId,
            ':orden_secuencia' => $orden + 1,
            ':cliente_id' => $clienteId,
            ':observaciones' => !empty($pedidoData['observaciones']) ? trim($pedidoData['observaciones']) : null
        ]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Hoja de ruta guardada correctamente',
        'hoja_ruta_id' => $hojaRutaId,
        'numero_hoja' => $numeroHoja
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Error al guardar hoja de ruta: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar hoja de ruta: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();

function generarNumeroHojaRuta($pdo, $fecha) {
    $fechaFormato = date('Ymd', strtotime($fecha));
    
    // Contar hojas de rutas del día
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM hojas_de_rutas 
            WHERE fecha = ?
        ");
        $stmt->execute([$fecha]);
        $result = $stmt->fetch();
        $numero = ($result['total'] ?? 0) + 1;
    } catch (Exception $e) {
        $numero = 1;
    }
    
    return "HR-{$fechaFormato}-" . str_pad($numero, 3, '0', STR_PAD_LEFT);
}
?>

