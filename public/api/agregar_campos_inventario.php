<?php
/**
 * Script para agregar campos de inventario a la tabla productos
 */

require_once 'config.php';

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    $mensajes = [];
    
    // Verificar y agregar campo stock_actual
    $stmt = $pdo->query("SHOW COLUMNS FROM productos LIKE 'stock_actual'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE productos ADD COLUMN stock_actual INT DEFAULT 0 AFTER estado");
        $mensajes[] = "Campo stock_actual agregado";
    } else {
        $mensajes[] = "Campo stock_actual ya existe";
    }
    
    // Verificar y agregar campo stock_minimo
    $stmt = $pdo->query("SHOW COLUMNS FROM productos LIKE 'stock_minimo'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE productos ADD COLUMN stock_minimo INT DEFAULT 0 AFTER stock_actual");
        $mensajes[] = "Campo stock_minimo agregado";
    } else {
        $mensajes[] = "Campo stock_minimo ya existe";
    }
    
    // Verificar y agregar campo ubicacion_almacen
    $stmt = $pdo->query("SHOW COLUMNS FROM productos LIKE 'ubicacion_almacen'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE productos ADD COLUMN ubicacion_almacen VARCHAR(100) NULL AFTER stock_minimo");
        $mensajes[] = "Campo ubicacion_almacen agregado";
    } else {
        $mensajes[] = "Campo ubicacion_almacen ya existe";
    }
    
    echo json_encode([
        'success' => true,
        'message' => implode(', ', $mensajes)
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>

