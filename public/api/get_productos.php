<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos',
        'productos' => []
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    // Obtener todos los productos con información completa
    $stmt = $pdo->query("
        SELECT id, codigo_producto, nombre_producto, tamano, precio_compra, precio_venta, precio_mayorista, 
               proveedor, fecha_vencimiento, imagen_producto, notas, estado
        FROM productos 
        ORDER BY id DESC, nombre_producto
    ");
    
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear fechas y precios
    foreach ($productos as &$producto) {
        // Manejar fecha_vencimiento
        if (!empty($producto['fecha_vencimiento']) && $producto['fecha_vencimiento'] !== '0000-00-00') {
            try {
                $producto['fecha_vencimiento'] = date('d/m/Y', strtotime($producto['fecha_vencimiento']));
            } catch (Exception $e) {
                $producto['fecha_vencimiento'] = '-';
            }
        } else {
            $producto['fecha_vencimiento'] = '-';
        }
        
        // No hay fecha_registro, usar '-' como placeholder
        $producto['fecha_registro'] = '-';
        
        // Formatear precios
        $producto['precio_compra'] = number_format(floatval($producto['precio_compra']), 2, '.', ',');
        $producto['precio_venta'] = number_format(floatval($producto['precio_venta']), 2, '.', ',');
        
        if (!empty($producto['precio_mayorista']) && floatval($producto['precio_mayorista']) > 0) {
            $producto['precio_mayorista'] = number_format(floatval($producto['precio_mayorista']), 2, '.', ',');
        } else {
            $producto['precio_mayorista'] = '-';
        }
        
        // Formatear tamaño
        if (!empty($producto['tamano']) && floatval($producto['tamano']) > 0) {
            $producto['tamano'] = number_format(floatval($producto['tamano']), 0, '.', '') . ' ml';
        } else {
            $producto['tamano'] = '-';
        }
        
        // Manejar valores NULL
        $producto['proveedor'] = $producto['proveedor'] ?? '-';
        $producto['imagen_producto'] = $producto['imagen_producto'] ?? null;
        $producto['notas'] = $producto['notas'] ?? '';
    }
    
    echo json_encode([
        'success' => true,
        'productos' => $productos
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Error al obtener productos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener productos: ' . $e->getMessage(),
        'productos' => []
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error general al obtener productos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar productos: ' . $e->getMessage(),
        'productos' => []
    ], JSON_UNESCAPED_UNICODE);
}
exit();
?>

