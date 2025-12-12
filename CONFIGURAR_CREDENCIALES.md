# Configurar Credenciales de MySQL

## Problema Actual

El sistema no puede conectarse a MySQL porque la contraseña está vacía. Necesitas configurar las credenciales correctas.

## Solución Rápida

### Opción 1: Editar archivo config.local.php (Recomendado)

1. Abre el archivo: `public/api/config.local.php`
2. Cambia la línea 11 con tu contraseña de MySQL:
   ```php
   define('DB_PASS_LOCAL', 'tu_contraseña_aqui');
   ```
3. Si tu usuario no es 'root', también cambia la línea 10:
   ```php
   define('DB_USER_LOCAL', 'tu_usuario');
   ```
4. Reinicia el contenedor:
   ```bash
   docker-compose restart web
   ```

### Opción 2: Editar docker-compose.yml

1. Abre el archivo: `docker-compose.yml`
2. Cambia la línea 14:
   ```yaml
   - DB_PASS=tu_contraseña_aqui
   ```
3. Reinicia el contenedor:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Verificar la Conexión

Después de configurar, ejecuta:

```bash
docker-compose exec web php /var/www/html/api/test_connection.php
```

Deberías ver "✓ Conexión exitosa!" si todo está bien.

## Credenciales de Login del Sistema

Una vez que la conexión funcione, puedes usar:

- **Usuario:** `admin`
- **Contraseña:** `password`

O:

- **Usuario:** `vendedor`
- **Contraseña:** `password`

## Nota Importante

Asegúrate de que:
1. El servidor MySQL en `10.0.0.3` permite conexiones remotas
2. El usuario tiene permisos para acceder desde la red
3. La base de datos `ionica` existe y tiene las tablas creadas

