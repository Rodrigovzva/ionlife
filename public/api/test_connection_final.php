<?php
require_once 'config.php';

echo "Probando conexión...\n";

$pdo = getDBConnection();

if ($pdo) {
    echo "✓ Conexión exitosa!\n";
    echo "Host: " . DB_HOST . "\n";
    echo "Base de datos: " . DB_NAME . "\n\n";
    
    // Verificar usuarios
    $stmt = $pdo->query("SELECT id, username, email, activo FROM usuarios");
    $usuarios = $stmt->fetchAll();
    
    echo "Usuarios encontrados: " . count($usuarios) . "\n";
    foreach ($usuarios as $u) {
        echo "  - {$u['username']} ({$u['email']}) - " . ($u['activo'] ? 'Activo' : 'Inactivo') . "\n";
    }
    
    // Probar login
    echo "\nProbando login con admin/password:\n";
    $stmt = $pdo->prepare("SELECT id, username, password FROM usuarios WHERE username = 'admin' AND activo = 1");
    $stmt->execute();
    $admin = $stmt->fetch();
    
    if ($admin) {
        $testPass = 'password';
        if (password_verify($testPass, $admin['password'])) {
            echo "✓ Login funcionará correctamente con admin/password\n";
        } else {
            echo "✗ La contraseña no coincide. Actualizando...\n";
            $newHash = password_hash($testPass, PASSWORD_DEFAULT);
            $update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE username = 'admin'");
            $update->execute([$newHash]);
            echo "✓ Contraseña actualizada\n";
        }
    }
    
} else {
    echo "✗ Error de conexión\n";
}

?>



