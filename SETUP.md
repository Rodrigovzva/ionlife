# Guía de Configuración del Proyecto

## Requisitos Previos

- Node.js LTS (18.x o 20.x recomendado)
- PHP 7.4 o superior
- MySQL/MariaDB
- npm (incluido con Node.js)

## Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd WEB_2
```

### 2. Configurar la Base de Datos

1. Crea la base de datos MySQL:
   ```sql
   CREATE DATABASE sistema_ventas;
   -- o
   CREATE DATABASE ionica;
   ```

2. Importa los archivos SQL de inicialización:
   - `api/init_db.sql`
   - `public/api/init_*.sql` (según corresponda)

### 3. Configurar las Credenciales

#### Para `api/`:
1. Copia el archivo de ejemplo:
   ```bash
   cp api/config.php.example api/config.php
   ```

2. Edita `api/config.php` y ajusta las credenciales:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'sistema_ventas');
   define('DB_USER', 'tu_usuario');
   define('DB_PASS', 'tu_contraseña');
   ```

#### Para `public/api/`:
1. Si necesitas configuración personalizada, crea `config.local.php`:
   ```bash
   cp public/api/config.local.php.example public/api/config.local.php
   ```

2. Edita `public/api/config.local.php` con tus credenciales:
   ```php
   define('DB_HOST_LOCAL', 'tu_host');
   define('DB_NAME_LOCAL', 'tu_base_datos');
   define('DB_USER_LOCAL', 'tu_usuario');
   define('DB_PASS_LOCAL', 'tu_contraseña');
   ```

   **Nota:** Si no creas `config.local.php`, se usarán los valores por defecto de `config.php`.

### 4. Instalar Dependencias de AdminLTE

```bash
cd IONICA
npm install
```

### 5. Iniciar el Servidor de Desarrollo

#### Opción A: Servidor PHP (Frontend + API)
```bash
# Desde la raíz del proyecto
npm start
# o
php -S localhost:4000 -t public
```

#### Opción B: Servidor de Desarrollo AdminLTE
```bash
cd IONICA
npm start
# El servidor se abrirá en http://localhost:4000
```

## Estructura del Proyecto

```
WEB_2/
├── api/                 # API backend (configuración base)
│   ├── config.php       # Configuración (editar según entorno)
│   └── *.php           # Endpoints de la API
├── public/             # Frontend y API pública
│   ├── api/            # Endpoints públicos de la API
│   │   ├── config.php  # Configuración (usa config.local.php si existe)
│   │   └── *.php       # Endpoints
│   └── *.html          # Páginas del frontend
├── IONICA/             # Proyecto AdminLTE
│   ├── src/            # Código fuente
│   └── dist/           # Archivos compilados (generados)
└── README.md           # Documentación principal
```

## Archivos Importantes

- **`.gitignore`**: Archivos que NO se suben a Git (node_modules, config.local.php, etc.)
- **`config.php.example`**: Plantilla de configuración
- **`config.local.php.example`**: Plantilla para configuración local (opcional)

## Notas de Seguridad

⚠️ **IMPORTANTE:**
- Los archivos `config.local.php` están en `.gitignore` y NO se suben a Git
- Nunca subas credenciales reales al repositorio
- En producción, usa variables de entorno o archivos de configuración seguros
- Cambia `session.cookie_secure` a `1` si usas HTTPS

## Comandos Útiles

### AdminLTE (IONICA)
```bash
cd IONICA
npm run build          # Compilación rápida
npm run production     # Compilación optimizada
npm run lint           # Verificar errores
```

### Base de datos
- Los archivos SQL de inicialización están en `api/` y `public/api/`
- Revisa los archivos `init_*.sql` para crear las tablas necesarias


