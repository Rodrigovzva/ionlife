# Diagrama de flujo de pedidos

```mermaid
flowchart TD
  createOrder[Creado] --> confirmOrder[Confirmado]
  confirmOrder --> prepOrder[En_preparacion]
  prepOrder --> dispatchOrder[Despachado]
  dispatchOrder --> enRoute[En_ruta]
  enRoute --> delivered[Entregado]
  confirmOrder --> cancelled[Cancelado]
  prepOrder --> cancelled
  dispatchOrder --> cancelled
```

## Descripción
- El pedido se crea en call center con cliente, dirección y productos.
- El supervisor confirma disponibilidad y despacho.
- El almacén prepara el pedido y se genera salida de inventario.
- Logística asigna camión y repartidor.
- Repartidor confirma entrega o reporta incidencia.
