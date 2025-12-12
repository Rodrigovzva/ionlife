<?php
/**
 * Script para crear la base de datos y tablas
 * Ejecutar una sola vez
 */

// Conectar sin especificar base de datos
// Usar 'db' para el contenedor Docker
$host = 'db';
$user = 'root';
$pass = 'root';

try {
    echo "=== Creando Base de Datos IONICA ===\n\n";
    
    // Conectar a MySQL sin base de datos
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Crear base de datos
    echo "1. Creando base de datos 'ionica'...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS ionica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "   ✓ Base de datos creada\n\n";
    
    // Usar la base de datos
    $pdo->exec("USE ionica");
    
    // Crear tabla usuarios
    echo "2. Creando tabla 'usuarios'...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            nombre VARCHAR(100),
            activo TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   ✓ Tabla usuarios creada\n\n";
    
    // Insertar usuarios
    echo "3. Insertando usuarios de prueba...\n";
    $stmt = $pdo->prepare("
        INSERT INTO usuarios (username, email, password, nombre, activo) 
        VALUES (:username, :email, :password, :nombre, 1)
        ON DUPLICATE KEY UPDATE password = VALUES(password)
    ");
    
    $usuarios = [
        ['admin', 'admin@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Administrador'],
        ['vendedor', 'vendedor@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Vendedor']
    ];
    
    foreach ($usuarios as $usuario) {
        $stmt->execute([
            ':username' => $usuario[0],
            ':email' => $usuario[1],
            ':password' => $usuario[2],
            ':nombre' => $usuario[3]
        ]);
    }
    echo "   ✓ Usuarios insertados\n\n";
    
    // Crear tabla clientes
    echo "4. Creando tabla 'clientes'...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS clientes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre_completo VARCHAR(200) NOT NULL,
            numero_ci VARCHAR(20) NOT NULL UNIQUE,
            telefono_principal VARCHAR(20),
            ciudad VARCHAR(100),
            direccion TEXT,
            correo VARCHAR(100),
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            latitud DECIMAL(10, 8) NULL,
            longitud DECIMAL(11, 8) NULL,
            tipo_cliente ENUM('normal', 'mayorista', 'distribuidor') DEFAULT 'normal',
            negocio_razon_social VARCHAR(200),
            nit VARCHAR(50),
            notas TEXT,
            estado ENUM('activo', 'inactivo') DEFAULT 'activo',
            vendedor_asignado INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ci (numero_ci),
            INDEX idx_correo (correo),
            INDEX idx_estado (estado),
            INDEX idx_vendedor (vendedor_asignado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   ✓ Tabla clientes creada\n\n";
    
    // Crear tabla productos
    echo "5. Creando tabla 'productos'...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo_producto VARCHAR(50) NOT NULL UNIQUE,
            nombre_producto VARCHAR(200) NOT NULL,
            tamano DECIMAL(10, 2),
            precio_compra DECIMAL(10, 2) NOT NULL,
            precio_venta DECIMAL(10, 2) NOT NULL,
            precio_mayorista DECIMAL(10, 2),
            proveedor VARCHAR(100),
            fecha_vencimiento DATE,
            imagen_producto VARCHAR(255),
            estado ENUM('activo', 'inactivo', 'descontinuado') DEFAULT 'activo',
            stock_actual INT DEFAULT 0,
            stock_minimo INT DEFAULT 0,
            ubicacion_almacen VARCHAR(100) NULL,
            notas TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_codigo (codigo_producto),
            INDEX idx_nombre (nombre_producto),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   ✓ Tabla productos creada\n\n";
    
    // Crear tabla ventas
    echo "6. Creando tabla 'ventas'...\n";
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
    echo "   ✓ Tabla ventas creada\n\n";
    
    // Crear tabla ventas_detalle
    echo "7. Creando tabla 'ventas_detalle'...\n";
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
    echo "   ✓ Tabla ventas_detalle creada\n\n";
    
    // Verificar
    echo "=== Verificación ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
    $result = $stmt->fetch();
    echo "Usuarios: " . $result['total'] . "\n";
    
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tablas: " . implode(', ', $tables) . "\n\n";
    
    echo "✓ Base de datos creada exitosamente!\n";
    echo "\nCredenciales para ingresar:\n";
    echo "  Usuario: admin / Contraseña: password\n";
    echo "  Usuario: vendedor / Contraseña: password\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>

