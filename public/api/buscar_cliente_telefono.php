<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos',
        'clientes' => []
    ]);
    exit();
}

try {
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    if (empty($search)) {
        echo json_encode([
            'success' => true,
            'results' => []
        ]);
        exit();
    }
    
    // Buscar clientes por teléfono principal
    $stmt = $pdo->prepare("
        SELECT id, nombre, apellido, CONCAT(nombre, ' ', apellido) as nombre_completo, 
               telefono_principal, telefono_secundario, correo, tipo_cliente, zona, direccion
        FROM clientes 
        WHERE estado = 'activo' 
        AND telefono_principal LIKE :search
        ORDER BY nombre, apellido
        LIMIT 20
    ");
    
    $stmt->execute([':search' => '%' . $search . '%']);
    $clientes = $stmt->fetchAll();
    
    $results = [];
    foreach ($clientes as $cliente) {
        $results[] = [
            'id' => $cliente['id'],
            'text' => $cliente['telefono_principal'] . ' - ' . $cliente['nombre_completo'],
            'nombre_completo' => $cliente['nombre_completo'],
            'telefono_principal' => $cliente['telefono_principal'],
            'telefono_secundario' => $cliente['telefono_secundario'],
            'correo' => $cliente['correo'],
            'zona' => $cliente['zona'],
            'direccion' => $cliente['direccion']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'results' => $results
    ]);

} catch (PDOException $e) {
    error_log("Error al buscar clientes: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al buscar clientes',
        'results' => []
    ]);
}
?>

