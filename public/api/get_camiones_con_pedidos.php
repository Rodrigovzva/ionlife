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
    
    // Verificar si existe la columna camion_id en la tabla pedidos
    $columns = $pdo->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN);
    $tieneCamionId = in_array('camion_id', $columns);
    $tienePlacaCamion = in_array('placa_camion', $columns);
    
    if (!$tieneCamionId || !$tienePlacaCamion) {
        // Si no existen las columnas, devolver array vacío
        echo json_encode([
            'success' => true,
            'camiones' => [],
            'total' => 0
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Obtener todos los camiones activos
    $sqlCamiones = "SELECT * FROM camiones_almacen_movil WHERE activo = 1 ORDER BY placa ASC";
    $stmtCamiones = $pdo->query($sqlCamiones);
    $camiones = $stmtCamiones->fetchAll(PDO::FETCH_ASSOC);
    
    // Para cada camión, obtener sus pedidos asociados
    $resultado = [];
    
    foreach ($camiones as $camion) {
        $sqlPedidos = "
            SELECT 
                p.id,
                p.numero_pedido,
                p.fecha_registro,
                p.fecha_programada,
                p.cliente_id,
                p.vendedor_id,
                p.total,
                p.estado_pedido,
                p.productos_json,
                p.notas_pedido,
                CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
                c.nombre as cliente_nombre_p,
                c.apellido as cliente_apellido,
                c.direccion,
                c.zona,
                c.telefono_principal,
                c.telefono_secundario,
                c.latitud,
                c.longitud,
                c.correo,
                c.notas as cliente_notas,
                u.nombre as vendedor_nombre,
                u.username as vendedor_username
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE (p.camion_id = ? OR p.placa_camion = ?) 
            AND p.estado_pedido IN ('pendiente', 'en_proceso')
            ORDER BY p.fecha_registro ASC
        ";
        
        $stmtPedidos = $pdo->prepare($sqlPedidos);
        $stmtPedidos->execute([$camion['id'], $camion['placa']]);
        $pedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);
        
        // Procesar pedidos para incluir productos decodificados
        foreach ($pedidos as &$pedido) {
            if (empty($pedido['vendedor_nombre'])) {
                $pedido['vendedor_nombre'] = $pedido['vendedor_username'];
            }
            if (!empty($pedido['productos_json'])) {
                $pedido['productos'] = json_decode($pedido['productos_json'], true);
            } else {
                $pedido['productos'] = [];
            }
        }
        
        if (count($pedidos) > 0) {
            $resultado[] = [
                'camion' => $camion,
                'pedidos' => $pedidos,
                'total_pedidos' => count($pedidos),
                'total_monto' => array_sum(array_column($pedidos, 'total'))
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'camiones' => $resultado,
        'total' => count($resultado)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Error de base de datos al obtener camiones con pedidos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error al obtener camiones con pedidos: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener camiones con pedidos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

