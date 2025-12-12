# Acceso desde Otros Dispositivos

## ✅ Configuración Completada

El servidor está configurado para ser accesible desde cualquier dispositivo en tu red local.

## Direcciones de Acceso

### Desde el mismo equipo:
- **http://localhost:4000**
- **http://127.0.0.1:4000**

### Desde otros dispositivos en la misma red:
- **http://10.0.0.3:4000** (IP principal)
- **http://192.168.56.1:4000** (IP alternativa)

## Requisitos

1. **Mismo Wi-Fi/Red**: El dispositivo debe estar conectado a la misma red que el servidor
2. **Firewall**: Asegúrate de que el puerto 4000 esté permitido en el firewall de Windows

## Verificar Acceso

### Desde un navegador en otro dispositivo:

1. Conéctate a la misma red Wi-Fi
2. Abre un navegador (Chrome, Safari, Firefox, etc.)
3. Ingresa una de estas direcciones:
   - `http://10.0.0.3:4000`
   - `http://192.168.56.1:4000`

### Desde un celular:

1. Conéctate a la misma red Wi-Fi
2. Abre el navegador del celular
3. Ingresa: `http://10.0.0.3:4000`

## Configurar Firewall de Windows (si es necesario)

Si no puedes acceder desde otros dispositivos, puede ser que el firewall esté bloqueando el puerto:

1. Abre "Firewall de Windows Defender" en el Panel de Control
2. Haz clic en "Configuración avanzada"
3. Selecciona "Reglas de entrada" > "Nueva regla"
4. Selecciona "Puerto" > Siguiente
5. Selecciona "TCP" y escribe `4000` en "Puertos locales específicos"
6. Selecciona "Permitir la conexión" > Siguiente
7. Marca todas las opciones (Dominio, Privada, Pública) > Siguiente
8. Nombre: "IONICA Sistema Ventas" > Finalizar

## Credenciales de Acceso

Una vez que accedas desde cualquier dispositivo, puedes usar:

- **Usuario:** `admin`
- **Contraseña:** `password`

O:

- **Usuario:** `vendedor`
- **Contraseña:** `password`

## Solución de Problemas

### No puedo acceder desde otro dispositivo:

1. Verifica que ambos dispositivos estén en la misma red
2. Verifica que el firewall permita el puerto 4000
3. Prueba con la otra IP (10.0.0.3 o 192.168.56.1)
4. Verifica que Docker esté corriendo: `docker-compose ps`

### Verificar que el servidor está escuchando:

Ejecuta en PowerShell:
```powershell
netstat -ano | findstr :4000
```

Deberías ver: `TCP    0.0.0.0:4000` (0.0.0.0 significa que escucha en todas las interfaces)

## Nota de Seguridad

⚠️ **Importante**: Esta configuración permite acceso desde cualquier dispositivo en tu red local. Para producción, considera:
- Usar HTTPS
- Implementar autenticación más robusta
- Restringir acceso por IP si es necesario

