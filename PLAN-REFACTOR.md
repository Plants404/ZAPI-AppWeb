# Plan de refactorización — ZAPI-AppWeb
## Rama: `refactor/orden-codigo`

---

## Línea base (estado actual confirmado)

| Control | Resultado |
|---|---|
| `npm run check` (lint + verificar) | ✅ Sin problemas |
| `npm run contraste` | ✅ Todos los pares cumplen |
| `npm run test:api` | ⏳ corriendo (se confirma antes de Fase 0) |

**Archivos CRLF detectados (29 archivos):**
`.env.example`, `.vscode/settings.json`, todo `/backend/`, `netlify.toml`, `netlify/functions/api.js`, `public/css/pedidos.css`, `public/css/stylecarrito.css`, `public/css/zapi-bot.css`, `scripts/`, `tests/backend/` (5 archivos).

**Datos clave:**
- `styles.css`: 5452 líneas, 664 `!important`
- `tokens.css`: 61 líneas (21 variables)
- JS más largos: `zapi-bot.js` 741, `carrito.js` 742, `productos.js` 651, `testimonio-form.js` 557, `catalogo.js` 470
- `personaje/`: los SVG los usa `login.html` directamente → se quedan donde están; `referencia-login.html` es solo material de referencia → se mueve a `docs/`

---

## Fase 0 — Rama, documentación y configuración base

**Propósito:** crear la rama, registrar la línea base y hacer todas las correcciones de metadatos y configuración.

### Archivos a tocar

| Operación | Archivo |
|---|---|
| Crear | `AGENTS.md` (raíz) |
| Crear | `docs/ARQUITECTURA.md` |
| Crear | `docs/referencia-login.html` (movido de `personaje/`) |
| Modificar | `package.json` → descripción |
| Modificar | `.gitignore` → agregar `!.env.example` |
| Modificar | `netlify.toml` → agregar bloque `[[redirects]]` para `/personaje/referencia-login.html` → 404 |
| Modificar | `personaje/LEEME.txt` → nota indicando que `referencia-login.html` está en `docs/` |

**Commit único:** `docs: AGENTS.md, ARQUITECTURA.md, metadatos y bloqueo de referencia-login`

### Contenido de AGENTS.md
Estructura del repo, flujo de generadores, comandos útiles, convenciones de nombres, reglas del proyecto (las de este plan).

### Contenido de docs/ARQUITECTURA.md
Flujo del sitio (HTML estático → public/ → Netlify CDN), flujo de la API (Netlify Function → Express → MongoDB Atlas), flujo de los generadores (datos/ → public/data/ + productos/ + sitemap.xml), nombres de CSS generados, naming conventions.

---

## Fase 1 — Normalización de finales de línea (LF)

**Propósito:** un commit que solo normaliza los 29 archivos CRLF. Sin cambio de comportamiento.

### Archivos a tocar

Los 29 archivos listados en la línea base. Técnica: `git add --renormalize .` tras confirmar que `.gitattributes` ya tiene `* text=auto eol=lf` (confirmado: sí lo tiene).

**Commit único:** `chore: normalizar finales de línea a LF (29 archivos CRLF → LF)`

### Verificación
`npm run check` + `npm run contraste` + `npm run test:api` en verde antes de pasar a Fase 2.

---

## Fase 2 — Header unificado con partial

**Propósito:** una sola fuente para el `<header>` (y el bottom-sheet / menú móvil) que aparece en todas las páginas con header de navegación.

### Diferencias reales encontradas entre headers

| Característica | index | catalogo | carrito | pedidos | admin |
|---|---|---|---|---|---|
| `<header class="">` | (sin clase) | (sin clase) | `cart-header` | `cart-header` | (sin clase) |
| Logo destino | `./index.html` | `catalogo.html` | `index.html` | `index.html` | `./index.html` |
| Logo estructura | img + texto | img + texto (orden invertido) | solo `<h4>ZAPI</h4>` | solo `<h4>ZAPI</h4>` | img + texto |
| Logo `aria-label` | "ZAPI, ir al inicio" | (ninguno) | (ninguno) | (ninguno) | "ZAPI, ir al inicio" |
| Logo `data-section` | `inicio` | (ninguno) | (ninguno) | (ninguno) | (ninguno) |
| `width/height` en img | (sin attrs) | `200 × 284` | n/a | n/a | `40 × 40` |
| Buscador en header | ✅ | ✅ | ❌ | ❌ | ❌ |
| Link admin visible | ❌ (JS lo muestra) | ✅ `style="display:none"` | ✅ `style="display:none"` | ❌ (no tiene) | ✅ visible siempre |
| Link carrito `href` | `#carrito` (SPA) | `carrito.html` | `carrito.html` | `carrito.html` | `carrito.html` |
| Nav: enlace activo | button `data-section` (SPA) | `<a aria-current="page">` | `<a>` sin active | `<a>` sin active | `<a>` sin active |
| Nav items extras | Servicios, Nosotros, Contacto | (ninguno extra) | Mis pedidos | (igual carrito) | Administración (display:none JS) |
| Bottom-sheet (menú móvil) | ✅ | ✅ | ✅ | ✅ | ❌ (no tiene) |
| `login.html` | ❌ (no tiene header de navegación) | | | | |

> [!IMPORTANT]
> Hay diferencias legítimas que se expresan como parámetros del marcador. Las que necesitan tu confirmación están marcadas con ⚠️.

**Diferencias que resuelvo como parámetros:**
- `activo="inicio|catalogo|carrito|pedidos|admin"` → marca el enlace activo con `aria-current="page"` y clase `active`
- `clase-header="cart-header"` → aplica clase extra al `<header>` (carrito y pedidos)
- `buscador="si|no"` → muestra u oculta el formulario de búsqueda
- `prefijo="../"` → ajusta las rutas relativas en las fichas de `productos/`

**Diferencias que te consulto:** ⚠️
1. El logo de carrito/pedidos usa `<h4>ZAPI</h4>` en vez de imagen+texto. ¿Estandarizo a imagen+texto (como el resto) o mantengo el `<h4>`?
2. El logo de catalogo.html tiene el orden `img` antes de `texto` (inverso a index/admin). ¿Estandarizo?
3. El `data-section="inicio"` en el link del logo de index.html está ausente en el resto. ¿Lo agrego a todos o lo elimino de index?
4. El `width/height` de la imagen del logo varía (sin attrs / 200×284 / 40×40). ¿Cuál es el correcto?
5. admin.html no tiene bottom-sheet. ¿Lo agrego con el partial o lo excluyo explícitamente con un parámetro?

### Archivos a crear
- `partials/header.html` — el partial con marcadores de parámetros
- `tools/componer-paginas.js` — inserta el partial de forma idempotente

### Archivos a modificar
- `index.html`, `catalogo.html`, `carrito.html`, `pedidos.html`, `admin.html` → reemplazar header por marcadores `<!-- @header activo="..." -->...<!-- /@header -->`
- `tools/generar-productos.js` → usar el mismo partial para las fichas de `productos/`
- `tools/verificar.js` → agregar comprobación "Header al día"
- `package.json` → agregar `"componer": "node tools/componer-paginas.js"`

**Commit único:** `refactor: partial de header unificado y tools/componer-paginas.js`

### Páginas a revisar tras esta fase
- 360 px, 768 px, 1280 px: **index, catalogo, carrito, pedidos, admin** + una ficha de producto (`productos/albahaca.html`)

---

## Fase 3 — CSS: tokens, orden y estructura

**Propósito:** tokens.css como única fuente de variables, eliminar duplicados y dividir styles.css por responsabilidad.

### Paso 3a — Script de equivalencia CSS (previo a cualquier movimiento)
- Crear `tools/verificar-css-equivalencia.js`: para cada página, extrae la lista ordenada de reglas CSS que carga, y compara antes/después. Falla si difiere.

### Paso 3b — Tokens: deduplicar variables

**Variables duplicadas a verificar (21):** las del `:root` de `styles.css` vs `tokens.css`.
- Si todos los valores coinciden: eliminar el `:root` duplicado de `styles.css` y agregar `<link>` a `tokens.css` donde falte.
- Si algún valor difiere: reportar sin tocar.
- Agregar carga de `tokens.css` como primer `<link rel="stylesheet">` en: `index.html`, `catalogo.html`, `login.html`, `404.html`, `pedidos.html`, y las fichas de `productos/`.
- Corregir el orden en `pedidos.html`.

### Paso 3c — Reemplazar colores hex por tokens

Recorrer `styles.css`, reemplazar hexadecimales que coincidan exactamente con un token por `var(--nombre)`. Reportar los que no coincidan.

### Paso 3d — Dividir styles.css

**Estructura destino de `public/css/`:**
```
public/css/
  tokens.css                    (sin cambios)
  base/
    reset.css                   (tipografía y reset — primeras reglas de styles.css)
  componentes/
    header.css                  (header y navegación principal)
    menu-movil.css              (bottom-sheet / hoja del menú)
    botones.css
    formularios.css
    tarjetas.css
    footer.css
  secciones/
    hero.css
    servicios.css
    nosotros.css
    contacto.css
  paginas/
    carrito.css                 (renombrado de stylecarrito.css)
    pedidos.css                 (sin cambio de nombre)
    login.css                   (sin cambio)
    404.css                     (sin cambio)
    admin.css                   (hoy incrustado en admin.html con <style>; se extrae)
  catalogo-fuente.css           (renombrado de catalogo.css — fuente para extraer-modal-css)
  catalogo-grilla.css           (renombrado de catalogo-catalogo.css — generado)
  catalogo-modal.css            (sin cambio de nombre)
  estilos-producto.css          (sin cambio)
  zapi-bot.css                  (sin cambio)
```

**Clases compartidas de stylecarrito.css** que hoy carga index.html: se extraen a un componente propio (a confirmar cuáles son antes de moverlas).

**Actualizar:**
- `tools/extraer-modal-css.js` → nuevos nombres `catalogo-fuente.css` / `catalogo-grilla.css`
- `tools/verificar.js` → lista CSS + comprobación "CSS generado" con nuevos nombres
- Todos los `<link rel="stylesheet">` en todos los HTML y en `tools/generar-productos.js`

### Paso 3e — Informe de !important y selectores huérfanos
- Crear `docs/css-important.md` con los 664 agrupados por causa y propuesta de solución.
- Quitar solo los que el script de equivalencia demuestre redundantes.
- Generar informe de selectores que no coinciden con ninguna clase/id de HTML o JS (solo informe, no se borra nada).

### Archivos a modificar (Fase 3 completa)
- `public/css/styles.css` → dividido en los archivos de arriba
- `public/css/catalogo.css` → renombrado a `public/css/catalogo-fuente.css`
- `public/css/catalogo-catalogo.css` → renombrado a `public/css/catalogo-grilla.css`
- `public/css/stylecarrito.css` → renombrado a `public/css/paginas/carrito.css` + extracción de clases compartidas
- `index.html`, `catalogo.html`, `carrito.html`, `pedidos.html`, `login.html`, `404.html`, `admin.html`, fichas `productos/*.html` → links CSS actualizados
- `tools/extraer-modal-css.js`, `tools/verificar.js`

### Archivos a crear
- `tools/verificar-css-equivalencia.js`
- `docs/css-important.md`
- `docs/css-selectores-huerfanos.md`
- Los archivos CSS destino

**Commit único:** `refactor: CSS dividido por responsabilidad, tokens sin duplicados`

### Páginas a revisar tras esta fase
- 360 px, 768 px, 1280 px: **todas** (index, catalogo, carrito, pedidos, login, 404, admin, una ficha de producto)

---

## Fase 4 — JavaScript: reorganización y helpers comunes

**Propósito:** estructura clara en `public/js/`, un namespace `window.ZAPI`, IIFE con `'use strict'` y archivos grandes partidos.

### Estructura destino de `public/js/`

```
public/js/
  core/
    utils.js          (formatearPrecio, formatearFecha, escaparHTML,
                       marcarError, limpiarErrores, mostrarAviso, pintarEstrellas)
    api.js            (urlApi, hayBackend — única implementación)
    scroll.js         (bloquearScroll, desbloquearScroll — de menu.js y modal.js)
  layout/
    menu.js           (sin las funciones que van a core/)
    navigation.js
    auth-ui.js
    buscador.js
  catalogo/
    productos.js      (partido: estado del catálogo y carrito)
    catalogo.js       (partido: render de grilla y filtros)
    modal.js          (partido: modal de producto)
    home-carousel.js
  carrito/
    carrito.js        (partido: estado + render + envío de pedido)
    pedidos.js
  formularios/
    contacto.js
    testimonio-form.js (partido: lógica + render de estrellas)
    testimonios.js
  bot/
    zapi-bot.js       (partido: datos/textos + interfaz/lógica)
  admin/
    admin.js
  paginas/
    404.js
    productos-pagina.js
    login.js
  config.js           (se queda en la raíz de public/js/ — es el primero en cargar)
```

### Namespace `window.ZAPI`
- `core/utils.js` define `window.ZAPI = window.ZAPI || {}` y expone todos los helpers bajo ese objeto.
- Los scripts que los usan pasan de llamar `formatearPrecio(x)` a `ZAPI.formatearPrecio(x)`.
- `window.ZAPI` se agrega a los globals de `eslint.config.js`.

### IIFE con `'use strict'`
Los 9 scripts que hoy dejan funciones globales sueltas se envuelven. Los que necesitan exponer nombres los asignan explícitamente a `window.X` dentro de la IIFE.

### Partición de archivos grandes

| Archivo actual | Se divide en |
|---|---|
| `zapi-bot.js` (741 l.) | `bot/zapi-bot-datos.js` + `bot/zapi-bot.js` |
| `carrito.js` (742 l.) | `carrito/carrito-estado.js` + `carrito/carrito-render.js` + `carrito/carrito-pedido.js` — o dos si el tercero queda pequeño |
| `productos.js` (651 l.) | `catalogo/productos-catalogo.js` + `catalogo/productos-carrito.js` |
| `testimonio-form.js` (557 l.) | `formularios/testimonio-form.js` + ajuste de helpers a core/ |
| `catalogo.js` (470 l.) | queda en un solo archivo (justo en el límite de 450; evaluar al leer completo) |

### Limpieza de console.log
- `productos.js` tiene 9 llamadas a `console.*` — todas son `console.error` o `console.warn` en rutas de error reales → se mantienen.
- El resto de los JS no tienen `console.log` de depuración (confirmado por grep).

### Archivos a actualizar
- Todos los `<script>` en `index.html`, `catalogo.html`, `carrito.html`, `pedidos.html`, `admin.html`, `login.html`, `404.html`, fichas `productos/*.html`
- `tools/generar-productos.js` → rutas de scripts
- `eslint.config.js` → rutas glob + globals `window.ZAPI`
- `tools/verificar.js` → lista JS + regla de scripts por página + cruce de window.*
- `tests/backend/config-frontend.test.js` → si lee rutas de `config.js`
- `README.md`

**Commit único:** `refactor: public/js reorganizado, window.ZAPI, IIFE y archivos partidos`

### Páginas a revisar tras esta fase
- 360 px, 768 px, 1280 px: **todas** + flujos funcionales (login, agregar al carrito, buscar, bot, admin)

---

## Fase 5 — Informe del backend (sin tocar código)

**Propósito:** presentar un informe de propuestas para el backend. No se modifica nada hasta tu aprobación explícita.

### Contenido del informe
1. **Capa de servicios:** `backend/routes/pedidos.js` (~10 KB) y `backend/routes/admin.js` (~7 KB) mezclan lógica de negocio con manejo de request/response. Propuesta: extraer a `backend/services/pedidos.service.js` y `backend/services/admin.service.js`.
2. **Middleware único de errores:** hoy cada ruta maneja sus errores con try/catch propio. Propuesta: middleware `backend/middleware/errorHandler.js` centralizado.
3. **Decisión pendiente — contacto:** `backend/routes/contacto.js` y `backend/models/ContactForm.js` existen pero el front envía el formulario con EmailJS sin golpear `/api/contacto`. Opciones: (A) eliminar la ruta y el modelo, (B) mantenerlos como código muerto documentado, (C) migrar el form a usar la ruta de backend y eliminar EmailJS.

**Crear:** `docs/BACKEND-PROPUESTAS.md`
**Commit único:** `docs: informe de propuestas para el backend`

---

## Entrega final

Al cerrar todas las fases aprobadas:
- `npm run check` en verde
- `npm run contraste` en verde
- `npm run test:api` en verde
- `sitemap.xml` idéntico (no se toca en ninguna fase)
- Resumen por fase con archivos movidos, creados y eliminados

---

## Preguntas que necesito que respondas antes de empezar

Puedo empezar la **Fase 0** sin respuesta (es solo documentación y metadatos).
Para la **Fase 2** (header), necesito que respondas las 5 preguntas marcadas ⚠️ en esa sección.
Para las **Fases 3 y 4** no hay preguntas abiertas en este momento.
