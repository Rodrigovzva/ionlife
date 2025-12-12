<?php
/**
 * Script para arreglar la contraseña del admin
 * Intenta conectar y actualizar la contraseña
 */

// Intentar diferentes configuraciones
$configs = [
    ['host' => '10.0.0.3', 'db' => 'ionica', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'db', 'db' => 'ionica', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'localhost', 'db' => 'ionica', 'user' => 'root', 'pass' => ''],
];

$newPassword = 'password';
$newHash = password_hash($newPassword, PASSWORD_DEFAULT);

echo "Intentando actualizar contraseña del admin...\n\n";

foreach ($configs as $config) {
    echo "Probando: {$config['host']} / {$config['db']} / {$config['user']}\n";
    
    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4",
            $config['user'],
            $config['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        echo "✓ Conexión exitosa!\n";
        
        // Actualizar contraseña del admin
        $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'admin'");
        $stmt->execute([$newHash]);
        
        echo "✓ Contraseña del admin actualizada a: 'password'\n";
        echo "Hash: $newHash\n\n";
        
        // Verificar
        $stmt = $pdo->prepare("SELECT username, password FROM usuarios WHERE username = 'admin'");
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($admin && password_verify($newPassword, $admin['password'])) {
            echo "✓ Verificación exitosa: La contraseña 'password' funciona correctamente\n";
        }
        
        // También actualizar vendedor
        $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'vendedor'");
        $stmt->execute([$newHash]);
        echo "✓ Contraseña del vendedor también actualizada\n";
        
        break;
        
    } catch (PDOException $e) {
        echo "✗ Error: " . $e->getMessage() . "\n\n";
        continue;
    }
}

echo "\n=== Instrucciones ===\n";
echo "Si ninguna conexión funcionó, verifica:\n";
echo "1. Que el servidor MySQL esté corriendo\n";
echo "2. Que las credenciales en config.local.php sean correctas\n";
echo "3. Que puedas acceder a phpMyAdmin en http://10.0.0.3:8080/\n";
echo "\nPara actualizar manualmente desde phpMyAdmin, ejecuta:\n";
echo "UPDATE usuarios SET password = '$newHash' WHERE username = 'admin';\n";

?>



