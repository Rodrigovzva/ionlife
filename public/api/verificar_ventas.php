<?php
/**
 * Script para verificar y crear las tablas de ventas si no existen
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

    // Verificar si la tabla ventas existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'ventas'");
    $ventasExiste = $stmt->rowCount() > 0;
    
    $stmt = $pdo->query("SHOW TABLES LIKE 'ventas_detalle'");
    $detalleExiste = $stmt->rowCount() > 0;

    echo "Estado actual:\n";
    echo "  - Tabla 'ventas': " . ($ventasExiste ? "EXISTE" : "NO EXISTE") . "\n";
    echo "  - Tabla 'ventas_detalle': " . ($detalleExiste ? "EXISTE" : "NO EXISTE") . "\n\n";

    if (!$ventasExiste || !$detalleExiste) {
        echo "Creando tablas...\n\n";
        
        // Crear tabla ventas
        if (!$ventasExiste) {
            echo "Creando tabla 'ventas'...\n";
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS ventas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    numero_venta VARCHAR(50) NOT NULL UNIQUE,
                    fecha_registro DATETIME NOT NULL,
                    cliente_id INT NOT NULL,
                    vendedor_id INT NOT NULL,
                    tipo_venta ENUM('normal', 'mayorista', 'distribuidor') DEFAULT 'normal',
                    estado_venta ENUM('completada', 'pendiente', 'cancelada') DEFAULT 'completada',
                    subtotal DECIMAL(10, 2) NOT NULL,
                    descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
                    descuento_monto DECIMAL(10, 2) DEFAULT 0,
                    total DECIMAL(10, 2) NOT NULL,
                    metodo_pago ENUM('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'qr', 'mixto') NOT NULL,
                    monto_recibido DECIMAL(10, 2) DEFAULT 0,
                    cambio DECIMAL(10, 2) DEFAULT 0,
                    notas_venta TEXT,
                    productos_json JSON NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_cliente (cliente_id),
                    INDEX idx_vendedor (vendedor_id),
                    INDEX idx_fecha (fecha_registro),
                    INDEX idx_estado (estado_venta),
                    INDEX idx_numero_venta (numero_venta),
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo "  ✓ Tabla 'ventas' creada\n";
        }
        
        // Crear tabla ventas_detalle
        if (!$detalleExiste) {
            echo "Creando tabla 'ventas_detalle'...\n";
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS ventas_detalle (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    venta_id INT NOT NULL,
                    producto_id INT NOT NULL,
                    cantidad INT NOT NULL,
                    precio_unitario DECIMAL(10, 2) NOT NULL,
                    subtotal DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_venta (venta_id),
                    INDEX idx_producto (producto_id),
                    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            echo "  ✓ Tabla 'ventas_detalle' creada\n";
        }
        
        echo "\n✓ Tablas creadas exitosamente!\n";
    } else {
        echo "✓ Las tablas ya existen.\n";
    }
    
    // Mostrar estructura
    echo "\n=== Estructura de la tabla 'ventas' ===\n";
    $stmt = $pdo->query("DESCRIBE ventas");
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        echo sprintf("  %-20s %s\n", $col['Field'], $col['Type']);
    }
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>

