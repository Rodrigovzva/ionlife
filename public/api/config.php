<?php
/**
 * Configuración del sistema
 */

// Cargar configuración local si existe (tiene prioridad)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// Configuración de base de datos
// Prioridad: config.local.php > Variables de entorno > Valores por defecto
$dbHost = defined('DB_HOST_LOCAL') ? DB_HOST_LOCAL : (getenv('DB_HOST') !== false ? getenv('DB_HOST') : '10.0.0.3');
$dbName = defined('DB_NAME_LOCAL') ? DB_NAME_LOCAL : (getenv('DB_NAME') !== false ? getenv('DB_NAME') : 'ionica');
$dbUser = defined('DB_USER_LOCAL') ? DB_USER_LOCAL : (getenv('DB_USER') !== false ? getenv('DB_USER') : 'root');
$dbPass = defined('DB_PASS_LOCAL') ? DB_PASS_LOCAL : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

define('DB_HOST', $dbHost);
define('DB_NAME', $dbName);
define('DB_USER', $dbUser);
define('DB_PASS', $dbPass);
define('DB_CHARSET', 'utf8mb4');

// Configuración de sesiones
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Cambiar a 1 en producción con HTTPS

// Iniciar sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Timezone
date_default_timezone_set('America/Mexico_City');

// Conexión a la base de datos
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Error de conexión: " . $e->getMessage());
        return null;
    }
}

// Función para verificar si el usuario está logueado
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Función para obtener el ID del usuario logueado
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

// Función para cerrar sesión
function logout() {
    $_SESSION = array();
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    session_destroy();
}

// Headers para JSON (solo si no se ha enviado output)
if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>

