<?php
// Asegurar que no haya output antes del JSON
ob_start();

require_once 'config.php';

// Limpiar cualquier output previo
ob_clean();

// Establecer headers JSON
header('Content-Type: application/json; charset=utf-8');

if (!isLoggedIn()) {
    ob_clean();
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'No autorizado. Por favor, inicie sesión.'], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    // Obtener pedidos pendientes con información completa del cliente
           // Verificar si existen las columnas camion_id y placa_camion
           $columns = $pdo->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN);
           $tieneCamionId = in_array('camion_id', $columns);
           $tienePlacaCamion = in_array('placa_camion', $columns);
           
           // Construir la condición WHERE
           $whereConditions = ["v.estado_pedido = 'pendiente'"];
           
           // Si existen las columnas, excluir pedidos que ya están asociados a un camión
           if ($tieneCamionId && $tienePlacaCamion) {
               $whereConditions[] = "(v.camion_id IS NULL AND (v.placa_camion IS NULL OR v.placa_camion = ''))";
           }
           
           $whereClause = "WHERE " . implode(" AND ", $whereConditions);
           
           $sql = "
               SELECT
                   v.id,
                   v.numero_pedido,
                   v.fecha_registro,
                   v.fecha_programada,
                   v.cliente_id,
                   v.vendedor_id,
                   v.total,
                   v.estado_pedido,
                   v.productos_json,
                   v.notas_pedido,
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
               FROM pedidos v
               LEFT JOIN clientes c ON v.cliente_id = c.id
               LEFT JOIN usuarios u ON v.vendedor_id = u.id
               $whereClause
               ORDER BY v.fecha_registro ASC
           ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear datos
    foreach ($pedidos as &$pedido) {
        if (empty($pedido['vendedor_nombre'])) {
            $pedido['vendedor_nombre'] = $pedido['vendedor_username'];
        }
        
        // Parsear productos_json si existe
        if (!empty($pedido['productos_json'])) {
            $pedido['productos'] = json_decode($pedido['productos_json'], true);
        } else {
            $pedido['productos'] = [];
        }
    }
    
    echo json_encode([
        'success' => true,
        'pedidos' => $pedidos,
        'total' => count($pedidos)
    ], JSON_UNESCAPED_UNICODE);
    exit();
    
} catch (PDOException $e) {
    ob_clean();
    error_log("Error de base de datos al obtener pedidos para hoja de ruta: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
} catch (Exception $e) {
    ob_clean();
    error_log("Error al obtener pedidos para hoja de ruta: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener pedidos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

