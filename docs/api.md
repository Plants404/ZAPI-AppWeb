# API de ZAPI

La API es una aplicación Express montada en `/api`. En desarrollo el sitio y
la API se sirven en orígenes distintos (`:5500` y `:5501`) y el servidor
estático hace de proxy; en producción comparten origen. El navegador siempre
llama rutas relativas.

## Convenciones

- Los cuerpos son JSON (`Content-Type: application/json`) y el límite es de
  64 KB.
- Las respuestas de error usan `{ "error": "mensaje" }`. Si el problema es
  de un campo, se agrega `"campo": "nombre"`.
- Los errores de stock insuficiente responden `409` con
  `{ "error": "...", "faltantes": [...] }`.
- La sesión se guarda en la cookie HttpOnly `zapi_session`. Las peticiones
  del navegador deben incluir credenciales del mismo origen.
- Los listados paginados aceptan `pagina` (desde 1) y `limite` (máximo 100)
  y responden `{ total, pagina, paginas }`.
- Los errores de origen no autorizado responden `403`.
- El límite de tasa es distinto para login, registro, lecturas, escrituras y
  panel. Al superarlo se responde `429`.

## Salud y configuración

### `GET /api/health`

Público. Responde `{ "estado": "ok" }`.

### `GET /api/config`

Público. Devuelve la configuración que necesita el sitio:

```json
{
  "requiereCuenta": true,
  "registroAbierto": true,
  "envioGratis": 2500,
  "moneda": "UYU",
  "maxItemsPorPedido": 100,
  "negocio": {
    "nombre": "ZAPI",
    "descripcion": "Vivero agroecológico en Montevideo.",
    "whatsapp": "59898268560",
    "whatsappVisible": "098 268 560",
    "email": "hola@zapi.uy",
    "direccion": "Congreso de Abril, Montevideo, Uruguay",
    "horario": "Visitas coordinadas previamente por WhatsApp.",
    "sitio": "https://zapi.uy"
  }
}
```

`requiereCuenta` es siempre `true`: los pedidos online exigen una cuenta de
cliente. El sitio no guarda una copia propia de esta decisión.

## Catálogo público

### `GET /api/catalogo`

Público. Parámetros opcionales: `categoria`, `q` y `destacado=1`.

```json
{
  "productos": [
    {
      "id": 1,
      "productoId": 1,
      "slug": "albahaca",
      "nombre": "Albahaca",
      "categoria": "Aromáticas",
      "descripcion": "Fresca y perfumada...",
      "precioBase": 150,
      "imagen": "public/img/albahaca.opt.jpg",
      "imagenes": ["public/img/albahaca.opt.jpg"],
      "infoDeVenta": ["Mata de 20 cm lista para plantar"],
      "stock": 12,
      "destacado": false
    }
  ],
  "categorias": ["Aromáticas", "Plantas"]
}
```

Solo se devuelven productos activos. El campo `precioBase` mantiene el
nombre histórico que consume el frontend; en el panel el mismo dato se llama
`precio`.

### `GET /api/catalogo/:slug`

Público. Devuelve `{ "producto": { ... } }` o `404`.

## Contenido público

### `GET /api/contenido`

Público. Devuelve las secciones editables con sus valores por defecto
combinados con lo guardado:

```json
{
  "contenido": {
    "negocio": {},
    "portada": {},
    "servicios": {},
    "nosotros": {},
    "contacto": {},
    "promociones": {}
  }
}
```

## Autenticación

### `POST /api/auth/registro`

Público si `REGISTRO_PUBLICO` no es `false`. Crea siempre un usuario
`cliente`, inicia sesión y responde `201`.

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@example.com",
  "telefono": "099123456",
  "clave": "una-clave-de-8-o-mas"
}
```

Respuesta: `{ "usuario": { "id", "nombre", "email", "telefono", "role", "creado" } }`.

Errores: `400` por validación, `409` si el correo ya existe, `403` si el
registro está cerrado.

### `POST /api/auth/login`

Público. Mismo cuerpo que el login del sitio: `{ "email", "clave" }`.

- `200` con `{ "usuario": ... }` y cookie de sesión.
- `400` si el cuerpo no es válido.
- `401` si el correo o la contraseña no coinciden.
- `403` si la cuenta está bloqueada.

El rol (`cliente` o `superadmin`) lo decide el servidor.

### `GET /api/auth/yo`

Requiere sesión. Devuelve `{ "usuario": ... }`.

### `POST /api/auth/logout`

Borra la cookie y responde `204`.

## Pedidos del cliente

Todas las rutas requieren sesión. Crear y cancelar exigen rol `cliente`.

### `POST /api/pedidos`

```json
{
  "nombre": "Ana Pérez",
  "telefono": "099123456",
  "email": "ana@example.com",
  "zona": "Pocitos",
  "notas": "Timbre 2",
  "items": [
    { "productoId": 1, "cantidad": 2 }
  ]
}
```

La API ignora cualquier precio enviado por el navegador: busca cada producto
activo, toma el precio y el costo actuales, valida el stock y descuenta las
unidades dentro de una transacción. El pedido nace con canal `online`,
estado `pendiente` y método de pago `online`.

Respuesta `201`: `{ "pedido": { ... } }`.

Si falta stock responde `409` con `faltantes`:

```json
{
  "error": "No hay stock suficiente para algunos productos.",
  "faltantes": [{ "productoId": 1, "nombre": "Albahaca", "disponibles": 1, "solicitados": 3 }]
}
```

### `GET /api/pedidos`

Devuelve los últimos 80 pedidos del cliente autenticado:
`{ "pedidos": [...] }`.

### `GET /api/pedidos/:id`

Devuelve `{ "pedido": ... }` solo si pertenece al cliente.

### `PATCH /api/pedidos/:id/cancelar`

Solo pedidos en estado `pendiente`. Cuerpo opcional:
`{ "motivo": "Cambié de idea" }`. Repone el stock y responde
`{ "pedido": ... }`.

Forma pública del pedido:

```json
{
  "id": "...",
  "codigo": "ZAPI-W-20261105-A1B2C3D4",
  "canal": "online",
  "estado": "pendiente",
  "creado": "2026-11-04T12:00:00.000Z",
  "actualizado": "2026-11-04T12:00:00.000Z",
  "subtotal": 300,
  "descuento": 0,
  "total": 300,
  "moneda": "UYU",
  "metodoPago": "online",
  "envioPendiente": false,
  "zona": "Pocitos",
  "notas": "Timbre 2",
  "motivoCancelacion": null,
  "contacto": { "nombre": "Ana Pérez", "telefono": "099123456", "email": "ana@example.com" },
  "items": [{ "productoId": 1, "nombre": "Albahaca", "cantidad": 2, "precio": 150, "costo": 60 }]
}
```

## Testimonios

### `GET /api/testimonios`

Público. Devuelve hasta 60 testimonios aprobados:
`{ "testimonios": [...] }`.

### `GET /api/testimonios/mios`

Requiere sesión. Devuelve los testimonios del usuario con `estado` y
`motivoRechazo`.

### `POST /api/testimonios`

Requiere sesión.

```json
{
  "autor": "Ana Pérez",
  "lugar": "Pocitos",
  "texto": "Las plantas llegaron impecables.",
  "estrellas": 5,
  "productoId": 1
}
```

El testimonio queda en estado `pendiente`. Si el usuario ya tiene 5
pendientes, responde `429`.

## Contacto

### `POST /api/contacto`

Público.

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@example.com",
  "telefono": "099123456",
  "asunto": "Consulta por envíos",
  "mensaje": "¿Llegan a Malvín?"
}
```

Responde `201` con `{ "ok": true, "id", "mensaje" }`. El campo oculto
`sitio_web` funciona como trampa antispam: si viene completo, responde
`201` sin guardar.

## Panel de administración

Todas las rutas bajo `/api/admin` requieren sesión con rol `superadmin`.
El panel usa el mismo login que los clientes.

### Dashboard

#### `GET /api/admin/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`

Sin fechas usa el mes en curso. El rango máximo es de 366 días. Las ventas
canceladas no cuentan.

Respuesta:

```json
{
  "rango": {
    "desde": "2026-11-01",
    "hasta": "2026-11-04",
    "anteriorDesde": "2026-10-29",
    "anteriorHasta": "2026-11-01"
  },
  "resumenes": {
    "dia": { "online": { "ingresos": 0, "ventas": 0, "margen": 0 }, "presencial": {}, "total": {} },
    "semana": {},
    "mes": {}
  },
  "periodo": {
    "online": { "ingresos": 0, "ventas": 0, "margen": 0 },
    "presencial": { "ingresos": 0, "ventas": 0, "margen": 0 },
    "total": { "ingresos": 0, "ventas": 0, "margen": 0, "ticketPromedio": 0 }
  },
  "comparacion": {
    "anterior": {},
    "variacion": { "ingresos": 0, "ventas": 0, "online": 0, "presencial": 0 }
  },
  "ventasPorDia": [
    {
      "fecha": "2026-11-04",
      "online": { "ingresos": 0, "ventas": 0 },
      "presencial": { "ingresos": 0, "ventas": 0 },
      "total": { "ingresos": 0, "ventas": 0 }
    }
  ],
  "metodosPago": [{ "metodo": "efectivo", "total": 0, "ventas": 0 }],
  "topProductos": [
    { "productoId": 1, "nombre": "Albahaca", "cantidad": 2, "ingresos": 300, "margen": 180 }
  ],
  "stockBajo": [{ "id": "...", "productoId": 1, "nombre": "Albahaca", "stock": 1, "stockMinimo": 3 }],
  "pedidosPendientes": { "total": 0, "ultimos": [] },
  "clientesNuevos": 0,
  "testimoniosPendientes": 0
}
```

Los importes del período se llaman `ingresos` (no `total`) dentro de cada
canal. `resumenes.dia`, `semana` y `mes` usan la misma forma que `periodo`.

#### `GET /api/admin/dashboard/export.csv?desde=...&hasta=...`

Descarga un CSV con las ventas del período. Excluye canceladas.

### Pedidos online

- `GET /api/admin/ordenes?estado=&canal=&q=&desde=&hasta=&pagina=&limite=`
- `GET /api/admin/ordenes/:id`
- `PATCH /api/admin/ordenes/:id`

Cuerpo de `PATCH`:

```json
{
  "estado": "confirmado",
  "notasInternas": "Coordinar entrega"
}
```

Estados válidos: `pendiente`, `confirmado`, `preparando`, `enviado`,
`entregado`, `cancelado`. Al pasar a `cancelado` se puede enviar
`motivoCancelacion`; se repone el stock.

La forma admin agrega `cliente`, `notasInternas`, `stockRepuesto`,
`creadoPor` y `margen`.

### Ventas presenciales

- `GET /api/admin/ventas?fecha=YYYY-MM-DD&estado=&pagina=&limite=`
- `POST /api/admin/ventas`
- `PATCH /api/admin/ventas/:id/anular`
- `GET /api/admin/ventas/cierre?fecha=YYYY-MM-DD`

Cuerpo de creación:

```json
{
  "metodoPago": "efectivo",
  "descuento": 0,
  "notas": null,
  "clienteId": null,
  "nombre": "Venta presencial",
  "telefono": "",
  "items": [{ "productoId": 1, "cantidad": 1 }]
}
```

Métodos válidos: `efectivo`, `debito`, `credito`, `transferencia`. La venta
nace como `entregado` y descuenta stock en una transacción. Anular exige
`{ "motivo": "..." }` de 3 a 300 caracteres y repone el stock.

`/cierre` devuelve `{ fecha, total, metodos }`, donde `metodos` es un
arreglo con una fila por método (`efectivo`, `debito`, `credito`,
`transferencia`): `{ metodo, total, ventas, anulado, ventasAnuladas }`. Los
importes anulados no suman al total del día.

### Productos y stock

- `GET /api/admin/productos?q=&categoria=&activo=1&stockBajo=1&pagina=&limite=`
- `GET /api/admin/productos/categorias`
- `GET /api/admin/productos/:id`
- `POST /api/admin/productos`
- `PUT /api/admin/productos/:id`
- `DELETE /api/admin/productos/:id` (desactiva)
- `GET /api/admin/productos/:id/movimientos?pagina=&limite=`
- `POST /api/admin/productos/:id/movimientos`

Cuerpo de alta o edición:

```json
{
  "nombre": "Albahaca",
  "categoria": "Aromáticas",
  "descripcion": "Fresca y perfumada...",
  "precio": 150,
  "costo": 60,
  "stock": 12,
  "stockMinimo": 3,
  "imagenes": ["public/img/albahaca.opt.jpg"],
  "infoDeVenta": ["Mata de 20 cm lista para plantar"],
  "destacado": false,
  "activo": true
}
```

Movimientos manuales:

```json
{ "tipo": "entrada", "cantidad": 10, "motivo": "Compra a proveedor" }
```

```json
{ "tipo": "merma", "cantidad": 2, "motivo": "Plantas dañadas" }
```

```json
{ "tipo": "ajuste", "stockNuevo": 8, "motivo": "Recuento" }
```

Una edición que cambia el stock genera un movimiento `ajuste`. Los
movimientos automáticos de venta, cancelación y anulación no se cargan a
mano.

### Testimonios

- `GET /api/admin/testimonios?estado=&q=&pagina=&limite=`
- `PATCH /api/admin/testimonios/:id`

Cuerpo:

```json
{
  "estado": "aprobado",
  "autor": "Ana Pérez",
  "lugar": "Pocitos",
  "texto": "Las plantas llegaron impecables.",
  "estrellas": 5,
  "motivoRechazo": ""
}
```

Si el estado es `rechazado`, el motivo es obligatorio.

### Clientes

- `GET /api/admin/clientes?q=&activo=&pagina=&limite=`
- `GET /api/admin/clientes/:id` (incluye sus últimas órdenes)
- `PATCH /api/admin/clientes/:id`

Cuerpo: `{ "activo": false }` para bloquear o desbloquear la cuenta.

### Contenido

- `GET /api/admin/contenido`
- `PUT /api/admin/contenido/:clave`

Claves válidas: `negocio`, `portada`, `servicios`, `nosotros`, `contacto`,
`promociones`. El cuerpo son los campos fijos de esa sección. El servidor
rechaza HTML (`<` o `>`) y valida longitudes y cantidades.

### Auditoría

`GET /api/admin/auditoria?entidad=&accion=&q=&desde=&hasta=&pagina=&limite=`

Devuelve `{ registros, total, pagina, paginas, entidades, acciones }`. Cada
registro incluye actor, acción, entidad, identificador, detalle y fecha.
