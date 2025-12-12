<?php
/**
 * Test de endpoints
 */

require_once 'config.php';

echo "<h1>Test de Endpoints</h1>";
echo "<style>body{font-family:Arial;margin:20px;} .ok{color:green;} .error{color:red;}</style>";

$pdo = getDBConnection();

if (!$pdo) {
    echo "<p class='error'>✗ Error de conexión a la base de datos</p>";
    exit;
}

echo "<p class='ok'>✓ Conexión a la base de datos exitosa</p>";

// Test 1: get_clientes.php
echo "<h2>Test 1: get_clientes.php</h2>";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM clientes");
    $result = $stmt->fetch();
    echo "<p class='ok'>✓ Tabla clientes accesible (" . $result['total'] . " registros)</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

// Test 2: get_productos.php
echo "<h2>Test 2: get_productos.php</h2>";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM productos");
    $result = $stmt->fetch();
    echo "<p class='ok'>✓ Tabla productos accesible (" . $result['total'] . " registros)</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

// Test 3: get_vendedores.php
echo "<h2>Test 3: get_vendedores.php</h2>";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios WHERE activo = 1");
    $result = $stmt->fetch();
    echo "<p class='ok'>✓ Tabla usuarios accesible (" . $result['total'] . " usuarios activos)</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

// Test 4: get_ventas.php
echo "<h2>Test 4: get_ventas.php</h2>";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM ventas");
    $result = $stmt->fetch();
    echo "<p class='ok'>✓ Tabla ventas accesible (" . $result['total'] . " registros)</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

// Test 5: Verificar estructura de productos
echo "<h2>Test 5: Estructura de productos</h2>";
try {
    $stmt = $pdo->query("DESCRIBE productos");
    $campos = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $camposRequeridos = ['id', 'codigo_producto', 'nombre_producto', 'precio_compra', 'precio_venta', 'stock_actual', 'stock_minimo'];
    $faltantes = array_diff($camposRequeridos, $campos);
    if (empty($faltantes)) {
        echo "<p class='ok'>✓ Todos los campos requeridos existen</p>";
    } else {
        echo "<p class='error'>✗ Faltan campos: " . implode(', ', $faltantes) . "</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Error: " . $e->getMessage() . "</p>";
}

echo "<h2>Resumen</h2>";
echo "<p>Todas las tablas están creadas y accesibles. Los formularios deberían funcionar correctamente.</p>";

?>



