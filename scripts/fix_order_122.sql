-- Cambiar pedido 122 de Reprogramado a Pendiente y quitar asignación previa para poder reasignar camión
UPDATE pedidos SET estado = 'Pendiente', actualizado_por_usuario_id = NULL WHERE id = 122;
DELETE FROM entregas WHERE pedido_id = 122;
INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (122, 'Pendiente', 'Cambio a Pendiente para reasignar camión');
