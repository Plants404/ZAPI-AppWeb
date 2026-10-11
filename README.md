# ZAPI

Sitio de ZAPI: una home con secciones, un catálogo de productos con fichas
individuales y un carrito que termina en pedido.

Es un proyecto sin framework de frontend y sin build: HTML en la raíz,
recursos en `public/`, el catálogo en `datos/`, el backend en `backend/` y
las herramientas en `tools/`. El navegador carga los archivos tal cual, sin
transpilar nada. El backend sí usa dependencias de producción (`express`,
`mongoose` y `helmet`).

> El backend nuevo vive en `backend/` (Express + MongoDB con Mongoose) y
> por ahora cubre lo que el frontend realmente usa: `POST /api/contacto`,
> `GET /api/salud` y `GET /api/testimonios`. Reemplaza al backend anterior
> (Express + SQLite), que se había borrado. El carrito sigue en el navegador
> con checkout por WhatsApp; los pedidos y el stock todavía no tienen API.

## Requisitos

- **Node 24 o superior** (`package.json` lo fija con `engines`) y npm.
- **MongoDB** para el backend: local (`mongodb://127.0.0.1:27017/zapi`) o
  Atlas. Las pruebas no necesitan un Mongo instalado: levantan una instancia
  efímera en memoria. No hace falta compilar nada.

## Instalación

```sh
npm install
```

## Cómo ver el sitio

El sitio se abre **solo por HTTP**, con cualquier servidor estático. Abrir
`index.html` con doble clic ya no funciona: el navegador le bloquea al pedido
de `productos.json` y el catálogo queda vacío. La razón de esto está al
principio de `datos/catalogo.js`.

```sh
npx serve          # levanta en http://localhost:3000
```

O el Live Server de VSCode, o `python -m http.server` desde la carpeta raíz.

## Backend

El backend sirve el sitio estático **y** la API desde el mismo Express. Es
la forma recomendada de abrir el sitio en desarrollo:

```sh
npm start          # http://localhost:5501
```

El servidor se conecta a MongoDB **antes** de escuchar: si la base no
responde, no arranca (mejor un error al arrancar que un formulario que se
pierde en silencio). Al recibir `Ctrl+C` cierra el servidor y la base de
forma ordenada.

### Variables de entorno

`npm start` carga el `.env` solo: el script lleva
`--env-file-if-exists=.env`, así que **sin el archivo el servidor arranca
igual** con los valores por defecto. Para copiarlo:

```sh
# PowerShell
copy .env.example .env
# Linux/Mac
cp .env.example .env
```

| Variable | Por defecto | Para qué |
|---|---|---|
| `NODE_ENV` | `development` | `production` activa caché de estáticos, exige `MONGODB_URI` y oculta las trazas de error. |
| `PORT` | `5501` | Puerto HTTP. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/zapi` | Cadena de conexión de MongoDB. |
| `CLIENT_URL` | vacío | Orígenes autorizados para CORS, separados por coma. Vacío = solo mismo origen. |
| `ZAPI_LIMITE_LECTURA` | `120` por minuto | Rate limit de lectura. |
| `ZAPI_LIMITE_ESCRITURA` | `20` por 10 min | Rate limit de escritura (contacto). |

Nunca se versiona un `.env`: solo `.env.example`, con los nombres y valores
falsos.

### Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/salud` | Estado del servidor y de Mongo. `200` si Mongo responde, `503` si no. |
| `GET` | `/api/testimonios` | Opiniones publicadas, con la forma que usa el carrusel (`{ testimonios }`). |
| `POST` | `/api/contacto` | Consulta del formulario. `201 { ok: true }` o `400 { error, campo }`. |

`POST /api/contacto` recibe `{ nombre, correo, telefono, consulta, sitio_web }`.
`sitio_web` es el honeypot del formulario: si viene relleno, responde `201`
sin guardar nada. La validación del servidor es la misma que la del
navegador (`public/js/contacto.js`), porque el formulario se puede mandar
con `curl`.

### MongoDB

Colecciones (Mongoose crea los índices al conectar):

- `mensajes`: consultas del formulario. Estado `nuevo` por defecto.
- `testimonios`: opiniones del carrusel. Solo se listan las `publicado: true`.

Todavía no hay una fuente real de testimonios: la API devuelve una lista
vacía y el front sigue con su respaldo de `public/js/testimonios.js`. Por eso
`testimonios` no requiere cargar nada para que el sitio ande.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta el backend Express + MongoDB en `PORT` (5501). Carga `.env` si existe. |
| `npm run dev` | Igual que `start`, con recarga al guardar (`node --watch`). |
| `npm test` | Pruebas de la API y del validador (`node:test` + Supertest + MongoDB en memoria). |
| `npm run verificar` | Verificación estática: regenera el CSS derivado, compara los `slug`, valida assets, IDs y scripts. **Correlo antes de commitear.** |
| `npm run lint` | ESLint sobre todo el repo. At typos en nombres que nadie declara, código inalcanzable y variables muertas. |
| `npm run check` | `lint` + `verificar`, para correr antes de commitear. |
| `npm run contraste` | Comprueba que los pares de color cumplen el mínimo de contraste. |
| `npm run generar` | Regenera las fichas de `productos/` desde `datos/catalogo.js`. También **poda** las fichas cuyo producto ya no está en el catálogo. |
| `npm run sitemap` | Regenera `sitemap.xml`. |
| `npm run css` | Regenera `public/css/catalogo-modal.css` y `catalogo-catalogo.css` desde `public/css/catalogo.css`. |

### Sobre la poda de fichas

Si renombrás o sacás un producto, su ficha vieja se queda en `productos/` y,
como `generar-sitemap.js` lee esa carpeta, entra al sitemap con el precio
anterior. Por eso el generador la borra.

Solo borra lo que se puede demostrar que generó él: un `canonical` que apunta
a la URL pública de esa misma ficha más el JSON-LD de `Product`. Un `.html`
escrito a mano no tiene las dos cosas, así que queda intacto y el generador lo
avisa. Para correr sin borrar nada: `node tools/generar-productos.js --sin-poda`.

`npm run verificar` también corre el generador, así que podar le toca a
él; por eso reporta las fichas que borra en vez de hacerlo callado.

## Estructura

```
index.html, catalogo.html, carrito.html   Páginas. Los HTML viven en la raíz.
productos/                                 Fichas estáticas, generadas.
datos/catalogo.js                           Fuente del catálogo. La
                                           edita el humano, la leen los
                                           generadores, el navegador no.
public/data/productos.json                  Catálogo que baja el navegador
                                           con fetch. Se genera.
public/js/                                 Scripts del navegador.
public/css/                                CSS. catalogo.css es la fuente;
                                           las dos catalogo-*.css se generan.
public/img/                                Imágenes, ya optimizadas (.opt).
backend/src/                               Express + Mongoose: app.js arma la
                                           app, server.js conecta y escucha.
backend/tests/                             Pruebas de la API y del validador.
tools/                                     Generadores y verificadores.
```

## El catálogo tiene una sola fuente

`datos/catalogo.js` es la fuente de verdad del catálogo. De ahí salen las
tarjetas del navegador, las fichas de `productos/` (`npm run generar`) y
`sitemap.xml`.

Como `datos/catalogo.js` es un `.js` de Node, el navegador nunca lo ve: de ahí
`npm run generar` escribe `public/data/productos.json`, que es lo que el
navegador baja con `fetch` y se versiona para que `npm run verificar` pueda
comprobar que no quedó viejo.

Antes el catálogo viajaba dentro de `public/js/productos.js` y para leerlo
sin `require()` —el archivo usa `window` y `document`— había que arrancar
el texto a mano con un contador de llaves y evaluarlo con `Function()`. Ese
`emparejar()` era **frágil ante cambios de formato**: un reformateo, unas
comillas simples o un corchete dentro de un comentario partían el catálogo.
`JSON.parse` no tiene ese problema.

Si tocás un precio, tocá **un solo lugar**: `datos/catalogo.js`. Después
`npm run generar` y `npm run verificar`. El mismo orden de siempre: generar
primero, porque verificar corre el generador antes de mirar lo que hay en
disco.

## Convenciones

- **Comentarios que explican el porqué**, no el qué. Es la convención del
  repo, no una regla impuesta: seguila cuando agregues código.
- **Identación de 4 espacios.** Las comillas dobles son las mayoritarias;
  algunos archivos (los más viejos) usan simples. No hay formateador
  automático: cuidado con reformatear masivamente.
- **No borrar CSS sin verificar.** Varios archivos mezclan el
  español/inglés de cuando se renombraron las clases; ya se limpiaron los
  restos, pero la idea sigue vigente.

### Linter

```sh
npm install          # instala eslint y globals, que son de desarrollo
npm run lint
```

`eslint.config.js` no es una lista de estilo genérica. El sitio carga los
scripts de `public/js` con `<script>` clásicos, uno detrás de otro, sin
módulos, así que **todo lo que `productos.js` declara al nivel superior
queda disponible en los que se cargan después**. ESLint analiza archivo por
archivo y ve esos nombres como no definidos, así que la lista `DEL_CATALOGO`
de la config declara el contrato entre scripts:

| Nombre | Qué es |
|---|---|
| `PRODUCTOS`, `precios` | el catálogo y el mapa de precios |
| `escaparHTML`, `formatearPrecio` | helpers de texto y de precio |
| `obtenerCarrito`, `guardarCarrito` | leer y guardar el carrito |
| `agregarProductoAlCarrito`, `suscribirAlCarrito`, `actualizarContador` | suma y avisos de cambio |

Si agregás un global nuevo de `productos.js`, agregalo ahí también, o el
linter va a marcar al archivo que lo consume. Esa lista es la única parte
del proyecto donde el orden de carga de los `<script>` importa de verdad.

Además de `no-undef`, la config prende reglas de error obvio
(`no-unreachable`, `no-dupe-keys`, `no-var`, `no-implicit-globals` en las
herramientas). `eqeqeq` está en **warning**, no en error: hay 6 `==`
pendientes de revisar y no vale la pena romper el build por eso.

`.editorconfig` fija UTF-8, LF, 4 espacios y sin espacios al final de línea,
para que dos editores no peleen por el mismo archivo.

## Seguridad

Lo que se conserva del sitio estático:

- Toda interpolación pasa por `escaparHTML` antes de tocar el DOM, y
  `npm run verificar` escanea ese patrón (sección XSS).
- `/data/` fuera de git, y `.env` (con los secretos) también.

Lo que agrega el backend:

- **CSP estricta** y cabeceras con Helmet (`X-Frame-Options`, `nosniff`,
  `Referrer-Policy`). La CSP deja `connect-src`/`script-src` en `'self'`:
  un script inyectado por un XSS no llega a ejecutarse ni a hablar con otro
  servidor.
- **Rate limiting** por IP en los endpoints de escritura, sin dependencias.
- **Límite de 16 kB** en el cuerpo de las peticiones.
- **Honeypot** `sitio_web` validado en el servidor, y validación por campo
  con `{ error, campo }` para que el front marque el input correcto.
- **Rutas bloqueadas**: `/backend`, `/tools`, `/datos`, `/.env`,
  `/package.json` y compañía nunca se sirven, aunque el sitio se sirva desde
  la raíz.
- **CSRF**: el backend no usa cookies de sesión, así que no hay superficie
  CSRF. Si algún día se agrega login, hay que revisarlo de nuevo.

## Estado de verificación

| Qué | Estado |
|---|---|
| Verificación estática (`npm run verificar`) | ✅ |
| Contraste de color (`npm run contraste`) | ✅ |
| ESLint (`npm run lint`) | ✅ 0 errores, 6 warnings de `eqeqeq` |
| `.editorconfig` | ✅ |
| Tests del backend (`npm test`) | ✅ 19 tests (`node:test` + Supertest + Mongo en memoria) |
| Formateador automático | ❌ no hay, a propósito |
| CI | ❌ no hay |