<?php
/**
 * Script de migración para agregar columnas faltantes a control_produccion
 * Ejecutar una sola vez para actualizar la estructura de la tabla
 */
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

    $pdo->beginTransaction();

    // Verificar si la columna cantidad_disponible existe
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'cantidad_disponible'");
    $existeCantidadDisponible = $stmt->rowCount() > 0;

    // Verificar si la columna estado existe
    $stmt = $pdo->query("SHOW COLUMNS FROM control_produccion LIKE 'estado'");
    $existeEstado = $stmt->rowCount() > 0;

    $alteraciones = [];

    // Agregar cantidad_disponible si no existe
    if (!$existeCantidadDisponible) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN cantidad_disponible INT NOT NULL DEFAULT 0 AFTER litros_producidos");
        // Inicializar cantidad_disponible con cantidad_producida para registros existentes
        $pdo->exec("UPDATE control_produccion SET cantidad_disponible = cantidad_producida WHERE cantidad_disponible = 0");
        $alteraciones[] = 'Columna cantidad_disponible agregada e inicializada';
    }

    // Agregar estado si no existe
    if (!$existeEstado) {
        $pdo->exec("ALTER TABLE control_produccion ADD COLUMN estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible' AFTER cantidad_disponible");
        // Inicializar estado para registros existentes
        $pdo->exec("UPDATE control_produccion SET estado = 'disponible' WHERE estado IS NULL");
        $alteraciones[] = 'Columna estado agregada e inicializada';
    }

    // Agregar índices si no existen
    try {
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_estado ON control_produccion(estado)");
    } catch (PDOException $e) {
        // El índice ya existe, continuar
    }

    $pdo->commit();

    if (empty($alteraciones)) {
        echo json_encode([
            'success' => true,
            'message' => 'La tabla ya está actualizada. No se requieren cambios.',
            'alteraciones' => []
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Migración completada exitosamente',
            'alteraciones' => $alteraciones
        ]);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Error en migrar_produccion.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error en la migración: ' . $e->getMessage()
    ]);
}
exit();
?>

