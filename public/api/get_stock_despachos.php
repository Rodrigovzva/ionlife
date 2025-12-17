<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }

    // Obtener todas las transferencias recibidas en despachos (desde producción)
    $sqlRecibidas = "
        SELECT 
            tamano,
            SUM(cantidad) as cantidad_total,
            SUM(litros) as litros_total
        FROM transferencias_almacenes
        WHERE almacen_destino = 'despachos'
        GROUP BY tamano
    ";
    
    $stmt = $pdo->query($sqlRecibidas);
    $recibidas = $stmt->fetchAll();
    
    // Obtener todas las transferencias enviadas desde despachos (hacia almacén móvil)
    $sqlEnviadas = "
        SELECT 
            tamano,
            SUM(cantidad) as cantidad_total,
            SUM(litros) as litros_total
        FROM transferencias_almacenes
        WHERE almacen_origen = 'despachos'
        GROUP BY tamano
    ";
    
    $stmt = $pdo->query($sqlEnviadas);
    $enviadas = $stmt->fetchAll();
    
    // Crear arrays indexados por tamaño
    $stockPorTamano = [];
    
    // Procesar recibidas
    foreach ($recibidas as $rec) {
        $tamano = $rec['tamano'];
        $stockPorTamano[$tamano] = [
            'tamano' => $tamano,
            'cantidad_recibida' => intval($rec['cantidad_total']),
            'litros_recibidos' => floatval($rec['litros_total']),
            'cantidad_enviada' => 0,
            'litros_enviados' => 0
        ];
    }
    
    // Procesar enviadas
    foreach ($enviadas as $env) {
        $tamano = $env['tamano'];
        if (!isset($stockPorTamano[$tamano])) {
            $stockPorTamano[$tamano] = [
                'tamano' => $tamano,
                'cantidad_recibida' => 0,
                'litros_recibidos' => 0,
                'cantidad_enviada' => 0,
                'litros_enviados' => 0
            ];
        }
        $stockPorTamano[$tamano]['cantidad_enviada'] = intval($env['cantidad_total']);
        $stockPorTamano[$tamano]['litros_enviados'] = floatval($env['litros_total']);
    }
    
    // Calcular disponible
    $stockDisponible = [];
    foreach ($stockPorTamano as $tamano => $stock) {
        $disponible = $stock['cantidad_recibida'] - $stock['cantidad_enviada'];
        $litrosDisponible = $stock['litros_recibidos'] - $stock['litros_enviados'];
        
        if ($disponible > 0) {
            $stockDisponible[] = [
                'tamano' => $tamano,
                'cantidad_disponible' => $disponible,
                'litros_disponible' => round($litrosDisponible, 2),
                'cantidad_recibida' => $stock['cantidad_recibida'],
                'cantidad_enviada' => $stock['cantidad_enviada']
            ];
        }
    }
    
    // Calcular totales
    $totalDisponible = array_sum(array_column($stockDisponible, 'cantidad_disponible'));
    $totalLitrosDisponible = array_sum(array_column($stockDisponible, 'litros_disponible'));
    $totalRecibido = array_sum(array_column($stockPorTamano, 'cantidad_recibida'));
    $totalEnviado = array_sum(array_column($stockPorTamano, 'cantidad_enviada'));
    
    echo json_encode([
        'success' => true,
        'stock' => $stockDisponible,
        'resumen' => [
            'total_disponible' => $totalDisponible,
            'total_litros_disponible' => round($totalLitrosDisponible, 2),
            'total_recibido' => $totalRecibido,
            'total_enviado' => $totalEnviado
        ]
    ]);

} catch (Exception $e) {
    error_log("Error en get_stock_despachos.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener stock: ' . $e->getMessage()
    ]);
}
exit();
?>

