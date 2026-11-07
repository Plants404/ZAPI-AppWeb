# ZAPI

Aplicación web del vivero agroecológico ZAPI: sitio público, cuentas de
cliente, API y panel de administración. El catálogo, el stock, los pedidos,
las ventas presenciales, los testimonios y el contenido editable viven en
MongoDB; el navegador consume la API con rutas relativas `/api`.

## Requisitos

- Node.js 24 o superior.
- MongoDB con replica set (necesario para las transacciones de stock). En
  local podés usar una instancia con `replicaSet=rs0`; en MongoDB Atlas el
  replica set ya viene incluido.
- Un archivo `.env` en la raíz, copiado de `.env.example`.
- En Windows, las pruebas (`npm test`) usan un binario de MongoDB en memoria
  que requiere el motor C++ de Microsoft. Si se informa
  `STATUS_DLL_NOT_FOUND`, instalar **Microsoft Visual C++ 2015-2022
  Redistributable (x64)** desde Microsoft.

## Puesta en marcha

```bash
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
npm run seed:catalogo
npm run seed:contenido
npm run admin:crear           # requiere ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_CLAVE
npm start
```

`npm start` levanta la API en `http://localhost:5501` y el sitio en
`http://localhost:5500`. El servidor estático hace de proxy de `/api` hacia
la API, así que el navegador siempre usa el mismo origen.

El super administrador no se crea desde la web ni al conectar la base. Se
crea una única vez con `npm run admin:crear`; el script exige una contraseña
de al menos 12 caracteres y lee las credenciales del entorno:

```powershell
$env:ADMIN_NOMBRE="Administrador"
$env:ADMIN_EMAIL="admin@zapi.uy"
$env:ADMIN_CLAVE="una-clave-de-12-caracteres-o-mas"
npm run admin:crear
```

El registro público siempre crea cuentas con rol `cliente`.

## Estructura

```text
backend/
  src/
    config/          lectura y validación de variables de entorno
    data/            contenido por defecto
    database/        conexión a MongoDB
    middleware/      sesión, roles y errores
    models/          User, Producto, Orden, Testimonio, Contenido, ...
    routes/          API pública y routers del panel
    utils/           precios, stock, catálogo, contenido, auditoría
  scripts/           semillas y creación del super admin
  tests/             pruebas de API con mongodb-memory-server
frontend/
  fuentes/           fuentes de las páginas públicas y del panel
  tools/             construcción, sitemap y verificación
  datos/catalogo.js  semilla del catálogo
  public/            CSS, JS e imágenes publicadas
  admin/             HTML generado del panel
  *.html             HTML generado del sitio público
e2e/                 prueba de navegador con Chrome
scripts/dev.js       API + servidor estático en desarrollo
api/index.js   adaptador serverless de la API para Vercel
docs/                API, arquitectura y despliegue
```

Las páginas públicas y las del panel se generan desde `frontend/fuentes/`
con `frontend/tools/construir.js`. No se editan los HTML generados a mano:
se cambia la fuente y se ejecuta `npm run generar`.

## Roles y sesión

- `cliente`: se registra desde `login.html`, compra online, consulta su
  historial en `cuenta.html`, cancela pedidos pendientes y envía
  testimonios para moderación.
- `superadmin`: entra por el mismo `login.html` y es redirigido a
  `admin/index.html`. Gestiona pedidos, ventas presenciales, productos,
  stock, testimonios, clientes, contenido y auditoría.

La sesión viaja en una cookie HttpOnly `SameSite`; el rol se decide en el
servidor. El panel valida la sesión y el rol en cada petición y en el
arranque de cada página.

## Compra online

El carrito se guarda en el navegador, pero el pedido se crea en el servidor:
la API recalcula precios y totales, valida stock y descuenta unidades dentro
de una transacción. Al confirmar, el sitio abre WhatsApp con el código del
pedido. El stock se repone si el pedido se cancela.

## Panel de administración

- **Dashboard**: ventas online y presenciales del día, semana y mes, ticket
  promedio, comparación con el período anterior, gráfico SVG, medios de pago,
  top de productos, stock bajo, pedidos pendientes, clientes nuevos,
  testimonios pendientes y margen bruto. Exporta CSV.
- **Pedidos online**: detalle, cambio de estado y notas internas.
- **Ventas presenciales**: punto de venta, medios de pago, descuento
  opcional, anulación con motivo y cierre de caja diario.
- **Productos y stock**: alta, edición, desactivación, fotos, precios,
  costos y movimientos (entradas, ajustes y mermas).
- **Testimonios**: aprobación, rechazo con motivo y edición.
- **Clientes**: ficha, historial de compras y bloqueo de cuenta.
- **Contenido**: campos fijos por sección con vista previa; nunca guarda
  HTML libre.
- **Auditoría**: historial de acciones del panel con filtros.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` / `npm run dev` | API y sitio en desarrollo |
| `npm run api` | Solo la API |
| `npm run frontend` | Solo el servidor estático |
| `npm run generar` | Genera HTML, sitemap y robots |
| `npm run verificar` | Verificación estática del sitio y la API |
| `npm run lint` | ESLint |
| `npm run check` | Lint + verificación |
| `npm test` / `npm run test:api` | Pruebas de API |
| `npm run test:e2e` | Prueba de navegador con Chrome |
| `npm run seed:catalogo` | Siembra el catálogo (`--forzar` para reemplazar) |
| `npm run seed:contenido` | Siembra el contenido (`--forzar` para reemplazar) |
| `npm run admin:crear` | Crea el super administrador |

## Seguridad

- Validación y normalización de todos los datos en el servidor.
- Precios, costos, descuentos y totales se recalculan en la API.
- Cookies HttpOnly, `SameSite` y `Secure` en producción.
- Helmet, CORS restringido por origen y límites de tasa para login,
  registro, lecturas, escrituras y panel.
- Contraseñas con bcrypt (12 rondas); el super admin exige 12 caracteres.
- El contenido editable rechaza `<` y `>` para evitar HTML libre.
- Los errores de stock responden `409` con el detalle de faltantes.

## Despliegue

La publicación prevista es Vercel para el sitio estático y la función
serverless, y MongoDB Atlas para la base. Ver `docs/deployment.md` para las
variables de entorno, el build y las tareas posteriores al despliegue.

## Documentación

- `docs/api.md`: endpoints, cuerpos y respuestas.
- `docs/architecture.md`: capas, modelos y decisiones.
- `docs/deployment.md`: puesta en producción.
