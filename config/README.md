# Configuración y credenciales de despliegue

- **`deploy-credentials.env`**: archivo con credenciales reales. Está en `.gitignore` y **no se sube a Git**.
- **`deploy-credentials.env.example`**: plantilla sin datos sensibles. Sí está en el repo.

Para desplegar, crea `deploy-credentials.env` a partir del example y rellena los valores.
Después de desplegar, cambia las contraseñas en Portainer y MySQL y actualiza este archivo local si lo necesitas.
