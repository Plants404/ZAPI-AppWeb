'use strict';
/* Genera sitemap.xml y robots.txt a partir de las páginas públicas y de la
   semilla del catálogo. Uso:
       node frontend/tools/generar-sitemap.js
       node frontend/tools/generar-sitemap.js --revisar

   Las fichas de producto son dinámicas (`producto.html?slug=...`), así que
   el sitemap usa la semilla para enumerar las URLs públicas. Las páginas
   con <meta name="robots" content="noindex"> quedan fuera del sitemap. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const revisar = process.argv.includes('--revisar');
const { NEGOCIO, slug } = require(path.join(raiz, 'public', 'js', 'negocio.js'));
const { PRODUCTOS } = require(path.join(raiz, 'datos', 'catalogo.js'));

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
        .replace(/'/g, '&apos;');
}

function ultimaModificacion(archivo) {
    return fs.statSync(archivo).mtime.toISOString().slice(0, 10);
}

function entrada(ruta, prioridad, frecuencia, archivoBase) {
    const archivo = path.join(raiz, archivoBase || ruta);

    if (!fs.existsSync(archivo)) {
        console.error('Aviso: no existe ' + (archivoBase || ruta) + ', se omite del sitemap.');
        return null;
    }

    return {
        loc: NEGOCIO.sitio + '/' + ruta.replace(/\\/g, '/'),
        lastmod: ultimaModificacion(archivo),
        changefreq: frecuencia,
        priority: prioridad
    };
}

const entradas = PAGINAS.map(([ruta, prioridad, frecuencia]) => entrada(ruta, prioridad, frecuencia));

for (const producto of PRODUCTOS) {
    const nombre = producto.slug || slug(producto.nombre);
    entradas.push(entrada(
        'producto.html?slug=' + encodeURIComponent(nombre),
        '0.8',
        'monthly',
        'producto.html'
    ));
}

const validas = entradas.filter(Boolean);

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    validas.map(item => [
        '  <url>',
        '    <loc>' + paraXml(item.loc) + '</loc>',
        '    <lastmod>' + item.lastmod + '</lastmod>',
        '    <changefreq>' + item.changefreq + '</changefreq>',
        '    <priority>' + item.priority + '</priority>',
        '  </url>'
    ].join('\n')).join('\n') +
    '\n</urlset>\n';

const robots = 'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /admin/\n' +
    'Disallow: /api/\n' +
    'Disallow: /carrito.html\n' +
    'Disallow: /cuenta.html\n' +
    'Disallow: /login.html\n' +
    '\n' +
    'Sitemap: ' + NEGOCIO.sitio + '/sitemap.xml\n';

const destinos = [
    ['sitemap.xml', sitemap],
    ['robots.txt', robots]
];

if (revisar) {
    const desactualizados = destinos.filter(([archivo, contenido]) => {
        const ruta = path.join(raiz, archivo);
        return !fs.existsSync(ruta) || fs.readFileSync(ruta, 'utf8') !== contenido;
    });

    if (desactualizados.length) {
        console.error('sitemap.xml/robots.txt desactualizados: ejecutá `npm run generar`.');
        console.error('  ' + desactualizados.map(([archivo]) => archivo).join(', '));
        process.exit(1);
    }

    console.log('sitemap.xml y robots.txt al día (' + validas.length + ' URLs públicas).');
} else {
    for (const [archivo, contenido] of destinos) {
        fs.writeFileSync(path.join(raiz, archivo), contenido, 'utf8');
    }

    console.log('sitemap.xml y robots.txt actualizados.');
    console.log('  ' + validas.length + ' URLs públicas.');
    console.log('  carrito.html, cuenta.html, login.html, admin/ y api/ quedan fuera.');
}
