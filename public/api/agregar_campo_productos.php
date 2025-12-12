<?php
/**
 * Script para agregar campo productos_json a la tabla ventas
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

    // Verificar si el campo ya existe
    $stmt = $pdo->query("SHOW COLUMNS FROM ventas LIKE 'productos_json'");
    $existe = $stmt->rowCount() > 0;
    
    if (!$existe) {
        // Agregar campo productos_json
        $pdo->exec("ALTER TABLE ventas ADD COLUMN productos_json JSON NULL AFTER notas_venta");
        echo json_encode([
            'success' => true,
            'message' => 'Campo productos_json agregado a la tabla ventas'
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'El campo productos_json ya existe'
        ], JSON_PRETTY_PRINT);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>

