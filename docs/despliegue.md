# Despliegue con Docker

## Requisitos
- Docker y Docker Compose instalados.
- Puertos libres: 18080, 18081.
- Base de datos `ionlifebd` creada en el servidor (MySQL existente).

## Pasos
1. Copiar `.env.example` a `.env` en `backend/` si se desea personalizar.
2. Ejecutar:
   - `docker compose up -d --build`
3. Acceder:
   - Frontend: `http://10.0.0.3:18080`
   - Backend API: `http://10.0.0.3:18081`

## Notas
- La base de datos se administra en `http://10.0.0.3:8080/` (phpMyAdmin).
- Importa manualmente el esquema desde `db/init/01_schema.sql` a `ionlifebd`.
- El usuario administrador se crea al arrancar el backend.
