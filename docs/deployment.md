# Despliegue de ZAPI en Vercel

La arquitectura de producción prevista es:

- **Vercel** publica `frontend/` como sitio estático y ejecuta la API como función serverless en `api/index.js`.
- **MongoDB Atlas** aloja la base con replica set.
- El dominio propio apunta a Vercel (opcional; Vercel asigna una URL `.vercel.app`).

## 1. Base de datos

1. Crear un cluster en MongoDB Atlas.
2. Crear un usuario de aplicación con permisos de lectura y escritura sobre la base `zapi`.
3. En **Network Access**, permitir las conexiones desde los servidores que ejecutan la API.
4. Copiar la cadena de conexión y guardarla como `MONGODB_URI`. Debe incluir la base `zapi`.

```text
mongodb+srv://usuario:clave@cluster.mongodb.net/zapi?retryWrites=true&w=majority
```

Si el usuario o la contraseña contienen caracteres especiales, codificarlos con URL encoding. No publicar la cadena completa: contiene credenciales. Las transacciones de stock requieren replica set; Atlas lo provee por defecto.

Para desarrollo local, copiar `.env.example` a `.env` y guardar allí la cadena real en `MONGODB_URI`. El archivo `.env` está excluido de Git. La API lee esta variable al iniciar y reutiliza una conexión compartida a MongoDB.

## 2. Variables de entorno en Vercel

Configurar en **Vercel → Settings → Environment Variables** (para Producción, Vista previa y Desarrollo):

| Variable | Valor de producción |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | cadena de Atlas |
| `JWT_SECRET` | secreto aleatorio de al menos 32 bytes |
| `JWT_EXPIRES_IN` | `12h` |
| `FRONTEND_ORIGINS` | `https://tu-dominio.vercel.app,https://www.tu-dominio.com` |
| `COOKIE_SAME_SITE` | `none` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `1` |
| `ENVIO_GRATIS` | monto en pesos, por ejemplo `2500` |
| `REGISTRO_PUBLICO` | `true` o `false` |

`COOKIE_SAME_SITE=none` exige `COOKIE_SECURE=true`. La configuración falla al arrancar si la combinación es inválida.

Generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No subir `.env` al repositorio. `.env.example` documenta las variables sin valores reales.

## 3. Build y despliegue

`vercel.json` ya define:

- La función serverless en `api/index.js` que reutiliza `createApp` y conecta Mongoose antes de atender cada invocación.
- Las rutas `/api/*` hacia la función.
- Los archivos estáticos desde `frontend/`.

Conectar el repositorio a Vercel. Vercel detecta `vercel.json` y despliega automáticamente en cada push.

## 4. Primera puesta en marcha

1. Conectar el repositorio a Vercel.
2. Cargar las variables de entorno en Vercel.
3. Hacer el primer deploy.
4. Sembrar el catálogo y el contenido contra Atlas. Desde una máquina con las variables de producción en el entorno:

```bash
npm run seed:catalogo
npm run seed:contenido
```

Ambos comandos son idempotentes: no pisan datos existentes salvo que se pase `--forzar`.

5. Crear el super administrador una única vez:

```bash
npm run admin:crear
```

En PowerShell:

```powershell
$env:ADMIN_NOMBRE="Administrador"
$env:ADMIN_EMAIL="admin@zapi.uy"
$env:ADMIN_CLAVE="una-clave-de-12-caracteres-o-mas"
npm run admin:crear
```

6. Entrar por `https://tu-dominio.vercel.app/login.html` con esa cuenta y verificar el panel en `https://tu-dominio.vercel.app/admin/index.html`.

## 5. Verificación posterior

- `GET https://tu-dominio.vercel.app/api/health` debe devolver `{ "estado": "ok" }`.
- `GET https://tu-dominio.vercel.app/api/config` debe devolver `requiereCuenta: true`.
- El catálogo debe mostrar los productos sembrados.
- El login debe crear la cookie `zapi_session` con `Secure`, `HttpOnly` y `SameSite=None`.
- Una compra de prueba debe descontar stock y abrir WhatsApp con el código.
- El dashboard debe mostrar la venta y el cierre de caja del día.

## 6. Actualizaciones

Cada push a la rama de producción vuelve a desplegar el sitio y la función. Antes de desplegar conviene correr:

```bash
npm test
npm run lint
npm run verificar
npm run generar
```

Si se agregan productos, se editan desde el panel; no hace falta volver a sembrar. La semilla solo se usa para la carga inicial.

## 7. Respaldos y operación

- Activar respaldos automáticos en Atlas.
- Revisar el panel de auditoría para cambios sensibles.
- Rotar `JWT_SECRET` invalida las sesiones activas: hacerlo en una ventana de mantenimiento.
- Monitorear los límites de tasa y los errores `5xx` desde Vercel.
- Las imágenes se sirven desde `frontend/public/img/`; si se externalizan, usar URLs `https` y mantener el respaldo local.

## 8. Desarrollo local

```bash
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
npm run seed:catalogo
npm run seed:contenido
npm run admin:crear
npm start
```

El sitio queda en `http://localhost:5500` y la API en `http://localhost:5501`. `frontend/tools/servir.js` hace de proxy de `/api` y bloquea las carpetas de fuentes para que no se publiquen.
