'use strict';
/* Genera sitemap.xml y robots.txt.
   Usage: node tools/generar-sitemap.js

   Los buscadores necesitan las dos cosas para indexar bien un sitio
   estatico: el sitemap, que es el indice de URLs, y el robots.txt,
   que dice donde hay que buscar y donde no.

   Se generan con un script y no a mano por una sola razon: las URLs
   salen de la misma constante SITIO que usa generar-productos.js
   para los canonical y el JSON-LD. Si el dominio final no es
   zapi.uy hay que cambiar SITIO en los dos scripts y correrlos; a
   mano es facil quedar con el sitemap apuntando a un dominio y las
   paginas a otro.

   De donde salen las URLs
   ----------------------
   No se escribe la lista de productos: se leen los archivos de
   productos/ con readdirSync. Así una ficha nueva entra al sitemap
   apenas se genera, sin que haya que acordarse de agregarla.

   carrito.html queda afuera a proposito: lleva
   <meta name="robots" content="noindex, follow">, o sea que no se
   quiere en el indice. Tampoco se lo bloquea en robots.txt: si se
   bloquea, el buscador no puede leer el noindex y lo termina
   mostrando igual. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* ------------------------------------------------------------------
   Lo que hay que confirmar antes de publicar
   ------------------------------------------------------------------ */

const SITIO = 'https://zapi.uy';

/* ------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------ */

function soloFecha(archivo) {
    const stat = fs.statSync(archivo);
    return stat.mtime.toISOString().slice(0, 10);
}

/* Escapa los caracteres que XML no admite. Las rutas del repo solo
   tienen letras, numeros y guion, pero un nombre de archivo raro no
   debe romper la generacion del sitemap entero. */

function paraXml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function url(segundos) {
    return `${SITIO}/${segundos.replace(/\\/g, '/')}`;
}

/* Una entrada del sitemap. La prioridad y la frecuencia las decide
   este archivo, no salen de ningun lado: son una Declaracion de
   intentions para el buscador, no un dato del sitio. */

function entrada(ruta, prioridad, frecuencia) {
    const archivo = path.join(raiz, ruta);

    if (!fs.existsSync(archivo)) {
        console.error(`  AVISO: no existe ${ruta}, se omite del sitemap`);
        return null;
    }

    return {
        loc: paraXml(url(ruta)),
        lastmod: soloFecha(archivo),
        changefreq: frecuencia,
        priority: prioridad
    };
}

/* ------------------------------------------------------------------
   Las paginas publicas
   ------------------------------------------------------------------ */

const entradas = [];

entradas.push(entrada('index.html', '1.0', 'weekly'));
entradas.push(entrada('catalogo.html', '0.9', 'weekly'));

const carpetaProductos = path.join(raiz, 'productos');

if (fs.existsSync(carpetaProductos)) {
    const fichas = fs.readdirSync(carpetaProductos)
        .filter(nombre => nombre.endsWith('.html'))
        .sort();

    for (const ficha of fichas) {
        entradas.push(entrada(path.join('productos', ficha), '0.8', 'monthly'));
    }
}

const validas = entradas.filter(Boolean);

/* ------------------------------------------------------------------
   sitemap.xml
   ------------------------------------------------------------------ */

const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    validas.map(item =>
        '  <url>\n' +
        `    <loc>${item.loc}</loc>\n` +
        `    <lastmod>${item.lastmod}</lastmod>\n` +
        `    <changefreq>${item.changefreq}</changefreq>\n` +
        `    <priority>${item.priority}</priority>\n` +
        '  </url>'
    ).join('\n') +
    '\n</urlset>\n';

fs.writeFileSync(path.join(raiz, 'sitemap.xml'), sitemap);

/* ------------------------------------------------------------------
   robots.txt
   ------------------------------------------------------------------ */

const robots =
    'User-agent: *\n' +
    'Allow: /\n' +
    '\n' +
    `Sitemap: ${SITIO}/sitemap.xml\n`;

fs.writeFileSync(path.join(raiz, 'robots.txt'), robots);

/* ------------------------------------------------------------------
   Como quedo
   ------------------------------------------------------------------ */

console.log('sitemap.xml y robots.txt escritos.');
console.log(`  ${validas.length} URLs en el sitemap:`);
for (const item of validas) {
    console.log(`    ${item.loc}`);
}
console.log('  carrito.html NO va: lleva noindex, follow.');
console.log(`  Revisar SITIO: ahora apunta a ${SITIO}. Si el dominio final`);
console.log('  es otro, cambiar esa constante y volver a correr el generador.');
