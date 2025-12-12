-- Tabla de clientes para el sistema IONICA
-- Ejecutar este script en phpMyAdmin después de crear la base de datos ionica

USE ionica;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    numero_ci VARCHAR(20) NOT NULL UNIQUE,
    telefono_principal VARCHAR(20),
    ciudad VARCHAR(100),
    direccion TEXT,
    correo VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitud DECIMAL(10, 8) NULL,
    longitud DECIMAL(11, 8) NULL,
    tipo_cliente ENUM('normal', 'mayorista', 'distribuidor') DEFAULT 'normal',
    negocio_razon_social VARCHAR(200),
    nit VARCHAR(50),
    notas TEXT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    vendedor_asignado INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ci (numero_ci),
    INDEX idx_correo (correo),
    INDEX idx_estado (estado),
    INDEX idx_vendedor (vendedor_asignado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

