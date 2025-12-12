-- Tabla de productos para el sistema IONICA
-- Ejecutar este script en phpMyAdmin después de crear la base de datos ionica

USE ionica;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_producto VARCHAR(50) NOT NULL UNIQUE,
    nombre_producto VARCHAR(200) NOT NULL,
    tamano DECIMAL(10, 2),
    precio_compra DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_mayorista DECIMAL(10, 2),
    proveedor VARCHAR(100),
    fecha_vencimiento DATE,
    imagen_producto VARCHAR(255),
    estado ENUM('activo', 'inactivo', 'descontinuado') DEFAULT 'activo',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo_producto),
    INDEX idx_nombre (nombre_producto),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

