<?php
/**
 * Script para verificar que todas las tablas existan
 */

require_once 'config.php';

echo "=== Verificación de Tablas ===\n\n";

$pdo = getDBConnection();

if (!$pdo) {
    echo "✗ Error de conexión\n";
    exit(1);
}

$tablasRequeridas = [
    'usuarios',
    'clientes',
    'productos',
    'ventas'
];

$tablasExistentes = [];
$stmt = $pdo->query("SHOW TABLES");
$resultados = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($resultados as $tabla) {
    $tablasExistentes[] = $tabla;
}

echo "Tablas encontradas: " . implode(', ', $tablasExistentes) . "\n\n";

foreach ($tablasRequeridas as $tabla) {
    if (in_array($tabla, $tablasExistentes)) {
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM $tabla");
        $result = $stmt->fetch();
        echo "✓ $tabla existe (" . $result['total'] . " registros)\n";
    } else {
        echo "✗ $tabla NO existe\n";
    }
}

echo "\n=== Verificación de Campos de Productos ===\n";
$stmt = $pdo->query("DESCRIBE productos");
$campos = $stmt->fetchAll(PDO::FETCH_COLUMN);

$camposRequeridos = ['stock_actual', 'stock_minimo', 'ubicacion_almacen'];
foreach ($camposRequeridos as $campo) {
    if (in_array($campo, $campos)) {
        echo "✓ Campo $campo existe\n";
    } else {
        echo "✗ Campo $campo NO existe\n";
    }
}

echo "\n✓ Verificación completada\n";

?>



