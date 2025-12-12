-- Tabla de ventas para el sistema IONICA
-- Ejecutar este script en phpMyAdmin después de crear la base de datos ionica

USE ionica;

-- Tabla principal de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_venta VARCHAR(50) NOT NULL UNIQUE,
    fecha_registro DATETIME NOT NULL,
    cliente_id INT NOT NULL,
    vendedor_id INT NOT NULL,
    tipo_venta ENUM('normal', 'mayorista', 'distribuidor') DEFAULT 'normal',
    estado_venta ENUM('completada', 'pendiente', 'cancelada') DEFAULT 'completada',
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
    descuento_monto DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago ENUM('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'qr', 'mixto') NOT NULL,
    monto_recibido DECIMAL(10, 2) DEFAULT 0,
    cambio DECIMAL(10, 2) DEFAULT 0,
    notas_venta TEXT,
    productos_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cliente (cliente_id),
    INDEX idx_vendedor (vendedor_id),
    INDEX idx_fecha (fecha_registro),
    INDEX idx_estado (estado_venta),
    INDEX idx_numero_venta (numero_venta),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de detalles de venta (productos de cada venta)
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_venta (venta_id),
    INDEX idx_producto (producto_id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

