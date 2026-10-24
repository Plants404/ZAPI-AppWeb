# AGENTS.md — ZAPI-AppWeb

Guía de referencia para agentes. Si movés un archivo o creás uno nuevo,
actualizá este documento en el mismo commit.

Rama de trabajo: `refactor/orden-codigo`. El árbol actual es el frontend
estático (mismo contenido que `main`). La API Express vive en la rama
`backend` y **no está en este checkout**.

---

## Estructura del repositorio (estado actual)

```
ZAPI-AppWeb/
├── index.html              Inicio (hero, catálogo inline, servicios, nosotros, contacto)
├── catalogo.html           Catálogo completo con modal de producto
├── carrito.html            Carrito y checkout por WhatsApp
├── pedidos.html            Historial de pedidos en este dispositivo
├── login.html              Login/registro con personaje animado
├── 404.html                Página de error
├── productos/              Fichas estáticas generadas (`<slug>.html`)
├── public/
│   ├── css/                Hojas de estilo (ver nombres más abajo)
│   ├── js/                 Scripts del navegador (sin módulos ES)
│   ├── img/                Imágenes optimizadas (no cambiar rutas públicas)
│   └── data/               JSON generados (versionados)
├── datos/                  Fuentes: catalogo.js, testimonios.js
├── partials/               Fragmentos HTML compartidos (header.html)
├── personaje/              SVG de "Brotecito" usados por login.html
├── tools/                  Generadores y verificadores (no se despliegan)
├── docs/                   Documentación interna (no se sirve al navegador)
├── AGENTS.md
├── README.md
├── eslint.config.js
├── package.json
├── sitemap.xml
├── robots.txt
├── .gitattributes          * text=auto eol=lf
└── .editorconfig
```

### CSS en `public/css/`

`tokens.css` es la única fuente de variables y se carga primero en todas
las páginas. El resto de la antigua `styles.css` quedó partido por
responsabilidad, en recortes contiguos (no se reordenó ninguna regla):

- `tokens.css` — variables (única fuente)
- `base/reset.css` — reset y tipografía
- `componentes/header.css` — header y navegación
- `componentes/footer.css` — pie
- `componentes/correctivo-movil.css` — correctivos de móvil
- `componentes/base.css` — componentes reutilizables
- `secciones/` — `inicio.css`, `servicios.css`, `nosotros.css`,
  `testimonios.css`, `contacto.css`, `banners.css`
- `catalogo-fuente.css` — fuente de `extraer-modal-css.js` (no cargar
  directo en HTML)
- `catalogo-grilla.css` / `catalogo-modal.css` — GENERADOS
- `paginas/` — `carrito.css`, `pedidos.css`, `login.css`, `404.css`
- `estilos-producto.css`, `zapi-bot.css`

La comprobación de que el CSS efectivo no cambió es
`node tools/verificar-css-equivalencia.js` (contra `HEAD` por defecto).


### JS en `public/js/`

`config.js` queda en la raíz de `public/js/` porque es el primero en
cargar. El resto se reparte por carpeta:

- `layout/` — `auth-ui.js`, `menu.js`, `navigation.js`, `buscador.js`
- `catalogo/` — `productos.js`, `catalogo.js`, `modal.js`, `home-carousel.js`
- `carrito/` — `carrito.js`, `pedidos.js`
- `formularios/` — `contacto.js`, `testimonio-form.js`, `testimonios.js`
- `bot/` — `zapi-bot.js`
- `paginas/` — `404.js`, `productos-pagina.js`, `login.js`

Sin `window.ZAPI` todavía.

No hay `admin.html` ni `netlify.toml` en este árbol.

---

## Comandos útiles

```sh
npm start                   # http://localhost:5500
npm run generar             # productos/*.html + public/data/productos.json
npm run generar:testimonios # public/data/testimonios.json
npm run sitemap             # sitemap.xml
npm run css                 # catalogo-grilla.css y catalogo-modal.css
npm run componer            # partials/header.html → los HTML (idempotente)
npm run check               # lint + verificar
npm run contraste           # WCAG AA
```

`npm run test:api` y `npm run start:api` no existen en este checkout
(sí en la rama `backend`).

Antes de cada commit de esta refactorización: `npm run check` y
`npm run contraste` en verde.

---

## Cómo funcionan los archivos generados

### Catálogo: `datos/catalogo.js` → tres salidas

1. `public/data/productos.json` — lo pide el navegador con `fetch`.
2. `productos/<slug>.html` — ficha con SEO (title, OG, JSON-LD).
3. `sitemap.xml` — `npm run sitemap` después de agregar o quitar productos.

`npm run check` compara fuente y JSON. Si discrepan, falla y pide `npm run generar`.

### CSS del catálogo: `catalogo-fuente.css` → dos salidas

No cargar `catalogo-fuente.css` en ningún HTML. El corte es el comentario
`VENTANA FLOTANTE DE PRODUCTO`.

```sh
npm run css
```

---

## Reglas del proyecto (no negociables)

1. **No cambiar comportamiento ni apariencia** salvo lo que el plan
   de refactorización marca como decisión explícita (p. ej. orden del logo).
2. **Las URLs públicas no cambian.** HTML en la raíz; `public/img` y
   `public/data` se quedan.
3. **Sin bundler ni dependencias nuevas.**
4. **Todo archivo generado sigue versionado.**
5. **No debilitar `eslint.config.js`, `tools/verificar.js` ni `tools/contraste.js`.**
   Si hay que actualizar listas o rutas, mantener la misma exigencia.
6. **No leer ni imprimir `.env`.** Nunca.
7. **Nombres, comentarios y mensajes en español rioplatense.**
8. **Un commit por fase de refactorización.**
9. **No tocar `sitemap.xml`** salvo que un generador lo reescriba idéntico.

---

## Convenciones de nombres

- HTML en raíz: kebab-case en español (`catalogo.html`).
- CSS: kebab-case. Fuentes de generación sin sufijo de destino (`catalogo.css`).
- JS: kebab-case. Un archivo por responsabilidad; si supera ~450 líneas, partirlo.
- Variables CSS: kebab-case (`--color-fondo` / tokens actuales `--forest`, `--leaf`).
- Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

---

## Estado de línea base (`refactor/orden-codigo`)

| Control | Resultado |
|---|---|
| `npm run check` | se confirma en cada fase |
| `npm run contraste` | se confirma en cada fase |
| `npm run test:api` | no aplica en este árbol |

---

*Última actualización: Fase 4 — rama `refactor/orden-codigo`*
