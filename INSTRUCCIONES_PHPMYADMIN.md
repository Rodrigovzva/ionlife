# Instrucciones para configurar la base de datos IONICA en phpMyAdmin

## Paso 1: Acceder a phpMyAdmin

1. Abre tu navegador y ve a: **http://10.0.0.3:8080/**
2. Inicia sesión con tus credenciales de MySQL

## Paso 2: Crear la base de datos

### Opción A: Usando el script SQL (Recomendado)

1. En phpMyAdmin, haz clic en la pestaña **"SQL"** en la parte superior
2. Abre el archivo `public/api/init_ionica.sql` en un editor de texto
3. Copia todo el contenido del archivo
4. Pega el contenido en el área de texto de phpMyAdmin
5. Haz clic en **"Continuar"** o **"Ejecutar"**

### Opción B: Crear manualmente

1. En phpMyAdmin, haz clic en **"Nueva"** en el menú lateral izquierdo
2. En "Nombre de la base de datos", escribe: `ionica`
3. En "Cotejamiento", selecciona: `utf8mb4_unicode_ci`
4. Haz clic en **"Crear"**
5. Selecciona la base de datos `ionica` en el menú lateral
6. Ve a la pestaña **"SQL"**
7. Ejecuta el siguiente código:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (username, email, password, nombre, activo) VALUES
('admin', 'admin@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Administrador', 1),
('vendedor', 'vendedor@ionica.com', '$2y$10$f8uvTChVfhOsLE0OJr6tleRyhK/0sZy6eJ.YhaGiKNrreingRLSP.', 'Vendedor', 1);
```

## Paso 3: Crear tabla de clientes

1. En phpMyAdmin, selecciona la base de datos `ionica`
2. Ve a la pestaña **"SQL"**
3. Abre el archivo `public/api/init_clientes.sql` y copia su contenido
4. Pega el contenido en phpMyAdmin y ejecuta el script

## Paso 4: Verificar la configuración

1. Verifica que la base de datos `ionica` existe
2. Verifica que la tabla `usuarios` tiene 2 registros (admin y vendedor)
3. Verifica que la tabla `clientes` fue creada correctamente

## Paso 4: Configurar credenciales en la aplicación

Si tus credenciales de MySQL son diferentes a las predeterminadas, actualiza el archivo `public/api/config.php`:

```php
define('DB_HOST', '10.0.0.3');
define('DB_NAME', 'ionica');
define('DB_USER', 'tu_usuario_mysql');
define('DB_PASS', 'tu_contraseña_mysql');
```

## Credenciales de prueba

Después de crear la base de datos, puedes usar estas credenciales para ingresar:

- **Usuario:** `admin`
- **Contraseña:** `password`

O:

- **Usuario:** `vendedor`
- **Contraseña:** `password`

## Notas importantes

- Asegúrate de que el servidor MySQL en `10.0.0.3` permite conexiones remotas
- Si la aplicación está en Docker y MySQL está fuera, verifica que el puerto 3306 esté accesible
- Si tienes problemas de conexión, verifica el firewall y las configuraciones de MySQL

