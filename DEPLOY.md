# Despliegue IONLIFE en Portainer y base de datos

## Credenciales (solo en este equipo)

- Las credenciales de despliegue se guardan en **`config/deploy-credentials.env`** (no se sube a Git).
- Plantilla: **`config/deploy-credentials.env.example`**.
- **Importante:** cambia las contraseñas en Portainer y MySQL cuando termines de desplegar.

---

## 1. Base de datos (phpMyAdmin)

1. Entra en **https://phpmyadmin.sisvel.sbs**
2. Inicia sesión (usuario root, contraseña de MySQL).
3. Crea la base de datos **ionlifebd** si no existe:
   - Pestaña **Bases de datos** → Crear → nombre: `ionlifebd` → Crear.
4. Selecciona la base **ionlifebd** y ve a la pestaña **SQL**.
5. Copia y pega el contenido del archivo **`db/init/01_schema.sql`** y ejecuta (Continuar).
   - Eso crea las tablas y los roles. El usuario administrador **Rvel** se crea al arrancar el backend (paso 3).

## 2. Contenedores en Portainer (Docker)

1. Entra en **https://docker.sisvel.sbs**
2. **Stacks** → **Add stack** (o **Crear pila**).
3. Nombre: `ionlife`.
4. En **Build method** elige **Web editor** y pega el contenido de **`docker-compose.yml`** de este proyecto.
   - O en **Build method** → **Git repository**:
     - URL: `https://github.com/Rodrigovzva/ionlife.git`
     - Branch: `main`
     - Compose path: `docker-compose.yml`
5. Ajusta si hace falta:
   - **DB_HOST**: si MySQL está en el mismo host que Docker, usa `host.docker.internal` (ya está en el compose). En Linux a veces hay que usar la IP del host (ej. `172.17.0.1`) o el nombre del contenedor MySQL si lo añades a la misma red.
   - **DB_PASSWORD**: debe ser la contraseña de MySQL (root).
6. **Deploy the stack** (Desplegar la pila).
7. Comprueba que los contenedores **ionlife_backend** e **ionlife_frontend** estén en estado **running**.

## 3. Usuario administrador Rvel

- El backend crea solo al inicio un usuario si no existe:
  - **Usuario (login):** `Rvel`
  - **Contraseña:** `8080Ipv6**`
  - Rol: Administrador del sistema
- Si la base **ionlifebd** ya tenía tablas y roles al desplegar, el primer arranque del backend inserta este usuario. Si no se creó, ejecuta de nuevo el despliegue (o reinicia el contenedor del backend) después de haber ejecutado `01_schema.sql`.

## 4. Acceso a la aplicación

- **Dominio:** **https://ionlife.sisvel.sbs/** (con proxy inverso).
- **Frontend (sin proxy):** `http://tu-servidor:18080`.
- **Backend API (sin proxy):** puerto **18081**.

El frontend está configurado con `VITE_API_URL=/api`, así que al entrar por https://ionlife.sisvel.sbs las peticiones van a `https://ionlife.sisvel.sbs/api` (mismo origen).

## 5. Por qué https://ionlife.sisvel.sbs no carga

Si al abrir **https://ionlife.sisvel.sbs/** te redirige a phpMyAdmin o no carga la app, es porque **no hay un virtual host para ionlife.sisvel.sbs**: nginx está usando otro `server` (p. ej. el que redirige a phpmyadmin.sisvel.sbs). Hay que **añadir un server block solo para ionlife.sisvel.sbs** que envíe el tráfico a los contenedores.

## 6. Proxy inverso para https://ionlife.sisvel.sbs

En el **servidor donde está nginx** (el mismo donde corren los contenedores en 18080/18081):

1. Usa el archivo **`config/nginx-ionlife.sisvel.sbs.conf`** de este repo (o el bloque que sigue).
2. Cópialo a nginx, por ejemplo:
   ```bash
   sudo cp config/nginx-ionlife.sisvel.sbs.conf /etc/nginx/sites-available/ionlife.sisvel.sbs.conf
   sudo ln -sf /etc/nginx/sites-available/ionlife.sisvel.sbs.conf /etc/nginx/sites-enabled/
   ```
3. Ajusta las rutas de **SSL** en el archivo (descomenta `ssl_certificate` y `ssl_certificate_key`). Si usas certbot: `sudo certbot --nginx -d ionlife.sisvel.sbs`
4. Comprueba y recarga:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

Si usas **nginx** (o similar) en el mismo servidor, el virtual host debe hacer:

- **`https://ionlife.sisvel.sbs/`** → proxy al frontend (puerto 18080).
- **`https://ionlife.sisvel.sbs/api`** → proxy al backend (puerto 18081).

Ejemplo de configuración nginx (sustituye `ionlife.sisvel.sbs` si usas otro nombre):

```nginx
server {
    listen 443 ssl;
    server_name ionlife.sisvel.sbs;

    # Certificado SSL (Let's Encrypt, etc.)
    # ssl_certificate /etc/letsencrypt/live/ionlife.sisvel.sbs/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/ionlife.sisvel.sbs/privkey.pem;

    location /api {
        proxy_pass http://127.0.0.1:18081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Recarga nginx tras cambiar la config: `sudo nginx -t && sudo systemctl reload nginx`.

## 7. Conexión del backend a MySQL

El `docker-compose` usa `host.docker.internal` para conectar al MySQL del host. En Linux puede no existir; en ese caso:

- Opción A: En el stack de Portainer añade **extra_hosts** (ya está en el compose):
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```
- Opción B: Si MySQL es un contenedor (ej. `mysql`), usa el nombre del servicio y una red común, y en el compose pon `DB_HOST: mysql` y une el backend a esa red.
