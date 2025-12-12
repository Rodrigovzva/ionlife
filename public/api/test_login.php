<?php
/**
 * Script de diagnóstico para el login
 */

require_once 'config.php';

echo "<h2>Diagnóstico de Login</h2>";

// 1. Verificar conexión a la base de datos
echo "<h3>1. Conexión a la base de datos</h3>";
$pdo = getDBConnection();
if ($pdo) {
    echo "✓ Conexión exitosa<br>";
    echo "Base de datos: " . DB_NAME . "<br>";
    echo "Host: " . DB_HOST . "<br>";
} else {
    echo "✗ Error de conexión<br>";
    exit;
}

// 2. Verificar si existe la tabla usuarios
echo "<h3>2. Verificar tabla usuarios</h3>";
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'usuarios'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Tabla usuarios existe<br>";
    } else {
        echo "✗ Tabla usuarios NO existe<br>";
        exit;
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "<br>";
    exit;
}

// 3. Verificar usuarios en la base de datos
echo "<h3>3. Usuarios en la base de datos</h3>";
try {
    $stmt = $pdo->query("SELECT id, username, email, activo, LENGTH(password) as pass_length FROM usuarios");
    $usuarios = $stmt->fetchAll();
    
    if (count($usuarios) > 0) {
        echo "✓ Se encontraron " . count($usuarios) . " usuarios:<br>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Username</th><th>Email</th><th>Activo</th><th>Longitud Password</th></tr>";
        foreach ($usuarios as $user) {
            echo "<tr>";
            echo "<td>" . $user['id'] . "</td>";
            echo "<td>" . $user['username'] . "</td>";
            echo "<td>" . $user['email'] . "</td>";
            echo "<td>" . ($user['activo'] ? 'Sí' : 'No') . "</td>";
            echo "<td>" . $user['pass_length'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "✗ No hay usuarios en la base de datos<br>";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "<br>";
}

// 4. Probar login con admin/password
echo "<h3>4. Probar login con admin/password</h3>";
$username = 'admin';
$password = 'password';

try {
    $stmt = $pdo->prepare("
        SELECT id, username, email, password, nombre, activo 
        FROM usuarios 
        WHERE (username = :username OR email = :email) AND activo = 1
        LIMIT 1
    ");
    
    $stmt->execute([
        ':username' => $username,
        ':email' => $username
    ]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "✓ Usuario encontrado: " . $user['username'] . "<br>";
        echo "Password hash (primeros 20 chars): " . substr($user['password'], 0, 20) . "...<br>";
        
        // Probar verificación
        $verify1 = ($password === $user['password']);
        $verify2 = password_verify($password, $user['password']);
        
        echo "Comparación directa (password === hash): " . ($verify1 ? "✓" : "✗") . "<br>";
        echo "password_verify(): " . ($verify2 ? "✓" : "✗") . "<br>";
        
        if ($verify1 || $verify2) {
            echo "<strong style='color: green;'>✓ Login debería funcionar</strong><br>";
        } else {
            echo "<strong style='color: red;'>✗ Login NO funcionará con esta contraseña</strong><br>";
            echo "<br>Generando nuevo hash para 'password':<br>";
            $newHash = password_hash('password', PASSWORD_DEFAULT);
            echo "Nuevo hash: " . $newHash . "<br>";
            echo "<br>Para actualizar, ejecuta:<br>";
            echo "<code>UPDATE usuarios SET password = '" . $newHash . "' WHERE username = 'admin';</code><br>";
        }
    } else {
        echo "✗ Usuario no encontrado<br>";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "<br>";
}

// 5. Verificar sesiones
echo "<h3>5. Configuración de sesiones</h3>";
echo "session_status(): " . session_status() . " (2 = activa)<br>";
echo "session_save_path(): " . session_save_path() . "<br>";

?>



