<?php
/**
 * Script para crear las tablas de ventas y ventas_detalle
 * Ejecutar una vez para crear las tablas en la base de datos
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

    // Leer el archivo SQL
    $sql = file_get_contents(__DIR__ . '/init_ventas.sql');
    
    // Remover el USE ionica; ya que ya estamos conectados a la base de datos
    $sql = preg_replace('/USE\s+ionica\s*;/i', '', $sql);
    
    // Dividir en sentencias individuales
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && !preg_match('/^--/', $stmt);
        }
    );

    $pdo->beginTransaction();

    foreach ($statements as $statement) {
        if (!empty(trim($statement))) {
            $pdo->exec($statement);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Tablas de ventas creadas correctamente: ventas y ventas_detalle'
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear las tablas: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}

