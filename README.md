# ZAPI

Sitio de ZAPI: una home con secciones, un catálogo de productos con fichas
individuales y un carrito que termina en pedido.

Es un proyecto sin framework y sin build: HTML en la raíz, recursos en
`public/`, servidor en `server.js` y utilidades en `tools/`. **Una sola
dependencia** (`express`). El navegador carga los archivos tal cual, sin
transpilar nada.

## Requisitos

- **Node 24 o superior** (`package.json` lo fija con `engines`). Se usa
  `node:sqlite`, que es nativo desde Node 22 y estable en 24.
- No hace falta compilar nada.

## Instalación

```sh
npm install
```

## Cómo arrancar

```sh
npm start          # servidor en http://localhost:5501
```

El sitio **también funciona sin servidor**: `index.html` se puede abrir con
doble clic. En esa forma no hay API, ni pedidos, ni carrito persistente; el
catálogo se dibuja desde `public/js/productos.js`.

### Variables de entorno

`npm start` carga el `.env` solo: el script `start` lleva
`--env-file-if-exists=.env`. El sufijo `-if-exists` importa, porque hace que
el servidor **arranque igual sin el archivo** en vez de romperse. Así que
copiar el `.env` es opcional y todos los ajustes tienen valor por defecto.

```sh
# PowerShell
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Después de copiarlo, `npm start` ya lo toma. Si prefieres arrancar el
servidor sin npm, hay que pasar el archivo a mano:

```sh
node --env-file=.env server.js
```

Ojo: si `.env` no existe, Node escribe un aviso en la consola y sigue.

| Variable | Por defecto | Para qué |
|---|---|---|
| `ZAPI_SESSION_SECRET` | se genera al azar en cada arranque | Firma la cookie de sesión del carrito. **Sin esto, reiniciar borra los carritos abiertos.** |
| `ZAPI_ADMIN_TOKEN` | vacío | Se manda en `x-zapi-token` para cambiar stock. Vacío = la carga de stock queda deshabilitada. |
| `PORT` | `5501` | Puerto del servidor. |
| `NODE_ENV` | vacío | `production` activa cookies `Secure`, caché de estáticos y oculta el aviso de modo desarrollo. |
| `ZAPI_DB` | `data/zapi.db` | Ruta del SQLite. Cambiarla crea otra base, con su propio catálogo. |
| `ZAPI_LIMITE_LECTURA` | `120` por minuto | Rate limit de lectura del catálogo. |
| `ZAPI_LIMITE_ESCRITURA` | `20` por 10 min | Rate limit de escritura (carrito, pedidos, contacto, stock). |

Los dos límites están en `.env.example` porque `npm run api` los sube para
poder hacer cuarenta escrituras seguidas sin comerse un `429`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta el servidor Express en `PORT` (5501). Carga `.env` si existe. |
| `npm run verificar` | Verificación estática: regenera el CSS derivado, compara los `slug`, valida assets, IDs y scripts. **Correlo antes de commitear.** |
| `npm run lint` | ESLint sobre todo el repo. At typos en nombres que nadie declara, código inalcanzable y variables muertas. |
| `npm run check` | `lint` + `verificar`, para correr antes de commitear. |
| `npm run contraste` | Comprueba que los pares de color cumplen el mínimo de contraste. |
| `npm run api` | Prueba de extremo a extremo de la API. Levanta su propio servidor en un puerto libre, con base y secretos de prueba, así que no necesita el tuyo arrancado ni toca `data/zapi.db`. |
| `npm run generar` | Regenera las fichas de `productos/` desde `public/js/productos.js`. También **poda** las fichas cuyo producto ya no está en el catálogo. |
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
public/js/                                 Scripts del navegador.
public/css/                                CSS. catalogo.css es la fuente;
                                           las dos catalogo-*.css se generan.
public/img/                                Imágenes, ya optimizadas (.opt).
server.js                                  Express, cabeceras, rate limit.
server/                                    db.js, rutas-api.js, sesion.js,
                                           catalogo.js (lee el catálogo).
tools/                                     Generadores y verificadores.
data/                                      SQLite. No se versiona.
```

## El catálogo tiene una sola fuente

`public/js/productos.js` es la fuente de verdad del catálogo. De ahí salen:

- las tarjetas del navegador,
- las fichas de `productos/` (`npm run generar`),
- las filas de la base que se siembran al arrancar (`server.js:375`),
- `sitemap.xml`.

El servidor no la importa con `require()` —`productos.js` es un script de
navegador y usa `window`/`document`— sino que `server/catalogo.js` extrae el
literal del array y lo evalúa en un contexto vacío. Ese `Function()` es
**frágil ante cambios de formato**: si cambia el espaciado de
`const PRODUCTOS = [`, el arranque falla. Por eso `npm run verificar` llama a
`leerProductos()` de verdad y falla si el archivo dejó de poder leerse: un
reformateo es un error de verificación, no un incidente.

Migrar el catálogo a un JSON generado eliminaría esa fragilidad, pero haría
que el sitio dejara de abrir con doble clic. Está pendiente de que el sitio se
sirva siempre por Node; el razonamiento está al principio de
`server/catalogo.js`.

Si tocás un precio, tocá **un solo lugar**: `productos.js`. Después
`npm run generar` y `npm run verificar`.

## Convenciones

- **Comentarios que explican el porqué**, no el qué. Es la convención del
  repo, no una regla impuesta: seguila cuando agregues código.
- **Identación de 4 espacios.** Las comillas dobles son las mayoritarias;
  algunos archivos (los más viejos) usan simples. No hay formateador
  automático: cuidado con reformatear masivamente.
- **No borrar CSS sin verificar.** Varios archivos mezclan el
  español/inglés de cuando se renombraron las clases; ya se limpiaron los
  restos, pero la idea sigue vigente.
- `.env` nunca se versiona. Solo `.env.example`.

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

Lo que ya está resuelto, para no duplicarlo:

- CSP estricta y cabeceras (`X-Frame-Options`, `nosniff`, HSTS,
  `Referrer-Policy`, `Permissions-Policy`) en `server.js:166-206`.
- **16 consultas preparadas**, cero interpolación de strings en SQL.
- Rate limiting por IP con limpieza de memoria y sin dependencias.
- Límite de 16 kB en el cuerpo de las peticiones.
- Honeypot `sitio_web` y validación por campo en `/api/contacto`.
- `data/` y `.env` fuera de git.

## Estado de verificación

| Qué | Estado |
|---|---|
| Verificación estática (`npm run verificar`) | ✅ |
| Contraste de color (`npm run contraste`) | ✅ |
| Prueba E2E de API (`npm run api`) | ✅ levanta su propio servidor |
| ESLint (`npm run lint`) | ✅ 0 errores, 6 warnings de `eqeqeq` |
| `.editorconfig` | ✅ |
| Tests unitarios | ❌ no hay framework |
| Formateador automático | ❌ no hay, a propósito |
| CI | ❌ no hay |
