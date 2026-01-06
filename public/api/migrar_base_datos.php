<?php
/**
 * Script de migración para actualizar la base de datos en el servidor
 * Este script agrega las tablas y columnas faltantes sin afectar datos existentes
 * 
 * Uso: Ejecutar desde navegador o línea de comandos
 * http://localhost/api/migrar_base_datos.php
 * o: php migrar_base_datos.php
 */

ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: text/html; charset=utf-8');

$isCLI = php_sapi_name() === 'cli';
$output = [];

function logMessage($message, $type = 'info') {
    global $output;
    $output[] = ['type' => $type, 'message' => $message];
    if ($type === 'error') {
        error_log($message);
    }
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }
    
    logMessage('✓ Conexión a la base de datos establecida', 'success');
    
    // 1. Verificar y crear tabla control_produccion si no existe
    logMessage('Verificando tabla control_produccion...', 'info');
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS control_produccion (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fecha DATE NOT NULL,
            operador VARCHAR(100) NOT NULL,
            linea VARCHAR(50) NOT NULL,
            tamano INT NOT NULL,
            cantidad_producida INT NOT NULL,
            litros_producidos DECIMAL(10, 2) NOT NULL,
            cantidad_disponible INT NOT NULL DEFAULT 0,
            estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible',
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_fecha (fecha),
            INDEX idx_linea (linea),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Agregar columnas si no existen
    $columns = $pdo->query("SHOW COLUMNS FROM control_produccion")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('cantidad_disponible', $columns)) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN cantidad_disponible INT NOT NULL DEFAULT 0 AFTER litros_producidos");
        $pdo->exec("UPDATE control_produccion SET cantidad_disponible = cantidad_producida WHERE cantidad_disponible = 0");
        logMessage('✓ Columna cantidad_disponible agregada a control_produccion', 'success');
    }
    if (!in_array('estado', $columns)) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible' AFTER cantidad_disponible");
        $pdo->exec("UPDATE control_produccion SET estado = 'disponible' WHERE estado IS NULL");
        logMessage('✓ Columna estado agregada a control_produccion', 'success');
    }
    logMessage('✓ Tabla control_produccion verificada', 'success');
    
    // 2. Verificar y crear tabla transferencias_almacenes si no existe
    logMessage('Verificando tabla transferencias_almacenes...', 'info');
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS transferencias_almacenes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            produccion_id INT NULL,
            almacen_origen VARCHAR(50) NOT NULL DEFAULT 'produccion',
            almacen_destino VARCHAR(50) NOT NULL,
            placa_camion VARCHAR(20) NULL,
            cantidad INT NOT NULL,
            tamano INT NOT NULL,
            litros DECIMAL(10, 2) NOT NULL,
            operador VARCHAR(100) NOT NULL,
            fecha_transferencia DATETIME DEFAULT CURRENT_TIMESTAMP,
            observaciones TEXT NULL,
            INDEX idx_produccion (produccion_id),
            INDEX idx_fecha (fecha_transferencia),
            INDEX idx_almacen_destino (almacen_destino),
            INDEX idx_almacen_origen (almacen_origen),
            INDEX idx_placa_camion (placa_camion),
            FOREIGN KEY (produccion_id) REFERENCES control_produccion(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Agregar columnas si no existen
    $columns = $pdo->query("SHOW COLUMNS FROM transferencias_almacenes")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('almacen_origen', $columns)) {
        $pdo->exec("ALTER TABLE transferencias_almacenes ADD COLUMN almacen_origen VARCHAR(50) NOT NULL DEFAULT 'produccion' AFTER produccion_id");
        $pdo->exec("ALTER TABLE transferencias_almacenes ADD INDEX idx_almacen_origen (almacen_origen)");
        logMessage('✓ Columna almacen_origen agregada a transferencias_almacenes', 'success');
    }
    if (!in_array('placa_camion', $columns)) {
        $pdo->exec("ALTER TABLE transferencias_almacenes ADD COLUMN placa_camion VARCHAR(20) NULL AFTER almacen_destino");
        $pdo->exec("CREATE INDEX idx_placa_camion ON transferencias_almacenes(placa_camion)");
        logMessage('✓ Columna placa_camion agregada a transferencias_almacenes', 'success');
    }
    logMessage('✓ Tabla transferencias_almacenes verificada', 'success');
    
    // 3. Crear tabla camiones_almacen_movil si no existe
    logMessage('Verificando tabla camiones_almacen_movil...', 'info');
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS camiones_almacen_movil (
            id INT AUTO_INCREMENT PRIMARY KEY,
            placa VARCHAR(20) NOT NULL UNIQUE,
            descripcion VARCHAR(255) NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_placa (placa),
            INDEX idx_activo (activo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    logMessage('✓ Tabla camiones_almacen_movil verificada', 'success');
    
    // 4. Crear tabla hojas_de_rutas si no existe
    logMessage('Verificando tabla hojas_de_rutas...', 'info');
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS hojas_de_rutas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_hoja VARCHAR(20) NOT NULL UNIQUE,
                fecha DATE NOT NULL,
                almacen_movil VARCHAR(100) NULL,
                vendedor_id INT NULL,
                estado ENUM('borrador', 'asignada', 'en_ruta', 'completada', 'cancelada') NOT NULL DEFAULT 'borrador',
                total_pedidos INT NOT NULL DEFAULT 0,
                total_paradas INT NOT NULL DEFAULT 0,
                observaciones TEXT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_asignacion DATETIME NULL,
                fecha_inicio DATETIME NULL,
                fecha_fin DATETIME NULL,
                INDEX idx_fecha (fecha),
                INDEX idx_estado (estado),
                INDEX idx_numero_hoja (numero_hoja),
                INDEX idx_vendedor (vendedor_id),
                FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        logMessage('✓ Tabla hojas_de_rutas verificada', 'success');
    } catch (PDOException $e) {
        logMessage('⚠ Tabla hojas_de_rutas: ' . $e->getMessage(), 'warning');
    }
    
    // 5. Crear tabla hoja_ruta_pedidos si no existe
    logMessage('Verificando tabla hoja_ruta_pedidos...', 'info');
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS hoja_ruta_pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hoja_ruta_id INT NOT NULL,
            pedido_id INT NOT NULL,
            orden_secuencia INT NOT NULL,
            cliente_id INT NOT NULL,
            estado ENUM('pendiente', 'en_ruta', 'entregado', 'no_entregado') NOT NULL DEFAULT 'pendiente',
            fecha_entrega DATETIME NULL,
            observaciones TEXT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hoja_ruta (hoja_ruta_id),
            INDEX idx_pedido (pedido_id),
            INDEX idx_cliente (cliente_id),
            INDEX idx_orden (hoja_ruta_id, orden_secuencia),
            FOREIGN KEY (hoja_ruta_id) REFERENCES hojas_de_rutas(id) ON DELETE CASCADE,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            UNIQUE KEY unique_hoja_pedido (hoja_ruta_id, pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    logMessage('✓ Tabla hoja_ruta_pedidos verificada', 'success');
    
    // 6. Agregar columnas a la tabla pedidos
    logMessage('Verificando columnas en tabla pedidos...', 'info');
    $columns = $pdo->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('camion_id', $columns)) {
        $pdo->exec("ALTER TABLE pedidos ADD COLUMN camion_id INT NULL AFTER vendedor_id");
        $pdo->exec("CREATE INDEX idx_camion ON pedidos(camion_id)");
        logMessage('✓ Columna camion_id agregada a pedidos', 'success');
    }
    
    if (!in_array('placa_camion', $columns)) {
        $pdo->exec("ALTER TABLE pedidos ADD COLUMN placa_camion VARCHAR(20) NULL AFTER camion_id");
        $pdo->exec("CREATE INDEX idx_placa_camion_pedidos ON pedidos(placa_camion)");
        logMessage('✓ Columna placa_camion agregada a pedidos', 'success');
    }
    logMessage('✓ Tabla pedidos verificada', 'success');
    
    logMessage('', 'info');
    logMessage('========================================', 'success');
    logMessage('✓ Migración completada exitosamente', 'success');
    logMessage('========================================', 'success');
    
} catch (PDOException $e) {
    logMessage('✗ Error de base de datos: ' . $e->getMessage(), 'error');
} catch (Exception $e) {
    logMessage('✗ Error: ' . $e->getMessage(), 'error');
}

// Mostrar resultados
if ($isCLI) {
    foreach ($output as $item) {
        echo $item['message'] . PHP_EOL;
    }
} else {
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Migración de Base de Datos</title>';
    echo '<style>body{font-family:Arial;padding:20px;background:#f5f5f5;}';
    echo '.container{max-width:800px;margin:0 auto;background:white;padding:20px;border-radius:5px;}';
    echo '.success{color:#28a745;}.error{color:#dc3545;}.warning{color:#ffc107;}.info{color:#17a2b8;}';
    echo 'h1{color:#333;}</style></head><body><div class="container"><h1>Migración de Base de Datos</h1>';
    foreach ($output as $item) {
        $class = $item['type'];
        echo '<div class="' . $class . '">' . htmlspecialchars($item['message']) . '</div>';
    }
    echo '</div></body></html>';
}
exit();
?>

