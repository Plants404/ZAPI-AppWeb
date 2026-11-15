# ZAPI

Sitio del vivero agroecológico ZAPI con frontend estático y una API opcional
en Node.js y Express conectada a MongoDB. El frontend actual conserva su flujo
local de pedidos y sus envíos por WhatsApp/EmailJS; la API ofrece persistencia
para catálogo, pedidos, consultas de contacto y testimonios.

El sitio se publica en GitHub Pages bajo un subdirectorio y en Vercel, con
rutas internas siempre relativas. El frontend no usa frameworks ni bundlers;
el backend usa Express y el driver oficial de MongoDB.

## Puesta en marcha

Instala las dependencias y ejecuta el sitio localmente:

```bash
npm install
npm run frontend
```

El servidor estático levanta el sitio en `http://localhost:5500`. Sirve los
archivos de `frontend/` con rutas relativas.

## API y MongoDB Atlas

La API requiere Node.js 24 o superior y una instancia de MongoDB (por ejemplo,
MongoDB Atlas). Copia `.env.example` a `.env` y reemplaza
`REEMPLAZAR_CON_PASSWORD` en `MONGODB_URI` por la contraseña del usuario de
base de datos. Codifica para URL los caracteres especiales de la contraseña.
No pongas esa cadena en el frontend ni la subas al repositorio. En Atlas,
crea un usuario de base de datos con acceso
`readWrite` únicamente a la base `zapi-api2` y permite en Network Access solo las
direcciones IP que realmente necesites.

```bash
npm install
npm run backend:seed
npm run backend
```

La API local escucha en `http://localhost:5501`. `GET /api/health` confirma
que el servidor puede ejecutar un ping contra MongoDB. Configura
`FRONTEND_ORIGINS` como una lista separada por comas si el frontend se sirve
desde otros orígenes; por defecto se permiten los puertos locales 5500.

Endpoints principales:

- `GET /api/products` y `GET /api/products/:slug`: catálogo activo.
- `POST /api/orders`: crea el pedido con precios de MongoDB y descuenta stock
  con una actualización condicional.
- `POST /api/contact`: guarda consultas privadas de contacto.
- `GET /api/testimonials`: devuelve solo testimonios aprobados.
- `POST /api/testimonials`: guarda opiniones pendientes de aprobación.
- `GET /api/publicado`: devuelve el snapshot publicado sin campos internos.
- `/api/auth/*` y `/api/admin/*`: autenticación, resumen y operaciones
  administrativas; todas las rutas de administración requieren rol admin.

Los pedidos y consultas no tienen endpoints de lectura públicos; el listado
de pedidos está protegido bajo `/api/admin`. Una transición permitida a
`cancelado` devuelve el stock una sola vez. Los testimonios se publican solo
después de que una persona cambie su estado a `approved` en la base de datos.
`POST /api/auth/registro` crea cuentas cliente; las cuentas admin se crean
manualmente con `npm run backend:crear-admin`.

## Generación y verificación

Los archivos HTML publicados se generan desde `frontend/fuentes/` con
`frontend/tools/construir.js`. No se editan los HTML generados a mano: se
cambia la fuente y se ejecuta el generador.

```bash
npm run generar
```

El comando genera las páginas públicas, las fichas de producto como
`producto-<slug>.html`, rellena los bloques de datos de
`public/js/catalogo-datos.js` y produce `sitemap.xml` y `robots.txt`.
Si `ZAPI_API_URL` está configurada, usa el catálogo de `GET /api/publicado`;
si el endpoint falla o todavía no existe, avisa y conserva los datos locales.
La verificación (`npm run verificar`) siempre usa los datos locales y no hace
solicitudes de red.

Para comprobar que todo está reproducible y coherente:

```bash
npm run test:backend
npm run verificar
npm run lint
npm run check
```

`npm run verificar` ejecuta las herramientas estáticas, confirma que el
HTML publicado coincide con lo que se generaría desde las fuentes, valida que
no queden restos del stack full-stack y comprueba el orden de carga de
scripts y CSS. `npm run lint` ejecuta ESLint sobre los archivos JavaScript.

## Estructura del proyecto

```
frontend/
  datos/
    catalogo.js   única fuente de productos, precios, slugs y stock
    testimonios.js  testimonios publicados a mano (lista vacía por defecto)
  fuentes/
    paginas/      fuentes de páginas públicas y del panel de administración
  public/
    css/          tokens, base, estructura y hojas por página, incluido admin
    js/           negocio, utilidades, catalogo-datos, carrito-estado,
                  pedidos-estado, modal, scripts de página, menu, buscador,
                  asistente
    img/          imágenes publicadas
  tools/
    lib/plantilla.js    cabecera, pie y órdenes de estilos y scripts compartidos
    construir.js        genera las páginas públicas
    generar-productos.js genera fichas y rellena datos del catálogo
    generar-sitemap.js  genera sitemap.xml y robots.txt
    servir.js           servidor estático local
  *.html                páginas generadas del sitio público
  sitemap.xml           mapa del sitio
  robots.txt             instrucciones para rastreadores
backend/
  app.js                 rutas y middleware de Express
  db.js                  conexión al driver oficial de MongoDB
  server.js              arranque de la API
  seed.js                sincroniza productos desde frontend/datos/catalogo.js
  indices.js             crea índices TTL manualmente (no se ejecuta en arranque)
  depurar.js             anonimiza pedidos viejos (script de depuración)
  routes/                endpoints de productos, pedidos y formularios
  lib/                   validación, rate limiting, errores HTTP, páginas públicas, eventos
vercel.json              publicación estática en Vercel y proxy de API a Render
render.yaml              servicio web de Render para el backend
```

Cada página pública comparte la misma cabecera y el mismo pie, generados desde
`frontend/tools/lib/plantilla.js`. El enlace “Mis pedidos” está en el pie y en
el carrito, no en la navegación principal.

## Pedidos

Los pedidos del sitio estático se arman en el carrito, se validan en el cliente
(nombre, teléfono y correo cuando se incluye) y se guardan en localStorage bajo “Mis pedidos”.
Al confirmar, el sitio abre WhatsApp con el detalle del pedido listo para
enviar. El stock del catálogo nunca se descuenta desde el navegador; se
mantiene a mano en `datos/catalogo.js`.

El API opcional descuenta stock en MongoDB al crear el pedido, sin modificar
el stock del catálogo del frontend.

## Contacto y testimonios

El formulario de contacto usa EmailJS con marcadores `PEGAR_*` en
`public/js/negocio.js`. Actualmente EmailJS **no está configurado en
producción**: se describe solo WhatsApp como canal de contacto en la política
de privacidad y se abrirá WhatsApp precargado si el envío falla o falta
configuración. Cuando EmailJS esté activo y probado, actualiza la política de
privacidad y carga las credenciales en el entorno.

Los testimonios se envían de la misma forma: por correo si EmailJS está
configurado, por WhatsApp como respaldo. La lista de testimonios publicados se
edita a mano en `datos/testimonios.js` y se renderiza en la portada durante
la generación.

## Despliegue del frontend en Vercel y la API en Render

Vercel publica solo el sitio estático de `frontend/`. Las rutas `/api/*` se
reenvían al servicio Render configurado en `vercel.json`. El navegador conserva
el mismo origen de Vercel, incluidas las cookies de sesión del administrador.

1. En Render, crea un Blueprint desde este repositorio usando `render.yaml`.
   El servicio usa la raíz del repositorio, instala dependencias con `npm ci`,
   inicia con `npm run backend` y verifica `/api/health`.
2. En Render, configura `MONGODB_URI` con la URI privada de Atlas. El Blueprint
   define `MONGODB_DB=zapi-api2`, `FRONTEND_ORIGINS=https://zapivivero.vercel.app`,
   `NODE_ENV=production` y `TRUST_PROXY=1`. `CRON_SECRET` debe ser un secreto
   aleatorio configurado también en Vercel para proteger el cron.
3. En Vercel, conecta el repositorio con **Root Directory** en la raíz. El
   build corre `npm run vercel-build` y publica `frontend/`. Configura:

   | Variable | Valor |
   |----------|-------|
   | `ZAPI_API_URL` | `https://zapi-backend.onrender.com` para generar con la API publicada |
   | `CRON_SECRET` | El mismo secreto configurado en Render |

   El proxy de `/api/*` apunta a `https://zapi-backend.onrender.com`. Si cambia
   el dominio del servicio Render, actualiza el destino en `vercel.json` y
   vuelve a desplegar Vercel. No configures `MONGODB_URI` en Vercel ni la
   guardes en el repositorio.
4. Desde tu computadora, con un `.env` local configurado para Atlas, ejecuta
   una sola vez y en este orden:

   ```bash
   npm run backend:conectar
   npm run backend:indices
   npm run backend:seed
   npm run backend:crear-admin
   ```

   Estos comandos verifican la conexión, preparan los índices, cargan los
   productos y crean el usuario administrador en MongoDB Atlas.
5. El cron diario de Vercel llama `/api/depurar` a través del proxy. La ruta
   anonimiza pedidos antiguos; las consultas y testimonios vencidos se eliminan
   por índices TTL.

El plan Hobby de Vercel es solo para uso no comercial. Si el proyecto se usa
con fines comerciales, hay que elegir un plan que lo permita.

## Comandos

- `npm run frontend`: servidor estático local en `http://localhost:5500`.
- `npm run backend`: servidor de la API local en `http://localhost:5501`.
- `npm run generar`: genera HTML, fichas de producto, datos del catálogo,
  sitemap y robots.
- `npm run verificar`: verificación estática de reproducibilidad y estructura.
- `npm run lint`: ESLint sobre los archivos JavaScript.
- `npm run check`: ejecuta lint, pruebas de backend y verificación en secuencia.
- `npm run backend:seed`: sincroniza productos desde `frontend/datos/catalogo.js`
  a MongoDB.
- `npm run backend:depurar`: anonimiza datos personales de pedidos con más de
  365 días. Ejecutado diariamente por el cron de Vercel.
- `npm run backend:indices`: crea los índices TTL de MongoDB manualmente
  (no se ejecuta en arranque).
- `npm run probar:flujo`: prueba el flujo real de la API y elimina sus datos;
  exige que `MONGODB_DB` termine en `_prueba`.
- `npm run probar:cors -- <url>`: prueba CORS contra la URL de la API dada
  (ej. `https://api.zapi.uy`).

## Notas sobre límites de Vercel Hobby

El plan Hobby de Vercel no admite uso comercial. Si el sitio de ZAPI tiene
fines comerciales, considera un plan de pago de Vercel o aloja la API en otro
servicio Node.js.
