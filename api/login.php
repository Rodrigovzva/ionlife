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

$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$remember = isset($input['remember']) && $input['remember'] === true;

// Validar campos
if (empty($username) || empty($password)) {
    echo json_encode([
        'success' => false,
        'message' => 'Usuario y contraseña son requeridos'
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
    // Buscar usuario en la base de datos
    // Nota: En producción, la contraseña debe estar hasheada con password_hash()
    $stmt = $pdo->prepare("
        SELECT id, username, email, password, nombre, activo 
        FROM usuarios 
        WHERE (username = :username OR email = :username) AND activo = 1
        LIMIT 1
    ");
    
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if ($user) {
        // Verificar contraseña
        // En producción usar: password_verify($password, $user['password'])
        // Por ahora, comparación simple para desarrollo
        if ($password === $user['password'] || password_verify($password, $user['password'])) {
            // Login exitoso
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nombre'] = $user['nombre'] ?? $user['username'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['logged_in'] = true;
            $_SESSION['login_time'] = time();

            // Si "recordarme" está activado, extender la sesión
            if ($remember) {
                ini_set('session.cookie_lifetime', 86400 * 30); // 30 días
            }

            echo json_encode([
                'success' => true,
                'message' => 'Login exitoso',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'nombre' => $user['nombre'] ?? $user['username']
                ]
            ]);
        } else {
            // Contraseña incorrecta
            echo json_encode([
                'success' => false,
                'message' => 'Usuario o contraseña incorrectos'
            ]);
        }
    } else {
        // Usuario no encontrado
        echo json_encode([
            'success' => false,
            'message' => 'Usuario o contraseña incorrectos'
        ]);
    }
} catch (PDOException $e) {
    error_log("Error en login: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor. Por favor, intenta más tarde.'
    ]);
}
?>

