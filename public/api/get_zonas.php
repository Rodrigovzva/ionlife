<?php
require_once 'config.php';

// Conectar a la base de datos
$pdo = getDBConnection();

if (!$pdo) {
    echo json_encode(['results' => []]);
    exit();
}

try {
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    // Zonas predefinidas comunes (puedes expandir esta lista)
    $zonasPredefinidas = [
        'Centro',
        'Zona Norte',
        'Zona Sur',
        'Zona Este',
        'Zona Oeste',
        'Miraflores',
        'Sopocachi',
        'Calacoto',
        'Obrajes',
        'Irpavi',
        'Achumani',
        'Cota Cota',
        'San Miguel',
        'Villa Fátima',
        'Max Paredes',
        'El Alto',
        'Villa Copacabana',
        'Villa San Antonio',
        'Villa Tunari',
        'Villa Armonía',
        'Villa Esperanza',
        'Villa Victoria',
        'Villa 1ro de Mayo',
        'Villa 14 de Septiembre',
        'Villa 16 de Julio',
        'Villa Adela',
        'Villa Armonía',
        'Villa Bolívar',
        'Villa Copacabana',
        'Villa Dolores',
        'Villa Esperanza',
        'Villa Fátima',
        'Villa Mercedes',
        'Villa San Antonio',
        'Villa San Pedro',
        'Villa Tunari',
        'Villa Victoria',
        'Zona Sur',
        'Zona Norte',
        'Zona Este',
        'Zona Oeste'
    ];
    
    // Obtener zonas existentes de la base de datos
    $stmt = $pdo->query("SELECT DISTINCT zona FROM clientes WHERE zona IS NOT NULL AND zona != '' ORDER BY zona");
    $zonasDB = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Combinar zonas predefinidas y de la base de datos
    $todasZonas = array_unique(array_merge($zonasPredefinidas, $zonasDB));
    sort($todasZonas);
    
    // Filtrar por término de búsqueda
    $results = [];
    if (empty($search)) {
        // Si no hay búsqueda, devolver las primeras 20
        $todasZonas = array_slice($todasZonas, 0, 20);
    }
    
    foreach ($todasZonas as $zona) {
        if (empty($search) || stripos($zona, $search) !== false) {
            $results[] = [
                'id' => $zona,
                'text' => $zona
            ];
        }
    }
    
    // Limitar resultados
    $results = array_slice($results, 0, 50);
    
    echo json_encode(['results' => $results]);
    
} catch (PDOException $e) {
    error_log("Error al obtener zonas: " . $e->getMessage());
    echo json_encode(['results' => []]);
}
?>

