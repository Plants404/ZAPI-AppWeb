# ZAPI

Sitio estático del vivero agroecológico ZAPI, sin backend, sin autenticación y
sin panel de administración. El catálogo, los pedidos, el contacto y los
testimonios funcionan enteramente en el navegador: los pedidos se arman en el
carrito, se validan en el cliente, se guardan en localStorage (“Mis pedidos”)
y se envían por WhatsApp. El contacto y los testimonios se envían por EmailJS;
si falta configuración o falla el envío, se abre WhatsApp precargado como
respaldo.

El sitio se publica en GitHub Pages bajo un subdirectorio y en Vercel, con
rutas internas siempre relativas. No hay frameworks, bundlers ni dependencias
de ejecución; ESLint es solo una herramienta de desarrollo.

## Puesta en marcha

Instala las dependencias de desarrollo y ejecuta el sitio localmente:

```bash
npm install
npm run frontend
```

El servidor estático levanta el sitio en `http://localhost:5500`. Sirve los
archivos de `frontend/` con rutas relativas y no requiere base de datos ni
API.

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
  *.html          HTML generado del sitio público
  sitemap.xml     mapa del sitio
  robots.txt      instrucciones para rastreadores
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
en Vercel. Para Vercel, `vercel.json` sirve `frontend/` como raíz estática y
el comando de build es `npm run generar`. Las rutas internas son siempre
relativas, así el sitio funciona tanto bajo un subdirectorio como en la raíz.

No hay base de datos, no hay API y no hay autenticación. No se requiere
archivo `.env` ni variables de entorno de ejecución.

## Comandos

- `npm run frontend`: servidor estático local en `http://localhost:5500`.
- `npm run generar`: genera HTML, fichas de producto, datos del catálogo,
  sitemap y robots.
- `npm run verificar`: verificación estática de reproducibilidad y estructura.
- `npm run lint`: ESLint sobre los archivos JavaScript.
- `npm run check`: ejecuta lint y verificación en secuencia.
