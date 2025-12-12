<?php
require_once 'config.php';

$pdo = getDBConnection();

if (!$pdo) {
    die("Error de conexión a la base de datos\n");
}

try {
    echo "=== Actualizando tabla productos ===\n\n";
    
    // Verificar si el campo marca existe
    $stmt = $pdo->query("DESCRIBE productos");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (in_array('marca', $columns)) {
        echo "1. Cambiando campo 'marca' por 'tamano'...\n";
        $pdo->exec("ALTER TABLE productos CHANGE COLUMN marca tamano DECIMAL(10, 2) NULL");
        echo "   ✓ Campo actualizado correctamente\n\n";
    } elseif (in_array('tamano', $columns)) {
        echo "✓ El campo 'tamano' ya existe\n\n";
    } else {
        echo "⚠ No se encontró el campo 'marca'. Agregando campo 'tamano'...\n";
        $pdo->exec("ALTER TABLE productos ADD COLUMN tamano DECIMAL(10, 2) NULL");
        echo "   ✓ Campo 'tamano' agregado\n\n";
    }
    
    // Verificar estructura
    echo "=== Verificación ===\n";
    $stmt = $pdo->query("DESCRIBE productos");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        if ($col['Field'] === 'tamano' || $col['Field'] === 'marca') {
            echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
        }
    }
    
    echo "\n✓ Tabla actualizada exitosamente!\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>

