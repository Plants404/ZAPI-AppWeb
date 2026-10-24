# `!important` en el CSS

Informe del paso 3e de `PLAN-REFACTOR.md`. **No modifica ninguna hoja**:
solo mide y propone. La regla 1 del `AGENTS.md` prohíbe cambiar la
apariencia, así que este documento no toca nada por su cuenta.

## Cómo se midió

Un script temporal recorrió `public/css`, quitó los comentarios y contó
las declaraciones terminadas en `!important`. Reproducible con:

```sh
node -e "const fs=require('fs'),p=require('path');const d=p.join('.','public','css');const w=x=>fs.readdirSync(x,{withFileTypes:true}).flatMap(e=>e.isDirectory()?w(p.join(x,e.name)):[p.join(x,e.name)]);let t=0;for(const f of w(d))if(f.endsWith('.css')){const c=(fs.readFileSync(f,'utf8').match(/!important/g)||[]).length;if(c){console.log(c,p.relative(d,f));t+=c}}console.log('TOTAL',t)"
```

Ese comando cuenta también las apariciones dentro de comentarios. Son
4 (dos en `componentes/base.css`, una en `componentes/footer.css`, una
en `secciones/banners.css`) y no son declaraciones reales: la cifra que
importa es **690**.

El `PLAN-REFACTOR.md` hablaba de 664 sobre una revisión previa de
`styles.css`. Hoy los recortes de esa hoja suman **648**; el resto está
en las hojas de página y en el catálogo.

## Totales

### Por archivo

| Archivo | `!important` |
|---|---:|
| `secciones/banners.css` | 508 |
| `secciones/servicios.css` | 80 |
| `componentes/footer.css` | 37 |
| `paginas/carrito.css` | 35 |
| `componentes/correctivo-movil.css` | 19 |
| `componentes/header.css` | 3 |
| `catalogo-fuente.css` | 2 |
| `catalogo-grilla.css` (generado) | 2 |
| `paginas/login.css` | 2 |
| `base/reset.css` | 1 |
| `paginas/404.css` | 1 |
| **Total** | **690** |

Los 150 primeros (banners + servicios + footer + correctivo-movil +
header + reset) son recortes de la antigua `styles.css` y suman 648.
Los 2 de `catalogo-grilla.css` son copia de los 2 de
`catalogo-fuente.css` porque la hoja es generada.

### Por propiedad (las 15 más repetidas)

| Propiedad | Veces |
|---|---:|
| `display` | 49 |
| `color` | 49 |
| `font-size` | 36 |
| `width` | 32 |
| `align-items` | 32 |
| `gap` | 30 |
| `background-color` | 30 |
| `max-width` | 28 |
| `margin` | 27 |
| `border-radius` | 27 |
| `padding` | 23 |
| `position` | 21 |
| `font-weight` | 21 |
| `justify-content` | 20 |
| `line-height` | 18 |

## Agrupados por causa

### 1. Correctivos full-bleed de banners — 508 (`secciones/banners.css`)

Bloque tardío que fuerza los banners de encabezado a borde de pantalla.
Anula el ancho, los márgenes y el `border-radius` que pusieron los
contenedores padre (`.container`, `#catalogo`, `#service`) y los
rellena con el verde bosque (`#1E3A2B`) y la crema (`#F4F1EA`). Como
pelea contra reglas anteriores más específicas, cada declaración
termina en `!important`. Ejemplos:

```css
background-color: #1E3A2B !important;
width: 100% !important;
margin: 0 0 28px 0 !important;
border-radius: 0 !important;
```

### 2. Banner oscuro y layout de Servicios — 80 (`secciones/servicios.css`)

Mismo patrón dentro de la sección Servicios: caja oscura del hero y
ajustes de la grilla interna, todos con `!important` para ganarle a las
reglas de la sección.

### 3. Barra de navegación del footer — 37 (`componentes/footer.css`)

Overrides de `.nav-bar` (`font-size`, `padding`, `min-height`,
`white-space`, `position: static`) para que la navegación del pie no
herede la del header. El propio archivo ya anota que buena parte se
podría resolver por especificidad.

### 4. Correctivo móvil — 19 (`componentes/correctivo-movil.css`)

Reglas de una sola columna que apagan el posicionamiento absoluto y las
transformaciones en pantallas chicas:

```css
position: static !important;
width: 100% !important;
transform: none !important;
```

### 5. Puntuales del header y el reset — 4

3 en `componentes/header.css` y 1 en `base/reset.css`. Ajustes sueltos,
sin un patrón común.

### 6. Hojas de página y catálogo — 41

35 en `paginas/carrito.css`, 2 en `paginas/login.css`, 1 en
`paginas/404.css` y 2 en `catalogo-fuente.css` (más los 2 generados).
Acá el `!important` aparece en overrides de la maqueta de cada página.

## Por qué no se quita ninguno ahora

El script de equivalencia conserva el token `!important` al normalizar
(ver `normalizarDecl` en `tools/verificar-css-equivalencia.js`). Por lo
tanto, sacar cualquier `!important` cambia el CSS efectivo y el script
lo marca como diferencia, aun cuando el dibujo no cambie.

Con el criterio del plan —quitar solo los que el script demuestre
redundantes— **hoy no se puede quitar ninguno** sin romper la red de
seguridad. Quedan como deuda técnica documentada.

## Propuesta (fase futura, con revisión visual a 360/768/1280 px)

1. **Banners (508).** Extraer una clase utilitaria `.full-bleed` con la
   regla correcta dentro de su sección y borrar los overrides tardíos.
   Es el cambio que más `!important` retira de una sola vez.
2. **Correctivo móvil (19).** Envolver cada bloque en su `@media` con
   un selector más específico para no necesitar `!important`.
3. **Footer (37).** Subir la especificidad de `.nav-bar` quitando el
   `!important`, como ya sugiere el comentario del archivo.
4. **Servicios (80) y hojas de página (41).** Revisar caso por caso
   dentro del mismo trabajo de layout.

Cada paso necesita la revisión visual en los tres anchos, porque la
equivalencia de CSS no distingue "el mismo dibujo" de "el mismo texto".
