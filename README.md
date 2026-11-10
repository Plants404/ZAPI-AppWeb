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
`readWrite` únicamente a la base `zapi` y permite en Network Access solo las
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
El despliegue actual de Vercel publica solo el frontend estático: aloja esta
API en un servicio Node.js y configura allí `MONGODB_URI`, `MONGODB_DB` y
`FRONTEND_ORIGINS`.

Endpoints disponibles:

- `GET /api/products` y `GET /api/products/:slug`: catálogo activo.
- `POST /api/orders`: crea un pedido con precios recalculados desde MongoDB;
  no descuenta stock.
- `POST /api/contact`: guarda consultas privadas de contacto.
- `GET /api/testimonials`: devuelve solo testimonios aprobados.
- `POST /api/testimonials`: guarda opiniones pendientes de aprobación.

Los pedidos y consultas no tienen endpoints de lectura públicos. Los
testimonios se publican solo después de que una persona cambie su estado a
`approved` en la base de datos. El frontend existente todavía no envía estos
formularios a la API; sus flujos actuales no cambian al iniciar el backend.

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

Para comprobar que todo está reproducible y coherente:

```bash
npm run test:backend
npm run verificar
npm run lint
npm run check
```

`npm run verificar` ejecuta las herramientas con `--revisar`, confirma que el
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
    paginas/      fuentes de cada página pública (inicio, catálogo, carrito,
                  contacto, nosotros, servicios, 404 y generador de producto)
  public/
    css/          tokens, base, estructura y una hoja por página
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
  routes/                endpoints de productos, pedidos y formularios
  lib/                   validación y errores HTTP
```

Cada página pública comparte la misma cabecera y el mismo pie, generados desde
`frontend/tools/lib/plantilla.js`. El enlace “Mis pedidos” está en el pie y en
el carrito, no en la navegación principal.

## Pedidos

Los pedidos se arman en el carrito, se validan en el cliente (nombre, teléfono
y correo cuando se incluye) y se guardan en localStorage bajo “Mis pedidos”.
Al confirmar, el sitio abre WhatsApp con el detalle del pedido listo para
enviar. El stock del catálogo nunca se descuenta desde el navegador; se
mantiene a mano en `datos/catalogo.js`.

## Contacto y testimonios

El formulario de contacto usa EmailJS con marcadores `PEGAR_*` en
`public/js/negocio.js`. Si falta configuración o falla el envío, se abre
WhatsApp con la consulta precargada. Los testimonios se envían de la misma
forma: por correo si EmailJS está configurado, por WhatsApp como respaldo. La
lista de testimonios publicados se edita a mano en `datos/testimonios.js` y
se renderiza en la portada durante la generación.

## Despliegue

El sitio se publica como sitio estático en GitHub Pages bajo subdirectorio y
en Vercel. En Vercel, configura el directorio raíz del proyecto como la raíz
del repositorio. `vercel.json` ejecuta `npm run vercel-build` y publica
`frontend/` como salida estática; no hace falta definir rewrites. Las rutas
internas son siempre relativas, así el sitio funciona tanto bajo un
subdirectorio como en la raíz.

No hay base de datos, no hay API y no hay autenticación. No se requiere
archivo `.env` ni variables de entorno de ejecución.

## Comandos

- `npm run frontend`: servidor estático local en `http://localhost:5500`.
- `npm run generar`: genera HTML, fichas de producto, datos del catálogo,
  sitemap y robots.
- `npm run verificar`: verificación estática de reproducibilidad y estructura.
- `npm run lint`: ESLint sobre los archivos JavaScript.
- `npm run check`: ejecuta lint y verificación en secuencia.
