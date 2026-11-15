'use strict';
/* Genera sitemap.xml y robots.txt a partir de las paginas estaticas y las
   fichas de producto. Uso:
       node frontend/tools/generar-sitemap.js
       node frontend/tools/generar-sitemap.js --revisar

   Las paginas con robots noindex (carrito, pedidos, 404) quedan fuera del
   sitemap. El sitemap no incluye lastmod para evitar fallos de
   reproducibilidad por mtime. */

const fs = require('fs');
const path = require('path');
const { obtenerPublicacion } = require('./lib/publicacion.js');

const raiz = path.join(__dirname, '..');
const revisar = process.argv.includes('--revisar');
const { NEGOCIO } = require(path.join(raiz, 'public', 'js', 'negocio.js'));
const { PRODUCTOS: PRODUCTOS_LOCALES } = require(path.join(raiz, 'datos', 'catalogo.js'));
let PRODUCTOS = PRODUCTOS_LOCALES;

const PAGINAS = [
    ['index.html', '1.0', 'weekly'],
    ['catalogo.html', '0.9', 'weekly'],
    ['servicios.html', '0.8', 'monthly'],
    ['nosotros.html', '0.7', 'monthly'],
    ['contacto.html', '0.8', 'monthly']
];

function paraXml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function generarSitemap() {
    const urls = [];

    for (const [archivo, prioridad, frecuencia] of PAGINAS) {
        urls.push('    <url>\n        <loc>' + paraXml(NEGOCIO.sitio + '/' + archivo) + '</loc>\n' +
            '        <changefreq>' + paraXml(frecuencia) + '</changefreq>\n' +
            '        <priority>' + paraXml(prioridad) + '</priority>\n    </url>');
    }

    for (const producto of PRODUCTOS) {
        urls.push('    <url>\n        <loc>' + paraXml(NEGOCIO.sitio + '/producto-' + producto.slug + '.html') + '</loc>\n' +
            '        <changefreq>monthly</changefreq>\n' +
            '        <priority>0.7</priority>\n    </url>');
    }

    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.join('\n') + '\n</urlset>\n';
}

function generarRobots() {
    return 'User-agent: *\nAllow: /\nSitemap: ' + NEGOCIO.sitio + '/sitemap.xml\n';
}

let fallos = 0;

function comparar(archivo, contenido) {
    const destino = path.join(raiz, archivo);
    let actual = null;

    try { actual = fs.readFileSync(destino, 'utf8'); } catch { /* no existe */ }

    if (revisar) {
        if (actual !== contenido) {
            console.log('  FALLA ' + archivo + ' esta desactualizado');
            fallos += 1;
        } else {
            console.log('  ok   ' + archivo);
        }
    } else {
        fs.writeFileSync(destino, contenido, 'utf8');
        console.log('  ok   ' + archivo + ' generado');
    }
}

async function main() {
    const publicacion = await obtenerPublicacion({ revisar });
    if (publicacion) PRODUCTOS = publicacion.catalogo;

    console.log('Sitemap');
    comparar('sitemap.xml', generarSitemap());

    console.log('Robots');
    comparar('robots.txt', generarRobots());

    if (revisar) {
        console.log('\n' + (fallos === 0 ? 'Todo esta actualizado.' : fallos + ' archivo(s) desactualizado(s).'));
        process.exitCode = fallos === 0 ? 0 : 1;
    } else {
        console.log('\nSitemap y robots generados en ' + raiz);
    }
}

main().catch(error => {
    console.error('No se pudieron generar sitemap y robots: ' + error.message);
    process.exitCode = 1;
});
