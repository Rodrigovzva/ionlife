<?php
/**
 * Script para verificar y arreglar la conexión MySQL y la contraseña del admin
 */

echo "=== Verificación de MySQL y Contraseña Admin ===\n\n";

// Configuración
$hosts = [
    ['host' => '10.0.0.3', 'db' => 'ionica', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'db', 'db' => 'ionica', 'user' => 'root', 'pass' => 'root'],
];

$passwordAdmin = 'password';
$newHash = password_hash($passwordAdmin, PASSWORD_DEFAULT);

foreach ($hosts as $config) {
    echo "Probando conexión a: {$config['host']}...\n";
    
    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4",
            $config['user'],
            $config['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5
            ]
        );
        
        echo "✓ Conexión exitosa a {$config['host']}!\n\n";
        
        // Verificar si existe el usuario admin
        $stmt = $pdo->query("SELECT id, username, email, activo FROM usuarios WHERE username = 'admin'");
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($admin) {
            echo "✓ Usuario admin encontrado\n";
            echo "  - ID: {$admin['id']}\n";
            echo "  - Username: {$admin['username']}\n";
            echo "  - Email: {$admin['email']}\n";
            echo "  - Activo: " . ($admin['activo'] ? 'Sí' : 'No') . "\n\n";
            
            // Actualizar contraseña
            echo "Actualizando contraseña del admin a 'password'...\n";
            $update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'admin'");
            $update->execute([$newHash]);
            echo "✓ Contraseña actualizada\n\n";
            
            // Verificar que funciona
            $stmt = $pdo->query("SELECT password FROM usuarios WHERE username = 'admin'");
            $passData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (password_verify($passwordAdmin, $passData['password'])) {
                echo "✓ Verificación exitosa: La contraseña 'password' funciona correctamente\n";
            } else {
                echo "✗ Error: La verificación falló\n";
            }
            
            // También actualizar vendedor
            $update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'vendedor'");
            $update->execute([$newHash]);
            echo "✓ Contraseña del vendedor también actualizada\n\n";
            
            echo "=== RESUMEN ===\n";
            echo "Usuario: admin\n";
            echo "Contraseña: password\n";
            echo "Estado: ✓ Listo para usar\n";
            
            break;
            
        } else {
            echo "✗ Usuario admin no encontrado\n";
            echo "Creando usuario admin...\n";
            
            $insert = $pdo->prepare("
                INSERT INTO usuarios (username, email, password, nombre, activo) 
                VALUES ('admin', 'admin@ionica.com', ?, 'Administrador', 1)
            ");
            $insert->execute([$newHash]);
            echo "✓ Usuario admin creado con contraseña 'password'\n";
            break;
        }
        
    } catch (PDOException $e) {
        echo "✗ Error: " . $e->getMessage() . "\n\n";
        continue;
    }
}

echo "\n=== Si ninguna conexión funcionó ===\n";
echo "1. Verifica que el servidor MySQL esté corriendo\n";
echo "2. Verifica que puedas acceder a phpMyAdmin en http://10.0.0.3:8080/\n";
echo "3. Desde phpMyAdmin, ejecuta manualmente:\n";
echo "   UPDATE usuarios SET password = '$newHash' WHERE username = 'admin';\n";
echo "   UPDATE usuarios SET password = '$newHash' WHERE username = 'vendedor';\n";

?>



