<?php
/**
 * Script para borrar la tabla ventas_detalle
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

    // Borrar tabla ventas_detalle
    $pdo->exec("DROP TABLE IF EXISTS ventas_detalle");
    
    echo json_encode([
        'success' => true,
        'message' => 'Tabla ventas_detalle eliminada correctamente'
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al eliminar la tabla: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>

