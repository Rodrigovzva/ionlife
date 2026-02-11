CREATE DATABASE IF NOT EXISTS ionlifebd;
USE ionlifebd;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tipos_cliente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  descuento_unidades DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tipos_precio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  usuario VARCHAR(160) NOT NULL UNIQUE,
  hash_contrasena VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios_roles (
  usuario_id INT NOT NULL,
  rol_id INT NOT NULL,
  PRIMARY KEY (usuario_id, rol_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(180) NOT NULL,
  telefono_principal VARCHAR(40) NOT NULL,
  telefono_secundario VARCHAR(40),
  direccion VARCHAR(255),
  zona VARCHAR(120),
  datos_gps VARCHAR(255),
  tipo_cliente VARCHAR(80),
  razon_social VARCHAR(180),
  nit VARCHAR(60),
  estado VARCHAR(40) NOT NULL DEFAULT 'Activo',
  notas TEXT,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS direcciones_clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  etiqueta VARCHAR(120),
  direccion VARCHAR(255) NOT NULL,
  ciudad VARCHAR(120),
  referencia VARCHAR(255),
  es_principal TINYINT(1) NOT NULL DEFAULT 0,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tipos_precio_producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_precio_id INT NOT NULL,
  producto_id INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  UNIQUE KEY uniq_tipo_producto (tipo_precio_id, producto_id),
  FOREIGN KEY (tipo_precio_id) REFERENCES tipos_precio(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS almacenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  ubicacion VARCHAR(200),
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  almacen_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_inv (almacen_id, producto_id),
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  almacen_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  pedido_id INT,
  nota VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  direccion_id INT NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'Creado',
  metodo_pago VARCHAR(60),
  prioridad VARCHAR(40) NOT NULL DEFAULT 'Normal',
  notas TEXT,
  fecha_programada DATE NULL,
  creado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_por_usuario_id INT,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (direccion_id) REFERENCES direcciones_clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS items_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  tipo_precio_id INT NULL,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (tipo_precio_id) REFERENCES tipos_precio(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS historial_estado_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  estado VARCHAR(40) NOT NULL,
  nota VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(60),
  estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS camiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(40) NOT NULL UNIQUE,
  capacidad INT,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS repartidores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  telefono VARCHAR(40),
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS entregas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  camion_id INT NOT NULL,
  repartidor_id INT NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'Despachado',
  programado_en DATETIME,
  entregado_en DATETIME,
  creado_por_usuario_id INT,
  actualizado_por_usuario_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (camion_id) REFERENCES camiones(id) ON DELETE CASCADE,
  FOREIGN KEY (repartidor_id) REFERENCES repartidores(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS incidencias_entrega (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entrega_id INT NOT NULL,
  tipo VARCHAR(120) NOT NULL,
  nota VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(120) NOT NULL,
  entidad_id INT,
  detalle VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

INSERT IGNORE INTO roles (nombre) VALUES
('Administrador del sistema'),
('Supervisor de call center'),
('Operador de call center'),
('Encargado de almacén'),
('Repartidor'),
('Jefe de logística');

INSERT IGNORE INTO tipos_cliente (nombre) VALUES
('Residencial'),
('Comercial'),
('Institucional');
