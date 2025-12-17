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

// Validar ID del cliente
if (empty($input['id']) || !is_numeric($input['id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID de cliente no válido'
    ]);
    exit();
}

$clienteId = intval($input['id']);

// Validar campos requeridos
$required = [
    'nombre' => 'Nombre',
    'apellido' => 'Apellido',
    'telefono_principal' => 'Teléfono Principal',
    'direccion' => 'Dirección',
    'zona' => 'Zona',
    'tipo_cliente' => 'Tipo de Cliente',
    'estado' => 'Estado',
    'vendedor_asignado' => 'Vendedor Asignado'
];

foreach ($required as $field => $label) {
    if (empty($input[$field])) {
        echo json_encode([
            'success' => false,
            'message' => "El campo {$label} es requerido"
        ]);
        exit();
    }
}

// Validar ubicación GPS (latitud y longitud)
if (empty($input['latitud']) || empty($input['longitud'])) {
    echo json_encode([
        'success' => false,
        'message' => 'La ubicación GPS es requerida. Por favor, obtenga la ubicación automática o selecciónela en el mapa.'
    ]);
    exit();
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
    // Verificar que el cliente existe
    $stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = ?");
    $stmt->execute([$clienteId]);
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Cliente no encontrado'
        ]);
        exit();
    }

    // Validar que el teléfono principal no esté duplicado (excepto para el cliente actual)
    if (!empty($input['telefono_principal'])) {
        $telefono = trim($input['telefono_principal']);
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE telefono_principal = :telefono AND id != :id");
        $stmt->execute([':telefono' => $telefono, ':id' => $clienteId]);
        if ($stmt->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => 'El teléfono principal ya está registrado para otro cliente.'
            ]);
            exit();
        }
    }

    // Actualizar cliente
    $stmt = $pdo->prepare("
        UPDATE clientes SET
            nombre = :nombre,
            apellido = :apellido,
            telefono_principal = :telefono_principal,
            telefono_secundario = :telefono_secundario,
            direccion = :direccion,
            zona = :zona,
            correo = :correo,
            latitud = :latitud,
            longitud = :longitud,
            tipo_cliente = :tipo_cliente,
            negocio_razon_social = :negocio_razon_social,
            nit = :nit,
            notas = :notas,
            estado = :estado,
            vendedor_asignado = :vendedor_asignado
        WHERE id = :id
    ");

    $stmt->execute([
        ':id' => $clienteId,
        ':nombre' => trim($input['nombre']),
        ':apellido' => trim($input['apellido']),
        ':telefono_principal' => !empty($input['telefono_principal']) ? trim($input['telefono_principal']) : null,
        ':telefono_secundario' => !empty($input['telefono_secundario']) ? trim($input['telefono_secundario']) : null,
        ':direccion' => !empty($input['direccion']) ? trim($input['direccion']) : null,
        ':zona' => !empty($input['zona']) ? trim($input['zona']) : null,
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
        'message' => 'Cliente actualizado correctamente',
        'id' => $clienteId
    ]);

} catch (PDOException $e) {
    error_log("Error al actualizar cliente: " . $e->getMessage());
    
    // Detectar error de teléfono duplicado
    if ($e->getCode() == 23000 || strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'telefono_principal') !== false) {
        echo json_encode([
            'success' => false,
            'message' => 'El teléfono principal ya está registrado para otro cliente.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al actualizar el cliente: ' . $e->getMessage()
        ]);
    }
}
exit();
?>

