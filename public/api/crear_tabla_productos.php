<?php
/**
 * Script para crear la tabla de productos
 * Ejecutar una sola vez
 */

// Conectar sin especificar base de datos
$host = '10.0.0.3';
$user = 'root';
$pass = 'root';

try {
    echo "=== Creando Tabla de Productos ===\n\n";
    
    // Conectar a MySQL
    $pdo = new PDO("mysql:host=$host;dbname=ionica;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Verificar si la tabla ya existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'productos'");
    $tableExists = $stmt->rowCount() > 0;
    
    if ($tableExists) {
        echo "⚠ La tabla 'productos' ya existe\n";
        echo "¿Deseas eliminarla y recrearla? (s/n): ";
        // Por seguridad, no eliminamos automáticamente
        echo "\nSi quieres recrearla, elimínala manualmente desde phpMyAdmin primero.\n";
        exit(0);
    }
    
    // Crear tabla productos
    echo "1. Creando tabla 'productos'...\n";
    $pdo->exec("
        CREATE TABLE productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo_producto VARCHAR(50) NOT NULL UNIQUE,
            nombre_producto VARCHAR(200) NOT NULL,
            marca VARCHAR(100),
            precio_compra DECIMAL(10, 2) NOT NULL,
            precio_venta DECIMAL(10, 2) NOT NULL,
            precio_mayorista DECIMAL(10, 2),
            proveedor VARCHAR(100),
            fecha_vencimiento DATE,
            imagen_producto VARCHAR(255),
            estado ENUM('activo', 'inactivo', 'descontinuado') DEFAULT 'activo',
            notas TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_codigo (codigo_producto),
            INDEX idx_nombre (nombre_producto),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   ✓ Tabla productos creada\n\n";
    
    // Verificar estructura
    echo "=== Verificación ===\n";
    $stmt = $pdo->query("DESCRIBE productos");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Columnas de la tabla:\n";
    foreach ($columns as $col) {
        echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
    
    echo "\n✓ Tabla de productos creada exitosamente!\n";
    echo "\nAhora puedes usar el formulario de productos para guardar datos.\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>

