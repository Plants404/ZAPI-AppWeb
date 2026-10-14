# ZAPI

Sitio del vivero ZAPI: una home de una sola página por secciones, un
catálogo con fichas estáticas, un carrito con checkout, cuentas de
usuario y un asistente por reglas.

El front no usa framework ni build: HTML en la raíz, recursos en
`public/`, catálogo y testimonios en `datos/`. El navegador carga los
archivos tal cual.

> **Sin backend.** El proyecto es un sitio estático. Este repositorio
> tuvo una API Express + MongoDB que se quitó temporalmente; el front
> está adaptado para funcionar sin ella (ver "Modo sin backend"). Para
> recuperar la versión con backend está la etiqueta de git
> `respaldo-con-backend`.

## Stack

- **Frontend:** HTML + CSS + JavaScript clásico (sin módulos ni bundler).
- **Datos:** JSON generados en `public/data/` a partir de `datos/`.
- **Herramientas:** Node (>= 24) para generar y verificar.
- **Pruebas:** no hay (eran de la API).

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

Sin backend, el carrito, el login, los pedidos y el asistente funcionan
igual: se resuelven en el navegador.

## Modo sin backend

`public/js/config.js` decide si hay API. Hoy `URL_API_PRODUCCION` está
vacía y no hay meta `zapi-api`, así que `hayApiConfigurada()` devuelve
`false` en todos los hosts y el sitio arranca en modo estático:

- **Catálogo:** se lee `public/data/productos.json`.
- **Stock:** valor de demostración por producto (`STOCK_DEMO`), descontado
  en `localStorage` (`zapiStockConsumido`) al enviar un pedido.
- **Carrito / checkout:** al confirmar, prepara el mensaje de WhatsApp
  (no hay servidor que reciba el pedido).
- **Cuentas:** login local (`admi@zapi.com` / `admi2026`), sesión en
  `localStorage` (`zapiSesionLocal`).
- **Mis pedidos:** los pedidos enviados se guardan en `localStorage`
  (`zapiPedidosLocal`) y se pueden cancelar (repone el stock local).
- **Contacto:** el aviso va solo por EmailJS.
- **Opiniones:** se leen de `public/data/testimonios.json`.
- **Asistente:** responde por reglas con el catálogo, sin servicio externo.

Para reactivar una API en local, alcanza con setear `URL_API_LOCAL` en
`config.js` (o inyectar `window.__ZAPI_API__` / un meta `zapi-api`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Sirve el sitio estático en `http://localhost:5500`. |
| `npm run lint` | ESLint sobre todo el repo. |
| `npm run verificar` | Verificación estática (CSS, ARIA, IDs, referencias, XSS, reduced motion, generados). Regenera el CSS derivado y las fichas. |
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
- **Testimonios:** `datos/testimonios.js` es la fuente. De ahí sale
  `public/data/testimonios.json` (`npm run generar:testimonios`), que
  sirve el carrusel.

`npm run verificar` regenera el CSS derivado y las fichas, así que hay
que commitear también esos archivos generados cuando cambie la fuente.

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
| Tests | no hay (eran de la API, retirada) |
| Formateador automático | no hay, a propósito |
| CI | no hay |
