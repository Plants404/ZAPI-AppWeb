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
catálogo y de los datos del negocio. Mongoose está en las dependencias del backend
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

## Revisión responsive (celular, tablet y PC)

Se midió el desborde horizontal de todas las páginas y paneles del admin en anchos de 320 a 1440 px. Se corrigió la barra superior del admin en celulares angostos, el gráfico de ventas (ahora ocupa el ancho disponible y entran las 8 semanas) y la tabla de Pedidos, que ensanchaba toda la página. No se agregó ninguna función nueva: solo se acomodó lo existente.

## Revisión posterior: pedidos web y limpieza

- El carrito ahora crea el pedido en el servidor (`POST /api/orders`): el stock se descuenta ahí, los errores (sin stock, sesión vencida) se muestran y el carrito solo se vacía si salió bien. El historial local guarda el pedido con el ID que devuelve el servidor y WhatsApp queda como paso final para coordinar.
- Un pedido entregado ya no se puede cancelar desde el panel (igual que en el backend).
- Las confirmaciones del panel (cancelar pedido, publicar, descartar) usan el aviso propio en lugar de `window.confirm`. El historial de versiones y las páginas públicas conservan `confirm` por ahora.
- Se borraron hojas de estilo sin uso (`catalogo.css`, `stylecarrito.css`, `restauracion.css`) y el marcado muerto de la tarjeta recomendada.
- `.material-symbols-outlined` tiene caja fija para que un ícono que no cargue no desarme el diseño, y `npm run lint:iconos` valida los nombres.
- Clases de las tarjetas: no son dos sistemas en competencia sino capas. `tarjeta-producto/imagen/cuerpo/pie` (en `base.css`) es la estructura compartida; `product-*` y `recommendation-*` son las variantes de cada pantalla (catálogo y carrito). Renombrarlas no mejora nada visible y arriesga romper estilos, así que se dejó así. Regla para tocar tarjetas: lo estructural va en `tarjeta-*`; lo propio de una pantalla va en su clase, y si una clase de pantalla choca con una estructural (como pasó con `aspect-ratio`), se anula explícitamente en la de pantalla.

## Limpieza del editor de estilo

Se quitó del panel la sección "Estilo de página" (editor, borradores, historial y restauración). El sitio público sigue leyendo y aplicando lo que ya estaba publicado (`GET /api/publicado`), pero ya no hay forma de editarlo desde el panel. Por eso se borraron las rutas de borrador, publicar, historial y restaurar, el código de vista previa y sus pruebas (quedan 147). Las menciones anteriores a ese editor en este documento son historia de cómo se hizo la migración.
