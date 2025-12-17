-- Script de inicialización de base de datos para Sistema de Ventas IONLIFE
-- Este script crea todas las tablas necesarias para el sistema

-- Usar la base de datos
USE sistema_ventas;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    ciudad VARCHAR(100) NULL,
    rol VARCHAR(50) NULL DEFAULT 'usuario',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    notas TEXT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono_principal VARCHAR(20) NOT NULL UNIQUE,
    telefono_secundario VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    zona VARCHAR(50) NULL,
    correo VARCHAR(100) NULL,
    latitud DECIMAL(10, 8) NULL,
    longitud DECIMAL(11, 8) NULL,
    tipo_cliente ENUM('individual', 'negocio') NOT NULL DEFAULT 'individual',
    negocio_razon_social VARCHAR(200) NULL,
    nit VARCHAR(50) NULL,
    notas TEXT NULL,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    vendedor_asignado INT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_telefono (telefono_principal),
    INDEX idx_zona (zona),
    INDEX idx_estado (estado),
    INDEX idx_vendedor (vendedor_asignado),
    FOREIGN KEY (vendedor_asignado) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_producto VARCHAR(50) NOT NULL UNIQUE,
    nombre_producto VARCHAR(200) NOT NULL,
    tamano DECIMAL(10, 2) NULL,
    precio_compra DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_mayorista DECIMAL(10, 2) NULL,
    proveedor VARCHAR(100) NULL,
    fecha_vencimiento DATE NULL,
    imagen_producto VARCHAR(255) NULL,
    estado ENUM('activo', 'inactivo', 'agotado') NOT NULL DEFAULT 'activo',
    notas TEXT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo_producto),
    INDEX idx_nombre (nombre_producto),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_pedido VARCHAR(10) NOT NULL UNIQUE,
    fecha_registro DATETIME NOT NULL,
    fecha_programada DATETIME NULL,
    cliente_id INT NOT NULL,
    vendedor_id INT NOT NULL,
    tipo_pedido ENUM('inmediato', 'programado') NOT NULL DEFAULT 'inmediato',
    estado_pedido ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    descuento_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 0,
    descuento_monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'credito') NOT NULL DEFAULT 'efectivo',
    monto_recibido DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cambio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notas_pedido TEXT NULL,
    productos_json TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_numero_pedido (numero_pedido),
    INDEX idx_cliente (cliente_id),
    INDEX idx_vendedor (vendedor_id),
    INDEX idx_estado (estado_pedido),
    INDEX idx_fecha_registro (fecha_registro),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de control de producción
CREATE TABLE IF NOT EXISTS control_produccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    operador VARCHAR(100) NOT NULL,
    linea VARCHAR(50) NOT NULL,
    tamano INT NOT NULL,
    cantidad_producida INT NOT NULL,
    litros_producidos DECIMAL(10, 2) NOT NULL,
    cantidad_disponible INT NOT NULL DEFAULT 0,
    estado ENUM('disponible', 'transferido_despachos', 'parcialmente_transferido') DEFAULT 'disponible',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha),
    INDEX idx_linea (linea),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transferencias entre almacenes
CREATE TABLE IF NOT EXISTS transferencias_almacenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produccion_id INT NULL,
    almacen_origen VARCHAR(50) NOT NULL DEFAULT 'produccion',
    almacen_destino VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    tamano INT NOT NULL,
    litros DECIMAL(10, 2) NOT NULL,
    operador VARCHAR(100) NOT NULL,
    fecha_transferencia DATETIME DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    INDEX idx_produccion (produccion_id),
    INDEX idx_fecha (fecha_transferencia),
    INDEX idx_almacen_destino (almacen_destino),
    INDEX idx_almacen_origen (almacen_origen),
    FOREIGN KEY (produccion_id) REFERENCES control_produccion(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
