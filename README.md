# ZAPI

Sitio y panel de administración del vivero agroecológico ZAPI. El proyecto tiene
dos partes que se ejecutan por separado: `backend/` (API con Express y MongoDB
Atlas) y `frontend/` (React 19 con Vite y React Router, en JavaScript). El sitio
se ve y funciona igual que la versión anterior en HTML, CSS y JavaScript
"vanilla", que quedó guardada en `_vanilla-original/`.

## Requisitos

Hace falta Node.js 24 o superior (con npm) y una base de datos MongoDB, por
ejemplo un clúster de MongoDB Atlas. Para usar el chat del sitio también se
necesita una clave de Gemini, pero es opcional: sin ella el resto anda igual.

## Instalación

Cada carpeta tiene sus propias dependencias, así que se instalan por separado.

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Variables de entorno

En el backend, copiá `backend/.env.example` a `backend/.env` y completá al menos
`MONGODB_URI` (la cadena de conexión de Atlas, con la contraseña real del
usuario). Las demás tienen valores listos para trabajar en local: `MONGODB_DB`
(`zapi-api2`), `PORT` (`5501`), `FRONTEND_ORIGINS`, `TRUST_PROXY`,
`CRON_SECRET` y `GEMINI_API_KEY`. En local el backend ya acepta pedidos desde
`http://localhost:5173`, que es donde corre Vite.

En el frontend, copiá `frontend/.env.example` a `frontend/.env`. Tiene una sola
variable, `VITE_API_URL`, que es la dirección del backend (en local,
`http://localhost:5501`). Los archivos `.env` no se suben al repositorio.

## Cómo correrlo

Se necesitan dos terminales abiertas a la vez. En la primera arrancás la API:

```bash
cd backend && npm run dev
```

En la segunda arrancás el sitio:

```bash
cd frontend && npm run dev
```

Después abrí `http://localhost:5173`. El panel de administración está en
`/admin`; para crear una cuenta de administrador usá `npm run crear-admin` dentro
de `backend/`, y `npm run seed` para cargar los productos iniciales en la base.

## Verificación

Dentro de `frontend/`, `npm run build` genera la versión de producción en `dist/`
y `npm run lint` revisa el código con oxlint. Dentro de `backend/`, `npm test`
corre las pruebas de la API (no necesitan conexión a Atlas).

## Estructura

La carpeta `backend/` contiene `server.js` (arranque), `app.js` (rutas y
middleware), `db.js` (conexión a MongoDB), `routes/` (endpoints), `lib/` (validación,
sesiones, errores) y `compartido/` (catálogo, datos del negocio y esquema editable
que usan la API y el sitio). La carpeta `frontend/src/` contiene `paginas/` (una
por ruta), `components/`, `estado/` (carrito, catálogo, sesión y avisos con React
Context), `admin/` (el panel completo), `estilos/` (una hoja por página) y `api.js`
(una función por cada endpoint). Las imágenes están en `frontend/public/img/`.

## Publicación

El frontend se publica en Vercel: `vercel.json` compila `frontend/` y redirige
las rutas `/api/*` al backend en Render, así el navegador ve un solo dominio y las
cookies de sesión funcionan. En Vercel no hace falta definir `VITE_API_URL`. El
backend se publica en Render con `render.yaml`. El flujo de GitHub Actions
`depurar.yml` anonimiza pedidos viejos una vez por día.

Mirá `CAMBIOS.md` para ver qué cambió respecto de la versión anterior.
