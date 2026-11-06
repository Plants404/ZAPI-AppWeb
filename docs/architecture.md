# Arquitectura de ZAPI

## Vista general

ZAPI es una aplicación full-stack con tres superficies sobre la misma API:

1. **Sitio público** (`frontend/*.html`): portada, catálogo, ficha dinámica
   de producto, servicios, nosotros, contacto, carrito y login.
2. **Cuenta de cliente** (`frontend/cuenta.html`): perfil, historial y
   detalle de pedidos, cancelación de pendientes y testimonios propios.
3. **Panel** (`frontend/admin/*.html`): dashboard, pedidos online, ventas
   presenciales, productos y stock, testimonios, clientes, contenido y
   auditoría.

La API Express vive en `backend/` y se publica en Netlify mediante una
función serverless. MongoDB es la fuente de verdad de catálogo, stock,
pedidos, ventas, contenido, testimonios y usuarios.

## Capas del backend

```text
backend/
  server.js                 arranque local
  src/app.js                middlewares, routers y manejo de errores
  src/config/               loadConfig, validación y CORS
  src/database/             conexión Mongoose
  src/models/               esquemas de datos
  src/routes/               API pública
  src/routes/admin/         API del panel
  src/middleware/           autenticación, roles y sesión
  src/utils/                precios, stock, catálogo, contenido, auditoría
  src/data/                 contenido por defecto
```

`createApp(config)` arma la aplicación sin conectarse a Mongo. Eso permite
probarla con `mongodb-memory-server` y reutilizarla en la función serverless.

### Middlewares

- `helmet` para cabeceras de seguridad.
- `cors` con orígenes explícitos y credenciales.
- Validación de `Origin` en toda petición que modifica datos.
- `express.json` con límite de 64 KB.
- `cookie-parser` para la sesión.
- Límites de tasa separados para login, registro, lecturas, escrituras y
  panel.
- Manejador central de errores: `ErrorHttp`, JSON inválido, cuerpo grande,
  duplicados de Mongo, validación y `500` genérico.

### Autenticación

La sesión es un JWT firmado con `JWT_SECRET` y guardado en la cookie
HttpOnly `zapi_session`. El token incluye el identificador del usuario; el
rol se vuelve a leer de la base en cada petición autenticada.

- `createAuthenticate(config)` valida la cookie y carga el usuario activo.
- `requireAdmin` exige `role: 'superadmin'`.
- `requireCliente` exige `role: 'cliente'`.

El registro público crea siempre `cliente`. El super administrador solo se
crea con `backend/scripts/crear-admin.js`, que exige 12 caracteres de
contraseña. No hay creación automática al conectar la base.

## Modelos

### `User`

`nombre`, `email` único, `telefono`, `passwordHash` (bcrypt, 12 rondas),
`role` (`cliente` o `superadmin`), `activo`, timestamps.

### `Producto`

`productoId` numérico único, `slug` único, `nombre`, `categoria`,
`descripcion`, `precio`, `costo`, `imagenes` (1 a 8), `infoDeVenta`,
`stock`, `stockMinimo`, `destacado`, `activo`, timestamps.

### `MovimientoStock`

`producto`, `productoId`, `tipo` (`entrada`, `ajuste`, `merma`, `venta`,
`cancelacion`, `anulacion`), `cantidad`, `stockAnterior`, `stockNuevo`,
`motivo`, `orden`, `usuario`, timestamps.

### `Orden`

Una sola colección para pedidos online y ventas presenciales:

- `codigo` único, `canal` (`online` o `presencial`), `estado`.
- `cliente` opcional, `creadoPor` opcional.
- `contacto` con nombre, teléfono y correo.
- `items` con `productoId`, `nombre`, `cantidad`, `precio` y `costo`
  congelados al momento de la venta.
- `subtotal`, `descuento`, `total`, `moneda`, `metodoPago`,
  `envioPendiente`, `zona`, `notas`, `notasInternas`,
  `motivoCancelacion`, `stockRepuesto`, timestamps.

Estados: `pendiente`, `confirmado`, `preparando`, `enviado`, `entregado`,
`cancelado`. Las ventas presenciales nacen `entregado`; los pedidos online
nacen `pendiente`.

### `Testimonio`

`autor`, `lugar`, `texto`, `estrellas`, `productoId`, `usuario`, `estado`
(`pendiente`, `aprobado`, `rechazado`), `motivoRechazo`, timestamps.

### `Contenido`

Documento por sección (`clave`) con un objeto `valor`. Las claves son
`negocio`, `portada`, `servicios`, `nosotros`, `contacto` y `promociones`.

### `Auditoria`

`actor`, `accion`, `entidad`, `entidadId`, `detalle`, timestamps.

### `Contacto`

Consultas del formulario público: nombre, correo, teléfono, asunto, mensaje.

## Precios, stock y transacciones

El servidor nunca confía en precios ni totales del navegador. `crearOrden`
recibe los items, busca cada producto activo, toma `precio` y `costo`
actuales, calcula subtotal, descuento y total, y valida stock.

El descuento de stock y la creación de la orden ocurren dentro de una
transacción de MongoDB. Si un producto no alcanza, se aborta todo y se
responde `409` con `faltantes`.

- Venta online o presencial: descuenta stock y registra movimientos
  `venta`.
- Cancelación de pedido o anulación de venta: repone stock y registra
  `cancelacion` o `anulacion`.
- Edición de producto con cambio de stock: registra `ajuste`.
- Entradas, mermas y ajustes manuales: se registran desde el panel.

`stockRepuesto` evita reponer dos veces la misma orden.

## Dashboard

El dashboard agrupa las ventas por día usando `America/Montevideo`. Los
rangos se calculan con la medianoche local del servidor y un máximo de 366
días. Excluye órdenes canceladas.

Devuelve resúmenes de día, semana y mes; período seleccionado; comparación
con el período anterior; ventas por día; medios de pago; top de productos;
stock bajo; pendientes; clientes nuevos; testimonios pendientes y margen
bruto. El gráfico se dibuja con SVG generado en el navegador, sin CDN.

## Contenido editable

Cada sección tiene un esquema fijo en `backend/src/utils/contenido.js` y en
`frontend/public/js/admin-contenido.js`. El panel arma los campos desde ese
esquema y guarda valores, nunca HTML libre. El servidor rechaza `<` y `>`,
valida longitudes y cantidades y devuelve la sección normalizada.

El sitio público hidrata el contenido con `data-contenido`,
`data-contenido-imagen`, `data-contenido-enlace`, `data-contenido-lista` y
`data-promocion`. Si la API no responde, quedan los textos de respaldo del
HTML.

## Frontend

### Construcción

`frontend/fuentes/paginas/` y `frontend/fuentes/admin/` contienen módulos de
Node con el contenido de cada página. `frontend/tools/construir.js` los
combina con `frontend/tools/lib/plantilla.js` y escribe los HTML.

- `node frontend/tools/construir.js` genera.
- `node frontend/tools/construir.js --revisar` compara sin escribir y falla
  si el HTML publicado no coincide con las fuentes.

`npm run generar` también ejecuta `generar-sitemap.js`, que produce
`sitemap.xml` y `robots.txt`.

### Orden de scripts públicos

1. `negocio.js`, `utilidades.js`, `api.js`, `configuracion.js`,
   `sesion.js`, `catalogo-datos.js`, `carrito-estado.js`, `modal.js`.
2. Scripts de la página (por ejemplo `catalogo.js`).
3. `menu.js`, `buscador.js`, `asistente.js`, `contenido-publico.js`.

Todos son scripts clásicos que comparten el ámbito global. `api.js` expone
`API` y `mensajeDeError`; `configuracion.js` expone `CONFIG`;
`sesion.js` pinta el menú de usuario en `[data-sesion]`.

### Orden de scripts del panel

1. `negocio.js`, `utilidades.js`, `api.js`, `admin-comun.js`.
2. El script de la página (`admin-dashboard.js`, `admin-pedidos.js`, etc.).

`admin-comun.js` valida la sesión y el rol antes de ejecutar el script de la
página. Si no hay sesión de superadmin, redirige a `../login.html`.

### Catálogo en el navegador

`catalogo-datos.js` mantiene `PRODUCTOS` y `CATEGORIAS` en memoria y expone
`obtenerProducto`, `unidadesDe`, `textoDeStock`, `claseDeStock`,
`rutaImagen`, `rutaFicha`, `htmlTarjetaProducto`, `cuandoCatalogoListo` y el
evento `catalogo-listo`. La ficha pública es `producto.html?slug=...`.

El carrito guarda líneas en `localStorage`, pero las revalida contra el
catálogo de la API antes de mostrar totales y de enviar el pedido.

## Decisiones de diseño

- **Una sola colección de órdenes** para unificar reportes, estados y
  auditoría sin duplicar lógica.
- **Precios y costos congelados** en cada item para que los reportes
  históricos no cambien cuando se edita un producto.
- **Contenido por secciones y campos fijos** en lugar de HTML libre.
- **Catálogo en MongoDB**; `frontend/datos/catalogo.js` queda solo como
  semilla.
- **Sin framework de frontend**: HTML generado, CSS propio y scripts
  clásicos para mantener el sitio liviano y reproducible.
- **SVG propio** para el gráfico del dashboard, sin dependencias externas.
- **Pruebas de API con MongoDB en memoria** y prueba E2E con Chrome
  instalado mediante `puppeteer-core`.
