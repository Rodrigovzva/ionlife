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

    $almacenDestino = $_GET['almacen_destino'] ?? null;

    $sql = "SELECT 
                t.*,
                cp.fecha as fecha_produccion,
                cp.linea,
                cp.operador as operador_produccion
            FROM transferencias_almacenes t
            LEFT JOIN control_produccion cp ON t.produccion_id = cp.id
            WHERE 1=1";
    
    $params = [];
    
    if ($almacenDestino) {
        $sql .= " AND t.almacen_destino = ?";
        $params[] = $almacenDestino;
    }
    
    $sql .= " ORDER BY t.fecha_transferencia DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $transferencias = $stmt->fetchAll();
    
    // Formatear datos para el frontend
    foreach ($transferencias as &$transf) {
        // Si no hay produccion_id, usar operador de la transferencia
        if (!$transf['operador_produccion']) {
            $transf['operador_produccion'] = $transf['operador'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'transferencias' => $transferencias
    ]);

} catch (Exception $e) {
    error_log("Error en get_transferencias.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener transferencias: ' . $e->getMessage()
    ]);
}
exit();
?>

