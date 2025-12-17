<?php
ob_start();
require_once 'config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    if (!$pdo) {
        throw new Exception('Error de conexión a la base de datos');
    }

    $clienteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($clienteId <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'ID de cliente no válido'
        ]);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT 
            id, nombre, apellido, telefono_principal, telefono_secundario,
            correo, direccion, zona, latitud, longitud, tipo_cliente,
            negocio_razon_social, nit, notas, estado, vendedor_asignado
        FROM clientes
        WHERE id = ?
    ");
    
    $stmt->execute([$clienteId]);
    $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$cliente) {
        echo json_encode([
            'success' => false,
            'message' => 'Cliente no encontrado'
        ]);
        exit();
    }
    
    echo json_encode([
        'success' => true,
        'cliente' => $cliente
    ]);

} catch (Exception $e) {
    error_log("Error en get_cliente.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener cliente: ' . $e->getMessage()
    ]);
}
exit();
?>

