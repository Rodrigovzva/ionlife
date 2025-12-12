# Campos Sugeridos para Tabla de Ventas

## Campos Esenciales (Recomendados)

### Información de la Venta
- **id** (INT, AUTO_INCREMENT, PRIMARY KEY)
- **numero_venta** (VARCHAR, UNIQUE) - Número de factura/venta único
- **fecha_venta** (DATETIME, NOT NULL) - Fecha y hora de la venta
- **cliente_id** (INT, NOT NULL, FOREIGN KEY) - ID del cliente
- **vendedor_id** (INT, NOT NULL, FOREIGN KEY) - ID del vendedor/usuario
- **tipo_venta** (ENUM: normal, mayorista, distribuidor) - Tipo de venta
- **estado_venta** (ENUM: completada, pendiente, cancelada) - Estado de la venta

### Totales y Descuentos
- **subtotal** (DECIMAL(10, 2), NOT NULL) - Subtotal sin descuentos
- **descuento_porcentaje** (DECIMAL(5, 2), DEFAULT 0) - Porcentaje de descuento
- **descuento_monto** (DECIMAL(10, 2), DEFAULT 0) - Monto de descuento
- **total** (DECIMAL(10, 2), NOT NULL) - Total de la venta

### Información de Pago
- **metodo_pago** (ENUM: efectivo, tarjeta_debito, tarjeta_credito, transferencia, qr, mixto) - Método de pago
- **monto_recibido** (DECIMAL(10, 2), DEFAULT 0) - Monto recibido del cliente
- **cambio** (DECIMAL(10, 2), DEFAULT 0) - Cambio devuelto

### Información Adicional
- **notas_venta** (TEXT, NULL) - Notas u observaciones
- **created_at** (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- **updated_at** (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

## Tabla de Detalles de Venta (ventas_detalle)

Para almacenar los productos de cada venta:

- **id** (INT, AUTO_INCREMENT, PRIMARY KEY)
- **venta_id** (INT, NOT NULL, FOREIGN KEY) - ID de la venta
- **producto_id** (INT, NOT NULL, FOREIGN KEY) - ID del producto
- **cantidad** (INT, NOT NULL) - Cantidad vendida
- **precio_unitario** (DECIMAL(10, 2), NOT NULL) - Precio unitario al momento de la venta
- **subtotal** (DECIMAL(10, 2), NOT NULL) - Subtotal del producto (cantidad * precio)
- **created_at** (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

## Ejemplo de Estructura SQL

```sql
-- Tabla principal de ventas
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_venta VARCHAR(50) NOT NULL UNIQUE,
    fecha_venta DATETIME NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cliente (cliente_id),
    INDEX idx_vendedor (vendedor_id),
    INDEX idx_fecha (fecha_venta),
    INDEX idx_estado (estado_venta),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de detalles de venta
CREATE TABLE ventas_detalle (
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
```

## Notas

- El **numero_venta** puede generarse automáticamente (ej: VENT-000001, VENT-000002)
- El **precio_unitario** en ventas_detalle guarda el precio al momento de la venta (histórico)
- Los **descuentos** pueden aplicarse por porcentaje o monto fijo
- El **cambio** se calcula automáticamente (monto_recibido - total)
- La relación con clientes y productos usa FOREIGN KEY para integridad referencial

