# Qué cambió en la migración a React

Este documento resume cómo pasó ZAPI de un sitio en HTML, CSS y JavaScript
"vanilla" a una aplicación con React, y deja anotados los bugs y las dudas que
aparecieron en el camino. Está escrito para leerlo sin ser experto.

## Antes y ahora

| Antes (vanilla) | Ahora (React) | Qué significa |
| --- | --- | --- |
| Un `.html` por página (`index.html`, `catalogo.html`…) | Un componente por página en `frontend/src/paginas/` | React arma la página en el navegador a partir de componentes reutilizables. |
| Fichas `producto-<slug>.html` generadas por scripts | Una sola ruta `/producto/:slug` | Una ficha sirve para todos los productos, no hace falta generar archivos. |
| Navegación con enlaces entre archivos | React Router (`createBrowserRouter`) | Cambiar de página no recarga todo el sitio. |
| `public/js/*.js` con variables globales y orden de carga | Módulos `import`/`export` | Cada archivo dice qué necesita; ya no importa el orden de los `<script>`. |
| Catálogo y testimonios escritos en `datos/*.js` | Se piden a la API (MongoDB Atlas) | Los datos reales vienen de la base; hay estados "cargando" y de error. |
| Carrito con scripts sueltos y `localStorage` | `estado/carrito.jsx` (Context), misma clave `zapiCarrito` | Se guarda igual, pero ahora se revisa contra stock y precios actuales. |
| Cabecera y pie generados por `tools/construir.js` | Componentes `Cabecera`, `Pie`, `Layout` | Se escriben una sola vez. |
| `public/css/*.css` cargados por página | `frontend/src/estilos/` con una hoja por página (`?inline`) | Cada página carga solo su CSS, y no se pisan entre sí. |
| Panel `admin.html` con un `admin.js` enorme | `frontend/src/admin/`: un componente por panel | El panel es más fácil de leer y de cambiar. |
| Editor "Estilo del sitio" que cargaba los `.html` viejos en un iframe | Iframe con la propia app y mensajes `postMessage` | La vista previa es la app real y recibe el borrador sin guardarlo antes. |
| API en la raíz del repo | Carpeta `backend/` (sigue siendo Express + MongoDB Atlas) | Separar da orden: dos carpetas, dos `package.json`. |
| `npm run frontend` con servidor estático | `npm run dev` con Vite en `frontend/` | Vite recarga la página al guardar un archivo. |
| `vercel.json` publicaba la carpeta estática | Compila `frontend/` y redirige `/api/*` a Render | El sitio y la API se ven como un solo dominio. |

## Cosas que conviene saber

El backend conserva su estructura de archivos sueltos (no tiene carpeta `src/`) y
escucha en el puerto 5501. La carpeta `backend/compartido/` guarda copias del
catálogo, los datos del negocio y el esquema editable; el sitio React tiene su
propia versión del esquema en `frontend/src/esquema-editable.js`, así que si se
cambia uno hay que cambiar el otro. Mongoose está en las dependencias del backend
pero no se usa: todo va con el driver oficial de MongoDB.

El carrito del sitio sigue armándose en el navegador y se envía por WhatsApp; la
ruta `POST /api/orders` existe y la usa el panel para registrar ventas
presenciales, pero el sitio público no la usa. El pie de la página del carrito
quedó sin estilos, igual que en la versión original. Los productos
estáticos (`data/productos.js`) se eliminaron porque ahora salen de la API. Los
seis testimonios de ejemplo (`data/testimonios.js`) se conservaron: el Inicio los
muestra, con el lugar y el producto, mientras la API no tenga opiniones publicadas,
tal como hacía el sitio viejo.

La analítica manda las vistas como `/producto-<slug>` (así las conoce el servidor)
aunque en React la ruta sea `/producto/<slug>`, y no cuenta nada en modo cliente,
en la vista previa del editor ni dentro de `/admin`. En el panel, el menú lateral
en celular se corrigió con ajustes de CSS para que el cajón se abra y cierre bien.

## Comparación visual con el sitio original

Se sacaron capturas de las 11 páginas del sitio y de los 8 paneles del admin (en escritorio de 1440 px y celular de 390 px), más seis estados con interacción (ficha en ventana, formulario de opinión, producto agregado al carrito, menú del celular, búsqueda), todo con los mismos datos simulados. El sitio público quedó idéntico píxel a píxel. En el admin la única diferencia es la paginación de Pedidos, que a propósito muestra las páginas reales (ver abajo).

## Bugs y dudas encontrados

Algunos errores de la versión original se corrigieron al migrar: la paginación de
pedidos usaba el total equivocado, la venta presencial mandaba el producto con un
formato que la API no aceptaba (ahora envía `{id, cantidad}` con números), y el
catálogo del borrador no llevaba el campo `active`, por lo que el servidor podía
rechazarlo. También se arregló la forma en que se mapeaban las rutas de analítica.

Quedan pendientes tres avisos de lint que ya existían: dos en `Layout.jsx` y uno
en `Login.jsx` (llamar a `setState` dentro de un efecto). No rompen nada, pero
conviene revisarlos. Una duda abierta: las pruebas con la base real (Atlas) no pudieron correrse
desde el entorno donde se hizo la migración, por eso conviene hacer la lista de
pruebas manuales en el navegador antes de publicar.

## Lo que se eliminó

La carpeta `_vanilla-original/` (el frontend viejo completo, con sus generadores y la configuración de ESLint) se borró del proyecto. Sigue disponible en el historial de git, por ejemplo en el commit `43168c6`. También se quitó la prueba C11 de `backend/test/eventos.test.js`, que revisaba el escapado de HTML en el `admin.js` viejo: React escapa el texto por defecto, así que ya no aplica.
