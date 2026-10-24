# Selectores huérfanos del CSS

Informe del paso 3e de `PLAN-REFACTOR.md`. **Solo informe**: no se borra
nada. Se listan las clases e ids que aparecen en `public/css` y que no
figuran en ningún HTML ni JS del árbol.

## Cómo se midió

Un script temporal extrajo los nombres de clase (`.foo`) e id (`#foo`)
de todos los selectores de `public/css` y buscó cada uno —con límites de
palabra, para no confundir `catalog-title` con `catalog-title-acento`—
en el texto de todos los `.html` y `.js` del proyecto (raíz, `productos/`
y `public/js/`).

- Clases en el CSS: **491**. Huérfanas: **60**.
- Ids en el CSS: **12**. Huérfanos: **1**.

## Clases huérfanas (60)

**Catálogo, Servicios, Nosotros y Contacto** (familias `eyebrow`,
`title`, `lead`, `intro`, `trust`, `panel`):

`catalog-eyebrow`, `catalog-header-content`, `catalog-intro`,
`catalog-lead`, `catalog-title`, `catalog-title-acento`,
`catalog-trust`, `catalog-trust-title`, `service-eyebrow`,
`service-intro`, `service-lead`, `service-title`,
`service-title-acento`, `service-trust`, `service-trust-title`,
`nosotros-eyebrow`, `nosotros-hero`, `nosotros-hero-grid`,
`nosotros-hero-principal`, `nosotros-manifiesto`, `nosotros-titulo`,
`contacto-acciones`, `contacto-info`, `contacto-nota`,
`contacto-panel`, `contacto-panel-sub`, `contacto-panel-titulo`.

**Carrito**:

`cart-add-cart`, `cart-count-toggle`, `cart-item-benefit`,
`cart-item-cta`, `cart-item-desc`, `cart-item-footer`,
`cart-item-precio`, `cart-item-precio-cta`, `cart-nav`,
`product-precio-cta`, `floating-cart-btn`.

**Formularios**:

`form-field`, `form-label`, `campo-ayuda`, `campo-contador`,
`campo-control`, `campo-opcional`, `formulario-enviar`,
`formulario-obligatorio`, `formulario-ok`, `formulario-ok-boton`,
`formulario-ok-icono`, `formulario-ok-titulo`, `formulario-pie`,
`formulario-trampa`.

**Botones y varios**:

`btn-primary`, `btn-secondary`, `btn-ver-detalle`, `chip-category`,
`chip-stock`, `nav-salir`, `zapi-hero-badge`, `zapi-hero-divider`.

## Ids huérfanos (1)

- `#floating-cart` (junto con `.floating-cart-btn`, del carrito flotante).

## Salvedades antes de borrar algo

- **`admin.html` no está en este checkout.** Vive en la rama `backend`.
  Clases como `nav-salir`, `cart-nav` o `form-field` pueden usarse ahí y
  figurar acá como huérfanas por eso. Antes de tocar nada hay que
  cruzarlas con esa rama.
- **El JS puede armar nombres por concatenación.** Una clase compuesta en
  runtime (por ejemplo `'cart-item-' + tipo`) no aparece literal en el
  código y este reporte no la ve.
- **Las familias `catalog-*`, `service-*`, `nosotros-*` y `contacto-*`**
  parecen restos de una maqueta anterior (nombres en inglés) que ya no
  se usa. Son las candidatas más firmes a limpieza, pero la decisión y el
  borrado van en una tarea aparte, no en esta refactorización.
