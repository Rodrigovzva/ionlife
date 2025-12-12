<?php
/**
 * Test simple de conexión
 */

$host = '10.0.0.3';
$db = 'ionica';
$user = 'root';
$pass = 'root';

echo "Intentando conectar a MySQL...\n";
echo "Host: $host\n";
echo "Base de datos: $db\n";
echo "Usuario: $user\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✓ Conexión exitosa!\n\n";
    
    // Verificar usuarios
    $stmt = $pdo->query("SELECT id, username, email, activo FROM usuarios LIMIT 5");
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Usuarios encontrados:\n";
    foreach ($usuarios as $u) {
        echo "  - ID: {$u['id']}, Username: {$u['username']}, Email: {$u['email']}, Activo: {$u['activo']}\n";
    }
    
    // Probar login
    echo "\nProbando login con admin/password:\n";
    $stmt = $pdo->prepare("SELECT id, username, password FROM usuarios WHERE username = 'admin' AND activo = 1");
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin) {
        echo "✓ Usuario admin encontrado\n";
        echo "Password hash: " . substr($admin['password'], 0, 30) . "...\n";
        
        $testPass = 'password';
        $verify1 = ($testPass === $admin['password']);
        $verify2 = password_verify($testPass, $admin['password']);
        
        echo "Comparación directa: " . ($verify1 ? "✓" : "✗") . "\n";
        echo "password_verify: " . ($verify2 ? "✓" : "✗") . "\n";
        
        if (!$verify1 && !$verify2) {
            echo "\n⚠ La contraseña no coincide. Actualizando...\n";
            $newHash = password_hash('password', PASSWORD_DEFAULT);
            $update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'admin'");
            $update->execute([$newHash]);
            echo "✓ Contraseña actualizada\n";
        }
    } else {
        echo "✗ Usuario admin no encontrado\n";
    }
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

?>



