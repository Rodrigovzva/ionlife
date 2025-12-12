# Crear Base de Datos IONICA

## ✅ La conexión a MySQL funciona correctamente

Ahora necesitas crear la base de datos `ionica` en phpMyAdmin.

## Pasos para crear la base de datos

### Paso 1: Acceder a phpMyAdmin

1. Abre tu navegador y ve a: **http://10.0.0.3:8080/**
2. Inicia sesión con:
   - Usuario: `root`
   - Contraseña: `root`

### Paso 2: Crear la base de datos

**Opción A: Usando el script SQL (Recomendado)**

1. En phpMyAdmin, haz clic en la pestaña **"SQL"** en la parte superior
2. Abre el archivo `public/api/init_ionica.sql` en un editor de texto
3. Copia TODO el contenido del archivo
4. Pega el contenido en el área de texto de phpMyAdmin
5. Haz clic en **"Continuar"** o **"Ejecutar"**

**Opción B: Crear manualmente**

1. En phpMyAdmin, haz clic en **"Nueva"** en el menú lateral izquierdo
2. En "Nombre de la base de datos", escribe: `ionica`
3. En "Cotejamiento", selecciona: `utf8mb4_unicode_ci`
4. Haz clic en **"Crear"**

### Paso 3: Crear la tabla de usuarios

1. Selecciona la base de datos `ionica` en el menú lateral
2. Ve a la pestaña **"SQL"**
3. Ejecuta este código:

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

### Paso 4: Crear la tabla de clientes

1. Asegúrate de estar en la base de datos `ionica`
2. Ve a la pestaña **"SQL"**
3. Abre el archivo `public/api/init_clientes.sql` y copia su contenido
4. Pega y ejecuta en phpMyAdmin

### Paso 5: Verificar

Después de crear todo, ejecuta:

```bash
docker-compose exec web php /var/www/html/api/test_connection.php
```

Deberías ver:
- ✓ Conexión exitosa!
- Base de datos actual: ionica
- Tablas encontradas: 2 (usuarios, clientes)
- Usuarios encontrados: 2 (admin, vendedor)

## Credenciales para ingresar al sistema

Después de crear la base de datos, puedes usar:

- **Usuario:** `admin`
- **Contraseña:** `password`

O:

- **Usuario:** `vendedor`
- **Contraseña:** `password`

