# ZAPI

Sitio del vivero ZAPI: una home de una sola página por secciones, un
catálogo con fichas estáticas, un carrito con checkout, cuentas de
usuario y un asistente por reglas.

El front no usa framework ni build: HTML en la raíz, recursos en
`public/`, catálogo y testimonios en `datos/`. El navegador carga los
archivos tal cual. El backend es Express + MongoDB (Mongoose) y sirve
el sitio estático y la API desde el mismo proceso.

## Stack

- **Frontend:** HTML + CSS + JavaScript clásico (sin módulos ni bundler).
- **Backend:** Node (>= 24), Express 5, Mongoose 9, Helmet.
- **Base de datos:** MongoDB (local o Atlas).
- **Pruebas:** `node:test` + Supertest + `mongodb-memory-server`.

## Requisitos

- Node 24 o superior y npm.
- MongoDB para correr el backend (local `mongodb://127.0.0.1:27017/zapi`
  o Atlas). Las pruebas no necesitan Mongo instalado: levantan una
  instancia efímera en memoria.

## Instalación

```sh
npm install
```

## Cómo correrlo

El sitio se sirve **solo por HTTP**. Abrir `index.html` con doble clic
no funciona: el navegador bloquea el `fetch` del catálogo y la grilla
queda vacía.

De forma recomendada, con el backend (sirve estáticos + API):

```sh
npm start          # http://localhost:5501
npm run dev        # igual, con recarga al guardar (--watch)
```

Para ver solo el front, cualquier servidor estático desde la raíz
sirve (por ejemplo `npx serve`), pero el carrito, el login, los
pedidos y el asistente necesitan el backend.

## Variables de entorno

`npm start` y `npm run dev` cargan `.env` con
`--env-file-if-exists=.env`: sin el archivo el servidor arranca igual
con los valores por defecto. Para crearlo:

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
| `CLIENT_URL` | `http://localhost:5501` | Orígenes autorizados para CORS, separados por coma. |
| `ZAPI_LIMITE_LECTURA` | `120` por minuto | Rate limit de lectura (catálogo, testimonios, salud). |
| `ZAPI_LIMITE_ESCRITURA` | `20` por 10 min | Rate limit de escritura (contacto, carrito, pedidos, testimonios). |
| `ZAPI_LIMITE_AUTH` | `10` por 10 min | Rate limit de registro y login. |
| `ZAPI_LIMITE_CHAT` | `15` por minuto | Rate limit del chat del asistente. |
| `ZAPI_FAQ_UMBRAL` | `0.55` | Parecido (0–1) mínimo para reutilizar una FAQ guardada. |
| `ZAPI_SESSION_SECRET` | vacío | Clave para firmar la cookie de la sesión anónima del carrito. Obligatoria en `production`. |
| `ZAPI_ADMIN_TOKEN` | vacío | Token de administración (`PUT /api/stock/:id`, testimonios admin). Va en la cabecera `x-zapi-token`. |

Nunca se versiona un `.env`: solo `.env.example`, con valores falsos.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta el backend (Express + MongoDB) en `PORT`. |
| `npm run dev` | Igual, con recarga al guardar. |
| `npm test` | Pruebas de la API y los validadores (`node:test` + Supertest + Mongo en memoria). |
| `npm run lint` | ESLint sobre todo el repo. |
| `npm run verificar` | Verificación estática (CSS, ARIA, IDs, referencias, XSS, reduced motion, generados). Regenera el CSS derivado y las fichas. |
| `npm run check` | `lint` + `verificar`. Correr antes de commitear. |
| `npm run contraste` | Verifica el contraste de los pares de color. |
| `npm run generar` | Regenera `productos/*.html` desde `datos/catalogo.js` (y poda fichas huérfanas). |
| `npm run generar:testimonios` | Regenera `public/data/testimonios.json` desde `datos/testimonios.js`. |
| `npm run css` | Regenera `catalogo-modal.css` y `catalogo-catalogo.css` desde `catalogo.css`. |
| `npm run sitemap` | Regenera `sitemap.xml`. |
| `npm run crear:usuario` | Crea una cuenta desde la terminal. |

## Estructura

```
index.html, catalogo.html, carrito.html, pedidos.html,
login.html, 404.html            Páginas. Los HTML viven en la raíz.
productos/                      Fichas estáticas, generadas.
datos/                          Fuentes que se editan a mano
                                (catalogo.js, testimonios.js).
public/data/                    JSON que baja el navegador (generados).
public/js/                      Scripts del navegador.
public/css/                     Hojas de estilo (catalogo.css es la
                                fuente; catalogo-*.css se generan).
public/img/                     Imágenes optimizadas.
backend/src/                    Express + Mongoose (app.js, server.js).
backend/tests/                  Pruebas.
tools/                          Generadores y verificadores.
```

## API

Todo cuelga de `/api`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/salud` | Estado del servidor y de Mongo. |
| `GET` | `/api/productos` | Catálogo con el stock pegado. |
| `GET` | `/api/productos/:id` | Una ficha, por id o slug. |
| `GET` | `/api/stock` | Stock de todo el catálogo. |
| `PUT` | `/api/stock/:id` | Cargar o cambiar el stock (token de admin). |
| `GET` | `/api/carrito` | Carrito de la sesión. |
| `POST` | `/api/carrito` | Agregar un producto `{ id, cantidad? }`. |
| `PATCH` | `/api/carrito/:id` | Fijar la cantidad `{ cantidad }`. |
| `DELETE` | `/api/carrito/:id` | Sacar el producto. |
| `GET` | `/api/pedidos` | Historial de la cuenta (exige cuenta). |
| `POST` | `/api/pedidos` | Cerrar el pedido (exige cuenta). |
| `POST` | `/api/auth/registro` | Crear cuenta `{ nombre, email, clave }`. |
| `POST` | `/api/auth/login` | Ingresar `{ email, clave }`. |
| `POST` | `/api/auth/logout` | Cerrar sesión. |
| `GET` | `/api/auth/yo` | La cuenta de la sesión, o `null`. |
| `GET` | `/api/testimonios` | Opiniones publicadas. |
| `POST` | `/api/testimonios` | Guardar una opinión (exige cuenta). |
| `GET` | `/api/testimonios/todos` | Todas, con id y estado (token). |
| `PATCH` | `/api/testimonios/:id` | Publicar o despublicar (token). |
| `POST` | `/api/contacto` | Consulta del formulario. |
| `GET` | `/api/asistente/config` | Config del asistente. |
| `POST` | `/api/asistente/chat` | Mensaje al asistente `{ mensaje }`. |
| `POST` | `/api/asistente/tracking` | Evento de navegación. |

El total de un pedido lo calcula el servidor con el precio de la base:
lo que llegue del cliente (precio, subtotal) no se guarda ni se cobra.
Sin stock suficiente responde `409 { error, shortages }`.

`POST /api/contacto` recibe `{ nombre, correo, asunto, telefono,
consulta, sitio_web }`. `sitio_web` es el honeypot: si viene relleno,
responde `201` sin guardar nada. `asunto` es obligatorio; `telefono`
es opcional.

## Datos: una sola fuente

- **Catálogo:** `datos/catalogo.js` es la fuente. De ahí salen las
  tarjetas del navegador (`public/data/productos.json`), las fichas de
  `productos/` (`npm run generar`) y `sitemap.xml`. Para cambiar un
  precio se toca solo `datos/catalogo.js`, y después `npm run generar`
  y `npm run verificar`.
- **Testimonios:** `datos/testimonios.js` es la fuente. De ahí sale
  `public/data/testimonios.json` (`npm run generar:testimonios`), que
  siembra el backend y sirve de respaldo al carrusel si la API no está.

`npm run verificar` regenera el CSS derivado y las fichas, así que hay
que commitear también esos archivos generados cuando cambie la fuente.

## Cuentas y sesiones

Hay dos cookies y no se pisan:

- `zapi_sesion`: sesión **anónima** del carrito. Valor firmado con
  HMAC-SHA256 (`ZAPI_SESSION_SECRET`), `HttpOnly`, `SameSite=Lax`,
  `Secure` en producción. Se crea sola en la primera petición.
- `zapi_auth`: sesión de **cuenta**. Token opaco que se guarda en la
  colección `sesiones`; sin firma porque no lleva datos que
  falsificar. `HttpOnly`, `SameSite=Lax`, `Secure` en producción.

Ver el historial y cerrar un pedido exigen cuenta (`exigirSesion`).
Registro y login van con su propio rate limit (`ZAPI_LIMITE_AUTH`).

## Formulario de contacto

`index.html` → `public/js/contacto.js` valida y manda a
`POST /api/contacto`. Si el backend responde `201`, además se dispara
un aviso por correo con **EmailJS** (SDK desde jsdelivr). El aviso es
best-effort: la consulta ya quedó guardada en el backend, así que si
EmailJS falla aparece un aviso flotante en pantalla y no se pierde
nada.

El mapa de la sección "Nosotros" es un embed de Google Maps
(`frame-src https://www.google.com`, `connect-src`/`script-src`
acotados a los dominios que el sitio usa).

## Asistente

`public/js/zapi-bot.js` responde por palabras clave y, si el backend
está disponible, consulta `POST /api/asistente/chat` para una
respuesta con recomendaciones del catálogo. El flujo vive en el
backend: resume los intereses del visitante (colección `eventos`),
busca una FAQ parecida y, si no la encuentra, arma la respuesta con las
reglas de negocio (`backend/src/config/business.js`) y la guarda. Las
recomendaciones se filtran contra el catálogo real: nunca sale un
producto inventado. No depende de ningún servicio externo.

## Seguridad

- **CSP estricta** con Helmet (`script-src`/`connect-src`/`frame-src`
  acotados) y cabeceras `X-Frame-Options`, `nosniff`,
  `Referrer-Policy`.
- **Rate limiting** por IP en los endpoints de escritura, sin
  dependencias.
- **Límite de 16 kB** en el cuerpo de las peticiones.
- **Honeypot** `sitio_web` y validación por campo (`{ error, campo }`).
- **Cookies `HttpOnly`** firmadas o con token opaco; `Secure` en
  producción.
- **Stock y administración** detrás de `ZAPI_ADMIN_TOKEN`
  (`x-zapi-token`), comparado por hash con `timingSafeEqual`.
- **Rutas sensibles bloqueadas** (`/backend`, `/tools`, `/datos`,
  `/.env`, `/package.json`).
- **XSS:** toda interpolación pasa por `escaparHTML`, y
  `npm run verificar` escanea ese patrón.

## Convenciones

- Indentación de 4 espacios; sin formateador automático.
- `.editorconfig` fija UTF-8, LF, 4 espacios y sin espacios al final
  de línea.
- Tras editar `catalogo.css` hay que correr `npm run css` (ese archivo es
  la fuente de `catalogo-catalogo.css` y `catalogo-modal.css`).

## Estado de verificación

| Qué | Estado |
|---|---|
| Verificación estática (`npm run verificar`) | OK |
| Contraste de color (`npm run contraste`) | OK |
| ESLint (`npm run lint`) | 0 errores, 6 warnings (históricos) |
| Tests del backend (`npm test`) | 62 en verde |
| Formateador automático | no hay, a propósito |
| CI | no hay |
