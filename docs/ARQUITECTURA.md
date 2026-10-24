# Arquitectura de ZAPI-AppWeb

Documentación del flujo del sitio y de los generadores en **este
checkout** (frontend estático, rama `refactor/orden-codigo` / `main`).

La API Express, Netlify Functions y el panel admin viven en la rama
`backend`. Acá el navegador habla con una API solo si
`public/js/config.js` tiene `URL_API_PRODUCCION` o un meta `zapi-api`.

---

## Visión general

```
Usuario
  │
  └─► Navegador
        ├─► HTML en la raíz + public/css + public/js + public/img + public/data
        └─► API opcional (host configurado en config.js), si hay
```

No hay paso de build. Netlify (u otro estático) publica el repositorio
tal cual. Los JSON y las fichas se generan en máquina de desarrollo y
se versionan.

---

## Flujo del sitio

| URL | Archivo |
|---|---|
| `/` o `/index.html` | `index.html` |
| `/catalogo.html` | `catalogo.html` |
| `/carrito.html` | `carrito.html` |
| `/pedidos.html` | `pedidos.html` |
| `/login.html` | `login.html` |
| `/404.html` | `404.html` |
| `/productos/<slug>.html` | `productos/*.html` |

Carga típica:

1. HTML de la raíz.
2. CSS: hoy `styles.css` (y hojas de página). `tokens.css` todavía no
   se carga en todas las páginas (Fase 3).
3. Scripts en orden: `config.js` → `productos.js` / `auth-ui.js` → resto.
4. `productos.js` hace `fetch` de `public/data/productos.json`.

### Modo sin backend (el de este árbol)

`hayBackend` queda en falso. Catálogo, carrito y WhatsApp funcionan.
Login, cuentas y opiniones que pegan a la API quedan deshabilitadas.
Los pedidos locales van a `localStorage` (`zapiPedidosLocal`).
Contacto sale por EmailJS.

---

## Flujo de los generadores

### `npm run generar` → `tools/generar-productos.js`

```
datos/catalogo.js
       ├──► public/data/productos.json
       └──► productos/<slug>.html
```

### `npm run css` → `tools/extraer-modal-css.js`

```
public/css/catalogo.css
       ├──► public/css/catalogo-catalogo.css
       └──► public/css/catalogo-modal.css
```

El corte es el comentario `VENTANA FLOTANTE DE PRODUCTO`.
Las reglas de `.add-cart` se copian a las dos partes.

### `npm run generar:testimonios` → `tools/generar-testimonios.js`

```
datos/testimonios.js  →  public/data/testimonios.json  (solo aprobados)
```

### `npm run sitemap` → `tools/generar-sitemap.js`

```
datos/catalogo.js + páginas fijas  →  sitemap.xml
```

---

## Nombres de CSS y convenciones

- Fuente del catálogo: `catalogo.css` (no enlazarla en HTML).
- Generados: `catalogo-catalogo.css`, `catalogo-modal.css`.
- Globales: `styles.css`, `tokens.css`.
- De página: `stylecarrito.css`, `pedidos.css`, `login.css`, `404.css`,
  `estilos-producto.css`, `zapi-bot.css`.

HTML en kebab-case. JS clásico (`sourceType: 'script'`), sin módulos ES:
el orden de los `<script>` define los globals.

### ¿Por qué `public/data/` se versiona?

El navegador pide el JSON con `fetch`. Sin build en el host, el archivo
tiene que estar en el repo.

---

## Material de referencia

`docs/referencia-login.html` es un prototipo del personaje. No forma
parte del sitio publicado. Los SVG reales que usa `login.html` siguen
en `personaje/`.

---

*Última actualización: Fase 0 — rama `refactor/orden-codigo`*
