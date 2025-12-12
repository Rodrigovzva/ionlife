<?php
/**
 * Diagnóstico completo de conexión a la base de datos
 * Acceder desde: http://localhost:4000/api/diagnostico_conexion.php
 */

// No usar config.php para evitar problemas de headers
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Diagnóstico de Conexión a Base de Datos</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .ok { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .info { color: blue; }
    table { border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
</style>";

// Cargar configuración
$configs = [];

// Intentar cargar config.local.php
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
    $configs[] = [
        'name' => 'config.local.php',
        'host' => defined('DB_HOST_LOCAL') ? DB_HOST_LOCAL : '10.0.0.3',
        'db' => defined('DB_NAME_LOCAL') ? DB_NAME_LOCAL : 'ionica',
        'user' => defined('DB_USER_LOCAL') ? DB_USER_LOCAL : 'root',
        'pass' => defined('DB_PASS_LOCAL') ? DB_PASS_LOCAL : 'root'
    ];
}

// Variables de entorno
$configs[] = [
    'name' => 'Variables de entorno',
    'host' => getenv('DB_HOST') ?: '10.0.0.3',
    'db' => getenv('DB_NAME') ?: 'ionica',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: 'root'
];

// Configuración por defecto
$configs[] = [
    'name' => 'Valores por defecto',
    'host' => '10.0.0.3',
    'db' => 'ionica',
    'user' => 'root',
    'pass' => 'root'
];

// También probar con el contenedor db
$configs[] = [
    'name' => 'Contenedor Docker (db)',
    'host' => 'db',
    'db' => 'ionica',
    'user' => 'root',
    'pass' => 'root'
];

echo "<h2>Configuraciones a probar:</h2>";
echo "<table>";
echo "<tr><th>Fuente</th><th>Host</th><th>Base de Datos</th><th>Usuario</th><th>Contraseña</th></tr>";
foreach ($configs as $cfg) {
    echo "<tr>";
    echo "<td>{$cfg['name']}</td>";
    echo "<td>{$cfg['host']}</td>";
    echo "<td>{$cfg['db']}</td>";
    echo "<td>{$cfg['user']}</td>";
    echo "<td>" . (empty($cfg['pass']) ? '(vacía)' : '***') . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h2>Resultados de las pruebas:</h2>";

$conexionExitosa = false;

foreach ($configs as $cfg) {
    echo "<h3>Probando: {$cfg['name']}</h3>";
    echo "<p><strong>Host:</strong> {$cfg['host']}<br>";
    echo "<strong>Base de datos:</strong> {$cfg['db']}<br>";
    echo "<strong>Usuario:</strong> {$cfg['user']}</p>";
    
    try {
        $dsn = "mysql:host={$cfg['host']};dbname={$cfg['db']};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ];
        
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
        
        echo "<p class='ok'>✓ Conexión exitosa!</p>";
        
        // Verificar tabla usuarios
        $stmt = $pdo->query("SHOW TABLES LIKE 'usuarios'");
        if ($stmt->rowCount() > 0) {
            echo "<p class='ok'>✓ Tabla 'usuarios' existe</p>";
            
            // Verificar usuarios
            $stmt = $pdo->query("SELECT id, username, email, activo FROM usuarios");
            $usuarios = $stmt->fetchAll();
            
            if (count($usuarios) > 0) {
                echo "<p class='ok'>✓ Se encontraron " . count($usuarios) . " usuarios:</p>";
                echo "<table>";
                echo "<tr><th>ID</th><th>Username</th><th>Email</th><th>Activo</th></tr>";
                foreach ($usuarios as $u) {
                    echo "<tr>";
                    echo "<td>{$u['id']}</td>";
                    echo "<td>{$u['username']}</td>";
                    echo "<td>{$u['email']}</td>";
                    echo "<td>" . ($u['activo'] ? 'Sí' : 'No') . "</td>";
                    echo "</tr>";
                }
                echo "</table>";
                
                // Verificar y actualizar contraseña del admin
                $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE username = 'admin'");
                $stmt->execute();
                $admin = $stmt->fetch();
                
                if ($admin) {
                    $testPass = 'password';
                    $newHash = password_hash($testPass, PASSWORD_DEFAULT);
                    
                    if (!password_verify($testPass, $admin['password'])) {
                        echo "<p class='info'>Actualizando contraseña del admin...</p>";
                        $update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'admin'");
                        $update->execute([$newHash]);
                        echo "<p class='ok'>✓ Contraseña del admin actualizada a 'password'</p>";
                    } else {
                        echo "<p class='ok'>✓ La contraseña del admin ya está correcta</p>";
                    }
                }
            } else {
                echo "<p class='error'>✗ No hay usuarios en la base de datos</p>";
            }
        } else {
            echo "<p class='error'>✗ La tabla 'usuarios' no existe</p>";
        }
        
        $conexionExitosa = true;
        echo "<p class='ok'><strong>✓ Esta configuración funciona correctamente!</strong></p>";
        echo "<p class='info'>Actualiza config.local.php con estos valores:</p>";
        echo "<pre>";
        echo "define('DB_HOST_LOCAL', '{$cfg['host']}');\n";
        echo "define('DB_NAME_LOCAL', '{$cfg['db']}');\n";
        echo "define('DB_USER_LOCAL', '{$cfg['user']}');\n";
        echo "define('DB_PASS_LOCAL', '{$cfg['pass']}');\n";
        echo "</pre>";
        break;
        
    } catch (PDOException $e) {
        echo "<p class='error'>✗ Error: " . htmlspecialchars($e->getMessage()) . "</p>";
        
        // Mensajes de ayuda según el error
        if (strpos($e->getMessage(), '2006') !== false || strpos($e->getMessage(), 'gone away') !== false) {
            echo "<p class='info'>El servidor MySQL no está respondiendo. Verifica que esté corriendo.</p>";
        } elseif (strpos($e->getMessage(), 'Access denied') !== false) {
            echo "<p class='info'>Credenciales incorrectas. Verifica usuario y contraseña.</p>";
        } elseif (strpos($e->getMessage(), 'Unknown database') !== false) {
            echo "<p class='info'>La base de datos no existe. Ejecuta crear_base_datos.php primero.</p>";
        } elseif (strpos($e->getMessage(), 'Connection refused') !== false || strpos($e->getMessage(), 'No route to host') !== false) {
            echo "<p class='info'>No se puede conectar al servidor. Verifica que el host sea correcto y accesible.</p>";
        }
    }
    
    echo "<hr>";
}

if (!$conexionExitosa) {
    echo "<h2 class='error'>No se pudo establecer ninguna conexión</h2>";
    echo "<h3>Pasos para solucionar:</h3>";
    echo "<ol>";
    echo "<li>Verifica que el servidor MySQL esté corriendo</li>";
    echo "<li>Verifica que puedas acceder a phpMyAdmin en http://10.0.0.3:8080/</li>";
    echo "<li>Si usas un servidor MySQL externo, verifica que sea accesible desde el contenedor</li>";
    echo "<li>Si usas el contenedor Docker, verifica que esté corriendo: <code>docker-compose ps</code></li>";
    echo "<li>Actualiza las credenciales en <code>public/api/config.local.php</code></li>";
    echo "</ol>";
}

?>



