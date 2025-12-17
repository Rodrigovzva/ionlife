<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

// Verificar sesión
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

    // Verificar si las columnas nuevas existen
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'cantidad_disponible'");
    $tieneCantidadDisponible = $stmt->rowCount() > 0;
    
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'estado'");
    $tieneEstado = $stmt->rowCount() > 0;

    // Si faltan columnas, agregarlas automáticamente
    if (!$tieneCantidadDisponible || !$tieneEstado) {
        try {
            if (!$tieneCantidadDisponible) {
                $pdo->exec("ALTER TABLE control_produccion ADD COLUMN cantidad_disponible INT NOT NULL DEFAULT 0 AFTER litros_producidos");
                $pdo->exec("UPDATE control_produccion SET cantidad_disponible = cantidad_producida WHERE cantidad_disponible = 0");
            }
            
            if (!$tieneEstado) {
                $pdo->exec("ALTER TABLE control_produccion ADD COLUMN estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible' AFTER cantidad_disponible");
                $pdo->exec("UPDATE control_produccion SET estado = 'disponible' WHERE estado IS NULL");
            }
            
            // Actualizar flags
            $tieneCantidadDisponible = true;
            $tieneEstado = true;
        } catch (PDOException $e) {
            error_log("Error al agregar columnas en get_produccion.php: " . $e->getMessage());
            // Continuar con valores por defecto
        }
    }

    // Obtener parámetros de filtro
    $estado = $_GET['estado'] ?? null;
    $fechaDesde = $_GET['fecha_desde'] ?? null;
    $fechaHasta = $_GET['fecha_hasta'] ?? null;

    // Construir consulta según las columnas disponibles
    if ($tieneCantidadDisponible && $tieneEstado) {
        $sql = "SELECT 
                    id,
                    fecha,
                    operador,
                    linea,
                    tamano,
                    cantidad_producida,
                    litros_producidos,
                    cantidad_disponible,
                    estado,
                    fecha_registro
                FROM control_produccion
                WHERE 1=1";
    } else {
        // Si no tienen las columnas nuevas, usar valores por defecto
        $sql = "SELECT 
                    id,
                    fecha,
                    operador,
                    linea,
                    tamano,
                    cantidad_producida,
                    litros_producidos,
                    cantidad_producida as cantidad_disponible,
                    'disponible' as estado,
                    fecha_registro
                FROM control_produccion
                WHERE 1=1";
    }
    
    $params = [];
    
    if ($estado && $tieneEstado) {
        $sql .= " AND estado = ?";
        $params[] = $estado;
    }
    
    if ($fechaDesde) {
        $sql .= " AND fecha >= ?";
        $params[] = $fechaDesde;
    }
    
    if ($fechaHasta) {
        $sql .= " AND fecha <= ?";
        $params[] = $fechaHasta;
    }
    
    $sql .= " ORDER BY fecha DESC, fecha_registro DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $produccion = $stmt->fetchAll();
    
    // Calcular totales
    $totalProducido = array_sum(array_column($produccion, 'cantidad_producida'));
    $totalDisponible = array_sum(array_column($produccion, 'cantidad_disponible'));
    $totalTransferido = $totalProducido - $totalDisponible;
    $totalLitros = array_sum(array_column($produccion, 'litros_producidos'));
    
    echo json_encode([
        'success' => true,
        'produccion' => $produccion,
        'resumen' => [
            'total_producido' => $totalProducido,
            'total_disponible' => $totalDisponible,
            'total_transferido' => $totalTransferido,
            'total_litros' => round($totalLitros, 2)
        ]
    ]);

} catch (Exception $e) {
    error_log("Error en get_produccion.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener producción: ' . $e->getMessage()
    ]);
}
exit();
?>

