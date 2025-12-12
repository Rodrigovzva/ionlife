<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ]);
    exit();
}

try {
    // Verificar si la tabla productos existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'productos'");
    $tableExists = $stmt->rowCount() > 0;
    
    if ($tableExists) {
        // Obtener el último código numérico
        $stmt = $pdo->query("
            SELECT codigo_producto 
            FROM productos 
            WHERE codigo_producto REGEXP '^[0-9]+$'
            ORDER BY CAST(codigo_producto AS UNSIGNED) DESC 
            LIMIT 1
        ");
        $result = $stmt->fetch();
        
        if ($result) {
            $ultimoNumero = intval($result['codigo_producto']);
            $nuevoCodigo = (string)($ultimoNumero + 1);
        } else {
            // Si no hay productos, empezar desde 1
            $nuevoCodigo = '1';
        }
    } else {
        // Si la tabla no existe, empezar desde 1
        $nuevoCodigo = '1';
    }
    
    echo json_encode([
        'success' => true,
        'ultimo_codigo' => $nuevoCodigo
    ]);

} catch (PDOException $e) {
    // Si hay error, empezar desde 1
    $nuevoCodigo = '1';
    echo json_encode([
        'success' => true,
        'ultimo_codigo' => $nuevoCodigo
    ]);
}
?>

