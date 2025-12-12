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
$required = ['nombre', 'username', 'email', 'password', 'confirm_password', 'rol', 'estado'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        echo json_encode([
            'success' => false,
            'message' => "El campo " . str_replace('_', ' ', $field) . " es requerido"
        ]);
        exit();
    }
}

// Validar que las contraseñas coincidan
if ($input['password'] !== $input['confirm_password']) {
    echo json_encode([
        'success' => false,
        'message' => 'Las contraseñas no coinciden'
    ]);
    exit();
}

// Validar longitud mínima de contraseña
if (strlen($input['password']) < 6) {
    echo json_encode([
        'success' => false,
        'message' => 'La contraseña debe tener al menos 6 caracteres'
    ]);
    exit();
}

// Validar formato de username (solo letras, números y guiones bajos)
if (!preg_match('/^[a-zA-Z0-9_]+$/', $input['username'])) {
    echo json_encode([
        'success' => false,
        'message' => 'El nombre de usuario solo puede contener letras, números y guiones bajos'
    ]);
    exit();
}

// Validar formato de email
if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'message' => 'El correo electrónico no es válido'
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
    // Verificar si el username ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = :username");
    $stmt->execute([':username' => trim($input['username'])]);
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El nombre de usuario ya está en uso'
        ]);
        exit();
    }

    // Verificar si el email ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email");
    $stmt->execute([':email' => trim($input['email'])]);
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El correo electrónico ya está registrado'
        ]);
        exit();
    }

    // Hashear la contraseña
    $passwordHash = password_hash($input['password'], PASSWORD_DEFAULT);

    // Verificar qué campos existen en la tabla
    $stmt = $pdo->query("DESCRIBE usuarios");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $columnMap = array_flip($columns);

    // Construir consulta dinámicamente según los campos disponibles
    $fields = ['nombre', 'username', 'email', 'password', 'activo'];
    $values = [':nombre', ':username', ':email', ':password', ':activo'];
    $params = [
        ':nombre' => trim($input['nombre']),
        ':username' => trim($input['username']),
        ':email' => trim($input['email']),
        ':password' => $passwordHash,
        ':activo' => intval($input['estado'])
    ];

    // Agregar campos opcionales si existen en la tabla
    $optionalFields = [
        'telefono' => 'telefono',
        'direccion' => 'direccion',
        'ciudad' => 'ciudad',
        'rol' => 'rol',
        'notas' => 'notas'
    ];

    foreach ($optionalFields as $key => $column) {
        if (isset($columnMap[$column]) && !empty($input[$key])) {
            $fields[] = $column;
            $values[] = ':' . $key;
            $params[':' . $key] = trim($input[$key]);
        }
    }

    // Insertar usuario
    $sql = "INSERT INTO usuarios (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $values) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $userId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Usuario registrado correctamente',
        'id' => $userId,
        'username' => $input['username']
    ]);

} catch (PDOException $e) {
    error_log("Error al guardar usuario: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el usuario: ' . $e->getMessage()
    ]);
}
?>

