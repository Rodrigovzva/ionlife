# Modelo entidad-relación (ERD)

```mermaid
erDiagram
  USERS ||--o{ USER_ROLES : has
  ROLES ||--o{ USER_ROLES : has
  CUSTOMERS ||--o{ CUSTOMER_ADDRESSES : has
  CUSTOMERS ||--o{ ORDERS : places
  CUSTOMER_ADDRESSES ||--o{ ORDERS : ships_to
  PRODUCTS ||--o{ ORDER_ITEMS : contains
  ORDERS ||--o{ ORDER_ITEMS : has
  WAREHOUSES ||--o{ INVENTORY : stores
  PRODUCTS ||--o{ INVENTORY : tracked
  ORDERS ||--o{ ORDER_STATUS_HISTORY : status
  ORDERS ||--o{ PAYMENTS : pays
  TRUCKS ||--o{ DELIVERIES : assigned
  DRIVERS ||--o{ DELIVERIES : assigned
  DELIVERIES ||--o{ DELIVERY_INCIDENTS : reports
  USERS ||--o{ AUDIT_LOGS : action
```

## Entidades clave
- `orders`: núcleo del flujo operativo.
- `inventory` y `inventory_movements`: control de stock.
- `deliveries`: seguimiento de entregas e incidencias.
