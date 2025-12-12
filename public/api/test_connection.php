<?php
require_once 'config.php';

echo "=== Diagnóstico de Conexión ===\n\n";
echo "Host: " . DB_HOST . "\n";
echo "Base de datos: " . DB_NAME . "\n";
echo "Usuario: " . DB_USER . "\n";
echo "Contraseña: " . (empty(DB_PASS) ? '(vacía)' : '***') . "\n\n";

$pdo = getDBConnection();

if ($pdo) {
    echo "✓ Conexión exitosa!\n\n";
    
    // Verificar si la base de datos existe
    try {
        $stmt = $pdo->query("SELECT DATABASE() as db");
        $result = $stmt->fetch();
        echo "Base de datos actual: " . $result['db'] . "\n";
    } catch (PDOException $e) {
        echo "Error al verificar base de datos: " . $e->getMessage() . "\n";
    }
    
    // Verificar tablas
    try {
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "\nTablas encontradas: " . count($tables) . "\n";
        foreach ($tables as $table) {
            echo "  - $table\n";
        }
    } catch (PDOException $e) {
        echo "Error al listar tablas: " . $e->getMessage() . "\n";
    }
    
    // Verificar usuarios
    try {
        $stmt = $pdo->query("SELECT id, username, nombre FROM usuarios LIMIT 5");
        $users = $stmt->fetchAll();
        echo "\nUsuarios encontrados: " . count($users) . "\n";
        foreach ($users as $user) {
            echo "  - " . $user['username'] . " (" . ($user['nombre'] ?? 'Sin nombre') . ")\n";
        }
    } catch (PDOException $e) {
        echo "Error al listar usuarios: " . $e->getMessage() . "\n";
    }
    
} else {
    echo "✗ Error de conexión\n";
    echo "Verifica:\n";
    echo "1. Que el servidor MySQL esté corriendo en " . DB_HOST . "\n";
    echo "2. Que las credenciales sean correctas\n";
    echo "3. Que el usuario tenga permisos para acceder desde la red\n";
}
?>

