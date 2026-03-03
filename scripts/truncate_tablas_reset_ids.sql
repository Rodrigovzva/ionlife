-- Vacía las tablas indicadas y reinicia los AUTO_INCREMENT (IDs).
-- Ejecutar con el usuario de la BD (ej: mysql -u root -p ionlifebd < scripts/truncate_tablas_reset_ids.sql)
-- Atención: esto borra todos los datos de estas tablas.

USE ionlifebd;

SET FOREIGN_KEY_CHECKS = 0;

-- Tablas hijas primero (referencian a pedidos, entregas, etc.)
TRUNCATE TABLE movimientos_inventario;
TRUNCATE TABLE items_pedido;
TRUNCATE TABLE historial_estado_pedido;
TRUNCATE TABLE pagos;
TRUNCATE TABLE incidencias_entrega;
TRUNCATE TABLE entregas;
TRUNCATE TABLE devoluciones_registro;
TRUNCATE TABLE pedidos;

TRUNCATE TABLE inventario;
TRUNCATE TABLE direcciones_clientes;
TRUNCATE TABLE clientes;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificación: los AUTO_INCREMENT quedan en 1
-- SELECT TABLE_NAME, AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'ionlifebd' AND TABLE_NAME IN ('clientes','devoluciones_registro','direcciones_clientes','entregas','historial_estado_pedido','inventario','movimientos_inventario','pagos','pedidos','items_pedido','incidencias_entrega');
