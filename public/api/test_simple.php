<?php
// Test simple sin headers JSON
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Test de Conexión Simple</h1>";

$host = '10.0.0.3';
$db = 'ionica';
$user = 'root';
$pass = 'root';

echo "<p>Intentando conectar a: $host</p>";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p style='color:green;'>✓ Conexión exitosa!</p>";
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
    $result = $stmt->fetch();
    echo "<p>Usuarios en la base de datos: " . $result['total'] . "</p>";
    
} catch (PDOException $e) {
    echo "<p style='color:red;'>✗ Error: " . $e->getMessage() . "</p>";
    
    // Probar con el contenedor db
    echo "<p>Probando con contenedor 'db'...</p>";
    try {
        $pdo2 = new PDO("mysql:host=db;dbname=ionica;charset=utf8mb4", 'root', 'root');
        $pdo2->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "<p style='color:green;'>✓ Conexión exitosa con contenedor 'db'!</p>";
    } catch (PDOException $e2) {
        echo "<p style='color:red;'>✗ Error con contenedor: " . $e2->getMessage() . "</p>";
    }
}

?>



