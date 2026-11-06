# Despliegue de ZAPI

La arquitectura de producción prevista es:

- **Netlify** publica `frontend/` y ejecuta la API como función serverless.
- **MongoDB Atlas** aloja la base con replica set.
- El dominio propio (por ejemplo `https://zapi.uy`) apunta a Netlify.

## 1. Base de datos

1. Crear un cluster en MongoDB Atlas.
2. Crear un usuario de aplicación con permisos de lectura y escritura sobre
   la base `zapi`.
3. Permitir el acceso desde Netlify (rangos de IP o `0.0.0.0/0` con un
   usuario de contraseña fuerte).
4. Copiar la cadena de conexión. Debe incluir el replica set, por ejemplo:

```text
mongodb+srv://usuario:clave@cluster.mongodb.net/zapi?retryWrites=true&w=majority
```

Las transacciones de stock requieren replica set; Atlas lo provee por
defecto.

## 2. Variables de entorno en Netlify

Configurar en **Site settings → Environment variables**:

| Variable | Valor de producción |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | cadena de Atlas |
| `JWT_SECRET` | secreto aleatorio de al menos 32 bytes |
| `JWT_EXPIRES_IN` | `12h` |
| `FRONTEND_ORIGINS` | `https://zapi.uy,https://www.zapi.uy` |
| `COOKIE_SAME_SITE` | `none` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `1` |
| `ENVIO_GRATIS` | monto en pesos, por ejemplo `2500` |
| `REGISTRO_PUBLICO` | `true` o `false` |

`COOKIE_SAME_SITE=none` exige `COOKIE_SECURE=true`. La configuración falla
al arrancar si la combinación es inválida.

Generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No subir `.env` al repositorio. `.env.example` documenta las variables sin
valores reales.

## 3. Build

`netlify.toml` ya define:

```toml
[build]
  publish = "frontend"
  functions = "netlify/functions"
  command = "npm run generar"

[build.environment]
  NODE_VERSION = "24"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/api/:splat"
  status = 200
  force = true
```

`npm run generar` construye el HTML público, el panel, `sitemap.xml` y
`robots.txt`. La función `netlify/functions/api.js` reutiliza `createApp` y
conecta Mongoose antes de atender cada invocación.

## 4. Primer despliegue

1. Conectar el repositorio a Netlify.
2. Cargar las variables de entorno.
3. Ejecutar el deploy.
4. Sembrar el catálogo y el contenido contra Atlas. Desde una máquina con
   las variables de producción en el entorno:

```bash
npm run seed:catalogo
npm run seed:contenido
```

Ambos comandos son idempotentes: no pisan datos existentes salvo que se pase
`--forzar`.

5. Crear el super administrador una única vez:

```bash
ADMIN_NOMBRE="Administrador" \
ADMIN_EMAIL="admin@zapi.uy" \
ADMIN_CLAVE="una-clave-de-12-caracteres-o-mas" \
npm run admin:crear
```

En PowerShell:

```powershell
$env:ADMIN_NOMBRE="Administrador"
$env:ADMIN_EMAIL="admin@zapi.uy"
$env:ADMIN_CLAVE="una-clave-de-12-caracteres-o-mas"
npm run admin:crear
```

6. Entrar por `https://zapi.uy/login.html` con esa cuenta y verificar el
   panel en `https://zapi.uy/admin/index.html`.

## 5. Verificación posterior

- `GET https://zapi.uy/api/health` debe devolver `{ "estado": "ok" }`.
- `GET https://zapi.uy/api/config` debe devolver `requiereCuenta: true`.
- El catálogo debe mostrar los productos sembrados.
- El login debe crear la cookie `zapi_session` con `Secure`, `HttpOnly` y
  `SameSite=None`.
- Una compra de prueba debe descontar stock y abrir WhatsApp con el código.
- El dashboard debe mostrar la venta y el cierre de caja del día.

## 6. Actualizaciones

Cada push a la rama de producción vuelve a ejecutar `npm run generar` y
publica el sitio y la función. Antes de desplegar conviene correr:

```bash
npm test
npm run lint
npm run verificar
```

Si se agregan productos, se editan desde el panel; no hace falta volver a
sembrar. La semilla solo se usa para la carga inicial.

## 7. Respaldos y operación

- Activar respaldos automáticos en Atlas.
- Revisar el panel de auditoría para cambios sensibles.
- Rotar `JWT_SECRET` invalida las sesiones activas: hacerlo en una ventana
  de mantenimiento.
- Monitorear los límites de tasa y los errores `5xx` desde Netlify.
- Las imágenes se sirven desde `frontend/public/img/`; si se externalizan,
  usar URLs `https` y mantener el respaldo local.

## 8. Desarrollo local

```bash
npm install
cp .env.example .env
npm run seed:catalogo
npm run seed:contenido
npm run admin:crear
npm start
```

El sitio queda en `http://localhost:5500` y la API en
`http://localhost:5501`. `frontend/tools/servir.js` hace de proxy de `/api`
y bloquea las carpetas de fuentes para que no se publiquen.
