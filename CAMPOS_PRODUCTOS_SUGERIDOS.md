# Campos Sugeridos para Tabla de Productos - Agua Iónica

## Campos Esenciales (Recomendados)

### Información Básica
- **codigo_producto** (VARCHAR, UNIQUE, NOT NULL) - Código SKU único del producto
- **codigo_barras** (VARCHAR, UNIQUE, NULL) - Código de barras (opcional)
- **nombre_producto** (VARCHAR, NOT NULL) - Nombre completo del producto
- **marca** (VARCHAR, NULL) - Marca del producto
- **descripcion** (TEXT, NULL) - Descripción detallada

### Características del Producto
- **tipo_presentacion** (ENUM: botella, garrafa, bidon, bolsa, otro) - Tipo de envase
- **capacidad** (DECIMAL) - Volumen del producto
- **unidad_medida** (ENUM: ml, litros) - Unidad de medida
- **categoria** (VARCHAR) - Categoría del producto

### Precios
- **precio_compra** (DECIMAL, NOT NULL) - Precio al que se compra
- **precio_venta** (DECIMAL, NOT NULL) - Precio de venta al público
- **precio_mayorista** (DECIMAL, NULL) - Precio para ventas al por mayor

### Inventario
- **stock_actual** (INT, NOT NULL, DEFAULT 0) - Cantidad disponible
- **stock_minimo** (INT, NOT NULL, DEFAULT 0) - Stock mínimo antes de alerta
- **unidad_empaque** (INT, DEFAULT 1) - Unidades por caja/empaque

### Información Adicional
- **proveedor** (VARCHAR, NULL) - Nombre del proveedor
- **fecha_vencimiento** (DATE, NULL) - Fecha de vencimiento (si aplica)
- **imagen_producto** (VARCHAR, NULL) - Ruta/nombre de la imagen
- **estado** (ENUM: activo, inactivo, descontinuado) - Estado del producto
- **notas** (TEXT, NULL) - Notas adicionales

### Campos del Sistema
- **id** (INT, AUTO_INCREMENT, PRIMARY KEY)
- **created_at** (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- **updated_at** (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

## Índices Recomendados

- INDEX en `codigo_producto` (único)
- INDEX en `codigo_barras` (único, si se usa)
- INDEX en `nombre_producto` (para búsquedas)
- INDEX en `categoria` (para filtros)
- INDEX en `estado` (para filtrar activos/inactivos)
- INDEX en `stock_actual` (para alertas de stock bajo)

## Ejemplo de Estructura SQL

```sql
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_producto VARCHAR(50) NOT NULL UNIQUE,
    codigo_barras VARCHAR(50) UNIQUE,
    nombre_producto VARCHAR(200) NOT NULL,
    marca VARCHAR(100),
    descripcion TEXT,
    tipo_presentacion ENUM('botella', 'garrafa', 'bidon', 'bolsa', 'otro') NOT NULL,
    capacidad DECIMAL(10, 2) NOT NULL,
    unidad_medida ENUM('ml', 'litros') NOT NULL DEFAULT 'ml',
    categoria VARCHAR(100),
    precio_compra DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_mayorista DECIMAL(10, 2),
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    unidad_empaque INT DEFAULT 1,
    proveedor VARCHAR(100),
    fecha_vencimiento DATE,
    imagen_producto VARCHAR(255),
    estado ENUM('activo', 'inactivo', 'descontinuado') DEFAULT 'activo',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo_producto),
    INDEX idx_barras (codigo_barras),
    INDEX idx_nombre (nombre_producto),
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado),
    INDEX idx_stock (stock_actual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Notas

- El campo `imagen_producto` puede almacenar solo el nombre del archivo. Las imágenes físicas se guardarían en una carpeta `public/assets/img/productos/`
- El `precio_mayorista` es opcional pero útil para clientes mayoristas
- El `stock_minimo` permite generar alertas cuando el stock está bajo
- La `fecha_vencimiento` es opcional ya que no todos los productos tienen vencimiento

