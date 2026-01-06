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
    
    $fecha = isset($_GET['fecha']) ? $_GET['fecha'] : date('Y-m-d');
    $estado = isset($_GET['estado']) ? $_GET['estado'] : null;
    
    // Verificar si las tablas existen
    $tables = $pdo->query("SHOW TABLES LIKE 'hojas_de_rutas'")->fetchAll();
    if (empty($tables)) {
        echo json_encode([
            'success' => true,
            'hojas' => [],
            'total' => 0,
            'fecha' => $fecha
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    $sql = "
        SELECT 
            hr.*,
            u.nombre as vendedor_nombre,
            u.username as vendedor_username
        FROM hojas_de_rutas hr
        LEFT JOIN usuarios u ON hr.vendedor_id = u.id
        WHERE hr.fecha = :fecha
    ";
    
    $params = [':fecha' => $fecha];
    
    if ($estado) {
        $sql .= " AND hr.estado = :estado";
        $params[':estado'] = $estado;
    }
    
    $sql .= " ORDER BY hr.fecha_creacion DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $hojas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener pedidos de cada hoja de ruta
    foreach ($hojas as &$hoja) {
        if (empty($hoja['vendedor_nombre'])) {
            $hoja['vendedor_nombre'] = $hoja['vendedor_username'];
        }
        
        // Obtener pedidos asociados
        $stmtPedidos = $pdo->prepare("
            SELECT 
                hrp.*,
                v.numero_pedido,
                v.total,
                CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
                c.direccion,
                c.zona,
                c.telefono_principal
            FROM hoja_ruta_pedidos hrp
            LEFT JOIN pedidos v ON hrp.pedido_id = v.id
            LEFT JOIN clientes c ON hrp.cliente_id = c.id
            WHERE hrp.hoja_ruta_id = ?
            ORDER BY hrp.orden_secuencia
        ");
        $stmtPedidos->execute([$hoja['id']]);
        $hoja['pedidos'] = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode([
        'success' => true,
        'hojas' => $hojas,
        'total' => count($hojas),
        'fecha' => $fecha
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Error al obtener hojas de rutas: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener hojas de rutas: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

