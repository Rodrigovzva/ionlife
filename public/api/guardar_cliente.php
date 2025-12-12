<?php
require_once 'config.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Obtener datos del cuerpo de la petición
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

// Validar campos requeridos
$required = ['nombre_completo', 'numero_ci', 'tipo_cliente', 'estado'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        echo json_encode([
            'success' => false,
            'message' => "El campo " . str_replace('_', ' ', $field) . " es requerido"
        ]);
        exit();
    }
}

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ]);
    exit();
}

try {
    // Verificar si el CI ya existe
    $stmt = $pdo->prepare("SELECT id FROM clientes WHERE numero_ci = :ci");
    $stmt->execute([':ci' => $input['numero_ci']]);
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El número de CI ya está registrado'
        ]);
        exit();
    }

    // Insertar cliente
    $stmt = $pdo->prepare("
        INSERT INTO clientes (
            nombre_completo, numero_ci, telefono_principal, ciudad, direccion,
            correo, latitud, longitud, tipo_cliente, negocio_razon_social,
            nit, notas, estado, vendedor_asignado
        ) VALUES (
            :nombre_completo, :numero_ci, :telefono_principal, :ciudad, :direccion,
            :correo, :latitud, :longitud, :tipo_cliente, :negocio_razon_social,
            :nit, :notas, :estado, :vendedor_asignado
        )
    ");

    $stmt->execute([
        ':nombre_completo' => trim($input['nombre_completo']),
        ':numero_ci' => trim($input['numero_ci']),
        ':telefono_principal' => !empty($input['telefono_principal']) ? trim($input['telefono_principal']) : null,
        ':ciudad' => !empty($input['ciudad']) ? trim($input['ciudad']) : null,
        ':direccion' => !empty($input['direccion']) ? trim($input['direccion']) : null,
        ':correo' => !empty($input['correo']) ? trim($input['correo']) : null,
        ':latitud' => !empty($input['latitud']) ? floatval($input['latitud']) : null,
        ':longitud' => !empty($input['longitud']) ? floatval($input['longitud']) : null,
        ':tipo_cliente' => $input['tipo_cliente'],
        ':negocio_razon_social' => !empty($input['negocio_razon_social']) ? trim($input['negocio_razon_social']) : null,
        ':nit' => !empty($input['nit']) ? trim($input['nit']) : null,
        ':notas' => !empty($input['notas']) ? trim($input['notas']) : null,
        ':estado' => $input['estado'],
        ':vendedor_asignado' => !empty($input['vendedor_asignado']) ? intval($input['vendedor_asignado']) : null
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Cliente registrado correctamente',
        'id' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    error_log("Error al guardar cliente: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el cliente: ' . $e->getMessage()
    ]);
}
?>

