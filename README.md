# ZAPI

Sitio del vivero ZAPI: una home de una sola página por secciones, un
catálogo con fichas estáticas, un carrito con checkout, cuentas de
usuario y un asistente por reglas.

El front no usa framework ni build: HTML en la raíz, recursos en
`public/`, catálogo y testimonios en `datos/`. El navegador carga los
archivos tal cual.

> El frontend es estático, pero autenticación y envío de opiniones
> requieren una API. En producción, el navegador usa el mismo origen
> y Netlify dirige `/api/*` a una Function que ejecuta Express.

## Stack

- **Frontend:** HTML + CSS + JavaScript clásico (sin módulos ni bundler).
- **Datos:** JSON generados en `public/data/` a partir de `datos/`.
- **Herramientas:** Node (>= 24) para generar y verificar.
- **API:** Express + MongoDB/Mongoose para autenticación.
- **Pruebas:** `node:test`, Supertest y MongoDB en memoria para la API.

## Requisitos

- Node 24 o superior y npm.

## Instalación

```sh
npm install
```

## Cómo correrlo

El sitio se sirve **solo por HTTP**. Abrir `index.html` con doble clic
no funciona: el navegador bloquea el `fetch` del catálogo y la grilla
queda vacía.

Servidor estático incluido (sin dependencias):

```sh
npm start          # http://localhost:5500
```

También sirve cualquier otro servidor estático desde la raíz, o la
extensión **Live Server / Live Preview** de VS Code (el puerto está
configurado en `.vscode/settings.json`).

Sin backend, el sitio es público: se puede consultar el catálogo, armar
un carrito y preparar pedidos por WhatsApp sin iniciar sesión. Las
cuentas y funciones que guardan datos en el servidor requieren una API.

## API

La API implementa `POST /api/auth/registro`, `POST /api/auth/login`,
`GET /api/auth/yo`, `POST /api/auth/logout` y `GET /api/health`.
Registro e inicio de sesión usan el contrato del frontend (`nombre`,
`email`, `clave`). La contraseña se guarda con bcrypt; el JWT se envía en
una cookie `HttpOnly`, no en `localStorage`. Las nuevas cuentas reciben
el rol `user`; solo el script administrativo explícito asigna `admin`.

Los modelos `ContactForm` permiten mensajes anónimos. `Order.userId` y
`Testimonio.userId` se toman de la sesión del servidor. Los pedidos
conservan IDs numéricos de catálogo, nombres, cantidades y precios
históricos; el backend calcula sus importes desde
`public/data/productos.json`, ignora precios y totales del navegador,
descuenta stock con actualización condicional y usa UYU. Las opiniones
quedan ocultas hasta ser verificadas y autorizadas por un administrador.

### Desarrollo local

1. Usá MongoDB Atlas o un MongoDB local configurado como replica set
   (`rs0`); los pedidos usan transacciones y no funcionan en una instancia
   local standalone. Atlas ya ofrece replica sets.
2. Copiá `.env.example` a `.env`; completá `MONGODB_URI` y generá un
   secreto aleatorio para `JWT_SECRET` (mínimo 32 bytes). No compartas ni
   subas `.env`.
3. En una terminal ejecutá `npm run start:api` (API en
   `http://localhost:5501`).
4. En otra, ejecutá `npm start` (sitio en `http://localhost:5500`).
   `public/js/config.js` ya apunta a la API local y adapta `localhost`,
   `127.0.0.1` o `::1` para que la página y la API usen el mismo host.
   En desarrollo también se permiten orígenes HTTP de `localhost` y
   `127.0.0.1` con cualquier puerto; en producción sigue aplicándose
   únicamente la lista exacta de `FRONTEND_ORIGINS`.
5. El login y registro crean una cookie de sesión `HttpOnly`. En local
   usa `SameSite=Lax`; en producción se configura
   `SameSite=Lax; Secure`.

Para probar el sitio y las Functions juntas localmente, ejecutá
`npx netlify-cli dev` y abrí `http://localhost:8888`. Ese puerto usa rutas
relativas hacia las Functions; Live Server en 5500 sigue usando la API
local en 5501. Netlify CLI usa las variables de tu entorno local y el
backend carga `.env` durante el desarrollo.

No guardes contraseñas en el frontend ni en `localStorage`. La cookie
HttpOnly se adjunta mediante `fetch(..., { credentials: "include" })`;
esa opción ya está configurada en los flujos de autenticación existentes.

Ejemplo de login para otro cliente web:

```js
const respuesta = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, clave })
});

const datos = await respuesta.json();
if (!respuesta.ok) throw new Error(datos.error);

// La cookie HttpOnly mantiene la sesión; no copies ningún token a localStorage.
```

### Crear el usuario administrador

No existe una contraseña de administrador en el código. Para crear o
actualizar un administrador, ejecutá `npm run admin:crear` con
`MONGODB_URI`, `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos
como variables de entorno en una terminal segura o en el gestor de
secretos del despliegue. La contraseña debe ser nueva, única y tener al
menos 12 caracteres. No reutilices una contraseña que ya hayas compartido.
Este comando explícito guarda únicamente su hash y asigna el rol `admin`.

### Despliegue (Netlify Functions y Atlas)

1. En Netlify, vinculá el sitio al repositorio de GitHub. `netlify.toml`
   configura la publicación estática desde la raíz y las funciones desde
   `netlify/functions`; no hay paso de compilación.
2. En **Project configuration → Environment variables**, configurá para
   producción:
   - `NODE_ENV=production`
   - `MONGODB_URI` con la URI de conexión de MongoDB Atlas.
   - `JWT_SECRET` con un secreto aleatorio de al menos 32 bytes.
   - `FRONTEND_ORIGINS=https://zapiweb.netlify.app` (sumá el origen de
     deploy previews solo si querés permitir escrituras desde ellos).
   - `COOKIE_SAME_SITE=lax`
   - `COOKIE_SECURE=true`
   - `TRUST_PROXY=1`
3. En Atlas, abrí **Network Access** y permití `0.0.0.0/0` para aceptar las
   conexiones salientes dinámicas de las Functions. Esto amplía el origen
   de red permitido; protegé la base con credenciales fuertes y permisos
   mínimos.
4. Subí los cambios a GitHub y esperá el deploy automático de Netlify. El
   navegador usa rutas relativas `/api/*`; la cookie `HttpOnly; Secure;
   SameSite=Lax; Path=/api` queda bajo el mismo origen de Netlify.
5. Verificá `https://zapiweb.netlify.app/api/health`. Los logs de ejecución
   están en **Netlify → Functions → api → Logs**.

Netlify Functions reutiliza la conexión Mongoose mientras una instancia
permanece activa y limita el pool a cinco conexiones por instancia. Los
límites sincrónicos documentados por Netlify son 60 segundos y 6 MB por
request/response bufferizado; esta API solo acepta JSON de hasta 16 KB y
no procesa archivos. El backend actual no inicia sockets, procesos
persistentes ni tareas programadas. Las operaciones de pedidos usan
transacciones, por lo que MongoDB debe ser un replica set (incluido Atlas).

**Limitaciones y notas**

- `express-rate-limit` usa memoria por instancia. En serverless, el
  contador puede reiniciarse o diferir entre instancias; no es un límite
  global compartido. Para límites consistentes se necesita un store común.
- El asistente funciona con respuestas FAQ locales; no hace llamadas a
  una ruta de API ni depende de un servicio remoto.
- Nunca subas `.env` ni arrastres la carpeta completa a una publicación
  manual de Netlify. Los deploys deben venir de GitHub; las reglas de
  `netlify.toml` bloquean además rutas sensibles bajo la raíz publicada.

### Endpoints

| Método y ruta | Comportamiento |
|---|---|
| `POST /api/auth/registro` | Valida datos, crea cuenta `user` y abre sesión. Contraseña: 12–128 caracteres. |
| `POST /api/auth/login` | Valida credenciales y abre sesión. |
| `GET /api/auth/yo` | Devuelve el usuario autenticado o `401`. |
| `POST /api/auth/logout` | Elimina la cookie de sesión. |
| `GET /api/stock` | Público; devuelve unidades por ID de producto. |
| `PUT /api/stock/:id` | Admin; actualiza unidades (`{ "unidades": 10 }`). |
| `POST /api/pedidos` | Requiere sesión; calcula precios/total y descuenta stock. |
| `GET /api/pedidos` | Requiere sesión; historial propio, máximo 50. |
| `POST /api/contacto` | Público; guarda consultas y acepta honeypot `sitio_web`. |
| `GET /api/testimonios` | Público; solo opiniones verificadas y autorizadas. |
| `POST /api/testimonios` | Requiere sesión; crea opinión pendiente de moderación. |
| `PATCH /api/testimonios/:id/aprobar` | Admin; verifica y autoriza una opinión. |
| `GET /api/health` | Comprueba disponibilidad HTTP. |

Los endpoints de lectura tienen un límite de 120 solicitudes por minuto
por IP; los de escritura, 20 por cada 10 minutos. Para inicializar el
stock desde el catálogo con 10 unidades para cada producto nuevo, ejecutá
`npm run stock:sembrar`. Las ejecuciones posteriores actualizan nombre y
precio de referencia sin reemplazar las unidades existentes.

## Funcionalidad sin backend

`public/js/config.js` decide si hay API. En hosts locales usa
`URL_API_LOCAL`, excepto con `netlify dev` en el puerto 8888, que usa
rutas relativas; producción también usa rutas relativas y Netlify dirige
`/api/*` a Functions. `window.__ZAPI_API__` y el meta `zapi-api` siguen
disponibles como overrides.

- **Catálogo:** se lee `public/data/productos.json`.
- **Stock:** con la API configurada se consulta el inventario de MongoDB; sin API se usa el valor de demostración local.
- **Carrito / checkout:** el carrito se guarda en este dispositivo y el
  pedido se completa por WhatsApp sin API. En el backend los importes son
  UYU: el envío es gratis desde 2500; por debajo se coordina.
- **Cuentas:** requieren una API configurada; no hay credenciales locales
  ni contraseñas almacenadas en el código del navegador.
- **Mis pedidos:** sin API, los pedidos preparados se guardan en
  `localStorage` (`zapiPedidosLocal`) y se pueden cancelar (repone el
  stock local).
- **Contacto:** con API la consulta se guarda en MongoDB y se intenta enviar el aviso por EmailJS; sin API se usa solo EmailJS.
- **Opiniones:** se leen de la API únicamente si cada registro incluye
  `verificado: true` y `autorizado: true`; el archivo de datos está vacío.
- **Asistente:** responde por reglas con el catálogo, sin servicio externo.

El login usa autenticación de servidor. No configures contraseñas de demo
ni sesiones locales como sustituto de la API.

Para cambiar la URL de API en local, configurá `URL_API_LOCAL` en
`config.js` (o inyectá `window.__ZAPI_API__` / un meta `zapi-api`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Sirve el sitio estático en `http://localhost:5500`. |
| `npm run start:api` | Inicia la API Express (requiere `.env` y MongoDB). |
| `npx netlify-cli dev` | Sirve el sitio y las Functions localmente en `http://localhost:8888`. |
| `npm run admin:crear` | Crea o actualiza un administrador desde variables de entorno. |
| `npm run stock:sembrar` | Inicializa stock desde el catálogo y preserva unidades existentes. |
| `npm run test:api` | Ejecuta pruebas de autenticación y API con MongoDB en memoria. |
| `npm run lint` | ESLint sobre todo el repo. |
| `npm run verificar` | Verificación estática de CSS, ARIA, IDs, referencias, XSS, reduced motion y archivos generados. No modifica archivos. |
| `npm run check` | `lint` + `verificar`. Correr antes de commitear. |
| `npm run contraste` | Verifica el contraste de los pares de color. |
| `npm run generar` | Regenera `productos/*.html` desde `datos/catalogo.js` (y poda fichas huérfanas). |
| `npm run generar:testimonios` | Regenera `public/data/testimonios.json` desde `datos/testimonios.js`. |
| `npm run css` | Regenera `catalogo-modal.css` y `catalogo-catalogo.css` desde `catalogo.css`. |
| `npm run sitemap` | Regenera `sitemap.xml`. |

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
tools/                          Servidor estático, generadores y verificadores.
```

## Datos: una sola fuente

- **Catálogo:** `datos/catalogo.js` es la fuente. De ahí salen las
  tarjetas del navegador (`public/data/productos.json`), las fichas de
  `productos/` (`npm run generar`) y `sitemap.xml`. Para cambiar un
  precio se toca solo `datos/catalogo.js`, y después `npm run generar`
  y `npm run verificar`.
- **Testimonios:** `datos/testimonios.js` es la fuente para sembrar la
  API. No se publican opiniones hasta contar con testimonios verificados
  y autorizados.

La verificación compara archivos sin regenerarlos ni podar fichas.
Después de cambiar una fuente, ejecutá por separado el generador
correspondiente (`npm run css`, `npm run generar` o
`npm run generar:testimonios`) y revisá los cambios antes de commitear.

## Formulario de contacto

`index.html` → `public/js/contacto.js` valida y dispara un aviso por
correo con **EmailJS** (SDK desde jsdelivr). Sin backend no hay dónde
guardar la consulta: el aviso por correo es el único envío.

El mapa de la sección "Nosotros" es un embed de Google Maps
(`frame-src https://www.google.com`, `connect-src`/`script-src`
acotados a los dominios que el sitio usa).

## Asistente

`public/js/zapi-bot.js` responde por palabras clave con las reglas de
negocio y el catálogo real: las recomendaciones se filtran contra el
catálogo, así que nunca sale un producto inventado. No depende de
ningún servicio externo.

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
| ESLint (`npm run lint`) | 0 errores |
| Tests | `npm run test:api` |
| Formateador automático | no hay, a propósito |
| CI | no hay |
