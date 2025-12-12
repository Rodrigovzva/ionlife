# Sistema de Login para Ventas con AdminLTE

Sistema de autenticación para un sistema de ventas, construido con AdminLTE v4, HTML/CSS/JS y PHP. Optimizado para dispositivos móviles.

## Características

- Login responsive optimizado para móviles
- Autenticación con PHP y sesiones
- Dashboard con AdminLTE v4
- Interfaz moderna y profesional
- API RESTful para gestión de datos
- Sistema de gestión de inventario y ventas

## Requisitos

- PHP 7.4 o superior
- MySQL/MariaDB
- Node.js LTS (18.x o 20.x) - para AdminLTE
- npm (incluido con Node.js)
- Navegador web moderno

## Instalación

### Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd WEB_2
```

**Importante:** Después de clonar, sigue las instrucciones en [SETUP.md](SETUP.md) para configurar las credenciales de base de datos.

### Opción 1: Usando Docker (Recomendado)

1. Asegúrate de tener Docker y Docker Compose instalados
2. Construir y levantar los contenedores:
   ```bash
   docker-compose up --build -d
   ```
3. Esperar unos segundos a que la base de datos se inicialice
4. Acceder a: **http://localhost:4000**

Para detener los contenedores:
```bash
docker-compose down
```

Para ver los logs:
```bash
docker-compose logs -f
```

### Opción 2: Instalación Local

1. Clonar o descargar el proyecto
2. Configurar la base de datos:
   ```bash
   mysql -u root -p < public/api/init_db.sql
   ```
3. Configurar las credenciales de base de datos en `public/api/config.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'sistema_ventas');
   define('DB_USER', 'tu_usuario');
   define('DB_PASS', 'tu_contraseña');
   ```

4. Iniciar el servidor:
   ```bash
   npm start
   ```
   O directamente con PHP:
   ```bash
   php -S localhost:4000 -t public
   ```

### Acceder al sistema

Abre tu navegador en: **http://localhost:4000**

**Nota:** Si usas Docker, la base de datos se inicializa automáticamente con el script `init_db.sql`.

### Credenciales de prueba

- Usuario: `admin`
- Contraseña: `password`

O:

- Usuario: `vendedor`
- Contraseña: `password`

**Nota:** Las contraseñas están hasheadas en la base de datos. Para crear nuevas contraseñas, usa `password_hash()` de PHP.

## Estructura del Proyecto

```
WEB_2/
├── api/                 # API backend (configuración base)
│   ├── config.php       # Configuración de base de datos
│   ├── config.php.example  # Plantilla de configuración
│   ├── login.php        # Endpoint de autenticación
│   ├── logout.php       # Endpoint de cierre de sesión
│   ├── check_session.php # Verificación de sesión
│   └── init_db.sql      # Script de inicialización
├── public/              # Frontend y API pública
│   ├── index.html       # Página de login
│   ├── dashboard.html   # Dashboard principal
│   ├── productos.html   # Gestión de productos
│   ├── ventas.html      # Gestión de ventas
│   └── api/             # Backend PHP público
│       ├── config.php   # Configuración (usa config.local.php si existe)
│       ├── config.local.php.example  # Plantilla para configuración local
│       ├── *.php        # Endpoints de la API
│       └── init_*.sql   # Scripts de inicialización
├── IONICA/              # Proyecto AdminLTE v4
│   ├── src/             # Código fuente (SCSS, TypeScript, Astro)
│   │   ├── scss/        # Estilos SCSS
│   │   ├── ts/          # TypeScript/JavaScript
│   │   └── html/        # Páginas Astro
│   ├── dist/            # Archivos compilados (generados, no en Git)
│   ├── package.json     # Dependencias de AdminLTE
│   └── .gitignore       # Archivos ignorados de AdminLTE
├── .gitignore           # Archivos ignorados por Git
├── package.json         # Configuración npm del proyecto
├── SETUP.md             # Guía detallada de configuración
└── README.md            # Este archivo
```

## Desarrollo

### AdminLTE (IONICA)

Para trabajar con el código fuente de AdminLTE:

```bash
cd IONICA
npm install
npm start  # Servidor de desarrollo en http://localhost:4000
```

Comandos disponibles:
- `npm run build`: Compilación rápida
- `npm run production`: Compilación optimizada para producción
- `npm run lint`: Verificar errores de código

### Extensión del Sistema

El sistema está diseñado para ser fácilmente extensible. Puedes agregar:

- Más endpoints en las carpetas `api/` o `public/api/`
- Nuevas páginas en la carpeta `public/`
- Personalizar estilos en `IONICA/src/scss/`
- Agregar funcionalidades JavaScript en `IONICA/src/ts/`

## Seguridad

**Importante para producción:**

1. Cambiar las contraseñas por defecto
2. Usar HTTPS
3. Configurar `session.cookie_secure = 1` en `config.php`
4. Validar y sanitizar todas las entradas
5. Usar prepared statements (ya implementado)
6. Implementar rate limiting para el login

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (vanilla)
- **UI Framework:** AdminLTE v4 (branch master)
- **Backend:** PHP 7.4+
- **Base de datos:** MySQL/MariaDB
- **Build Tools:** Node.js, npm, Sass, TypeScript, Astro

## Archivos de Configuración

⚠️ **Importante para Git:**
- Los archivos `config.local.php` están en `.gitignore` y NO se suben al repositorio
- Usa los archivos `.example` como plantilla para crear tus configuraciones locales
- Nunca subas credenciales reales al repositorio

Ver [SETUP.md](SETUP.md) para instrucciones detalladas de configuración.

## Licencia

MIT

