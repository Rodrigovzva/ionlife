# Análisis de requisitos - Ionlife

## Objetivo
Construir un sistema centralizado para gestionar el flujo completo de pedidos y distribución de agua iónica, desde el call center hasta la entrega.

## Alcance funcional
- Usuarios y roles con control de acceso.
- Clientes con múltiples direcciones e historial de pedidos.
- Catálogo de productos con precios y estado activo.
- Almacenes con inventario y movimientos.
- Pedidos con estados y trazabilidad.
- Logística con camiones, repartidores y entregas.
- Reportes operativos y de rendimiento.

## Requisitos técnicos clave
- Docker y Docker Compose.
- Puertos exclusivos para evitar conflicto con 8080 y 9443.
- MySQL existente (phpMyAdmin en 8080).
- Registro básico de auditoría.

## Puertos asignados
- Frontend: 18080
- Backend API: 18081
- Base de datos: `ionlifebd` en servidor 10.0.0.3 (phpMyAdmin 8080)

## Roles
- Administrador del sistema: acceso total.
- Supervisor de call center: clientes, pedidos, reportes.
- Operador de call center: clientes y pedidos.
- Encargado de almacén: productos, almacenes, inventario.
- Jefe de logística: logística y reportes.
- Repartidor: logística y entregas asignadas.
