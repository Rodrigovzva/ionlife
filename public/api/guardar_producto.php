<?php
require_once 'config.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Obtener datos (puede venir como FormData o JSON)
$input = $_POST;
$imagenNombre = null;

// Procesar imagen si existe
if (isset($_FILES['imagen_producto']) && $_FILES['imagen_producto']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['imagen_producto'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $maxSize = 2 * 1024 * 1024; // 2MB
    
    // Validar tipo de archivo
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode([
            'success' => false,
            'message' => 'Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, GIF o WEBP'
        ]);
        exit();
    }
    
    // Validar tamaño
    if ($file['size'] > $maxSize) {
        echo json_encode([
            'success' => false,
            'message' => 'La imagen es demasiado grande. Máximo 2MB'
        ]);
        exit();
    }
    
    // Crear directorio si no existe
    $uploadDir = __DIR__ . '/../assets/img/productos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Generar nombre único para la imagen
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $imagenNombre = 'producto_' . time() . '_' . uniqid() . '.' . $extension;
    $uploadPath = $uploadDir . $imagenNombre;
    
    // Mover archivo
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al subir la imagen'
        ]);
        exit();
    }
    
    $imagenNombre = 'assets/img/productos/' . $imagenNombre;
}

// Validar campos requeridos
$required = ['codigo_producto', 'nombre_producto', 'precio_compra', 'precio_venta', 'estado'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        echo json_encode([
            'success' => false,
            'message' => "El campo " . str_replace('_', ' ', $field) . " es requerido"
        ]);
        exit();
    }
}

// Validar que precio de venta sea mayor o igual al precio de compra
if (floatval($input['precio_venta']) < floatval($input['precio_compra'])) {
    echo json_encode([
        'success' => false,
        'message' => 'El precio de venta debe ser mayor o igual al precio de compra'
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
    // Verificar si el código de producto ya existe
    $stmt = $pdo->prepare("SELECT id FROM productos WHERE codigo_producto = :codigo");
    $stmt->execute([':codigo' => trim($input['codigo_producto'])]);
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El código de producto ya está registrado'
        ]);
        exit();
    }

    // Insertar producto
    $stmt = $pdo->prepare("
        INSERT INTO productos (
            codigo_producto, nombre_producto, tamano, precio_compra, precio_venta,
            precio_mayorista, proveedor, fecha_vencimiento, imagen_producto,
            estado, notas
        ) VALUES (
            :codigo_producto, :nombre_producto, :tamano, :precio_compra, :precio_venta,
            :precio_mayorista, :proveedor, :fecha_vencimiento, :imagen_producto,
            :estado, :notas
        )
    ");

    $stmt->execute([
        ':codigo_producto' => trim($input['codigo_producto']),
        ':nombre_producto' => trim($input['nombre_producto']),
        ':tamano' => !empty($input['tamano']) ? floatval($input['tamano']) : null,
        ':precio_compra' => floatval($input['precio_compra']),
        ':precio_venta' => floatval($input['precio_venta']),
        ':precio_mayorista' => !empty($input['precio_mayorista']) ? floatval($input['precio_mayorista']) : null,
        ':proveedor' => !empty($input['proveedor']) ? trim($input['proveedor']) : null,
        ':fecha_vencimiento' => !empty($input['fecha_vencimiento']) ? $input['fecha_vencimiento'] : null,
        ':imagen_producto' => $imagenNombre,
        ':estado' => $input['estado'],
        ':notas' => !empty($input['notas']) ? trim($input['notas']) : null
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Producto registrado correctamente',
        'id' => $pdo->lastInsertId(),
        'codigo' => $input['codigo_producto']
    ]);

} catch (PDOException $e) {
    error_log("Error al guardar producto: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al guardar el producto: ' . $e->getMessage()
    ]);
}
?>

