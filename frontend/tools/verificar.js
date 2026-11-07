'use strict';
/* Verificación estática del sitio, la API y el panel.
   Uso: node frontend/tools/verificar.js

   No modifica archivos. Comprueba que el HTML publicado sea reproducible
   desde las fuentes, que las páginas compartan cabecera, pie y orden de
   carga, que el catálogo semilla sea válido, que no queden restos de la
   versión estática y que el sitemap y robots.txt estén al día. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const raizProyecto = path.join(raiz, '..');
const css = path.join(raiz, 'public', 'css');
const js = path.join(raiz, 'public', 'js');

let fallos = 0;
let avisos = 0;

function ok(mensaje) {
    console.log('  ok   ' + mensaje);
}

function error(mensaje) {
    fallos += 1;
    console.log('  FALLA ' + mensaje);
}

function aviso(mensaje) {
    avisos += 1;
    console.log('  aviso ' + mensaje);
}

function seccion(titulo) {
    console.log('\n' + titulo);
}

function leer(archivo) {
    return fs.readFileSync(archivo, 'utf8');
}

function existe(archivo) {
    return fs.existsSync(archivo);
}

function ejecutar(script) {
    return spawnSync(process.execPath, [path.join(__dirname, script), '--revisar'], {
        encoding: 'utf8'
    });
}

/* 1. Reproducibilidad del HTML, sitemap y robots. */
seccion('Generación reproducible');

for (const script of ['construir.js', 'generar-sitemap.js']) {
    const resultado = ejecutar(script);

    if (resultado.status === 0) {
        ok(script + ' --revisar');
    } else {
        error(script + ' --revisar falló');
        const salida = (resultado.stdout || '') + (resultado.stderr || '');
        if (salida.trim()) console.log(salida.trim().split('\n').map(linea => '        ' + linea).join('\n'));
    }
}

/* 2. Archivos obligatorios. */
seccion('Archivos obligatorios');

const PAGINAS_PUBLICAS = [
    'index.html',
    'catalogo.html',
    'producto.html',
    'servicios.html',
    'nosotros.html',
    'contacto.html',
    'carrito.html',
    'cuenta.html',
    'login.html',
    '404.html'
];

const PAGINAS_ADMIN = [
    'index.html',
    'pedidos.html',
    'ventas.html',
    'productos.html',
    'testimonios.html',
    'clientes.html',
    'contenido.html',
    'auditoria.html'
];

for (const pagina of PAGINAS_PUBLICAS) {
    if (existe(path.join(raiz, pagina))) ok(pagina);
    else error('falta ' + pagina);
}

for (const pagina of PAGINAS_ADMIN) {
    if (existe(path.join(raiz, 'admin', pagina))) ok('admin/' + pagina);
    else error('falta admin/' + pagina);
}

const ARCHIVOS_BACKEND = [
    'backend/server.js',
    'backend/src/app.js',
    'backend/src/routes/auth.js',
    'backend/src/routes/config.js',
    'backend/src/routes/catalogo.js',
    'backend/src/routes/contenido.js',
    'backend/src/routes/pedidos.js',
    'backend/src/routes/testimonios.js',
    'backend/src/routes/contacto.js',
    'backend/src/routes/admin/index.js',
    'backend/src/routes/admin/dashboard.js',
    'backend/src/routes/admin/ordenes.js',
    'backend/src/routes/admin/ventas.js',
    'backend/src/routes/admin/productos.js',
    'backend/src/routes/admin/testimonios.js',
    'backend/src/routes/admin/clientes.js',
    'backend/src/routes/admin/contenido.js',
    'backend/src/routes/admin/auditoria.js',
    'backend/scripts/crear-admin.js',
    'backend/scripts/sembrar-catalogo.js',
    'backend/scripts/sembrar-contenido.js'
];

for (const archivo of ARCHIVOS_BACKEND) {
    if (existe(path.join(raizProyecto, archivo))) ok(archivo);
    else error('falta ' + archivo);
}

/* 3. Catálogo semilla. */
seccion('Catálogo semilla');

const { PRODUCTOS } = require(path.join(raiz, 'datos', 'catalogo.js'));
const { slug } = require(path.join(js, 'negocio.js'));

if (!Array.isArray(PRODUCTOS) || !PRODUCTOS.length) {
    error('PRODUCTOS debe ser un arreglo con al menos un producto');
} else {
    const ids = new Set();
    const slugs = new Set();
    let invalidos = 0;

    for (const producto of PRODUCTOS) {
        const etiqueta = producto && producto.nombre ? producto.nombre : '(sin nombre)';
        const problemas = [];

        if (!Number.isSafeInteger(producto.id) || producto.id < 1) problemas.push('id');
        if (!producto.nombre || typeof producto.nombre !== 'string') problemas.push('nombre');
        if (!producto.categoria || typeof producto.categoria !== 'string') problemas.push('categoria');
        if (!producto.descripcion || typeof producto.descripcion !== 'string') problemas.push('descripcion');
        if (!Number.isSafeInteger(producto.precioBase) || producto.precioBase < 0) problemas.push('precioBase');
        if (!Number.isSafeInteger(producto.costo) || producto.costo < 0) problemas.push('costo');
        if (!Number.isSafeInteger(producto.stock) || producto.stock < 0) problemas.push('stock');
        if (!Array.isArray(producto.imagenes) || !producto.imagenes.length) problemas.push('imagenes');
        if (!Array.isArray(producto.infoDeVenta) || !producto.infoDeVenta.length) problemas.push('infoDeVenta');

        const nombreSlug = producto.slug || slug(producto.nombre || '');

        if (!nombreSlug) problemas.push('slug');
        if (ids.has(producto.id)) problemas.push('id repetido');
        if (slugs.has(nombreSlug)) problemas.push('slug repetido');

        ids.add(producto.id);
        slugs.add(nombreSlug);

        const fotos = Array.isArray(producto.imagenes) ? producto.imagenes : [producto.imagen];

        for (const foto of fotos.filter(Boolean)) {
            if (/^https?:\/\//i.test(foto)) continue;
            if (!existe(path.join(raiz, foto))) problemas.push('imagen ' + foto);
        }

        if (producto.imagen && !fotos.includes(producto.imagen)) problemas.push('imagen fuera de imagenes');

        if (problemas.length) {
            invalidos += 1;
            error(etiqueta + ': ' + problemas.join(', '));
        }
    }

    if (!invalidos) ok(PRODUCTOS.length + ' productos válidos');
    if (new Set(PRODUCTOS.map(producto => producto.categoria)).size < 2) {
        aviso('el catálogo semilla tiene una sola categoría');
    }
}

/* 4. Cabecera, pie y estructura de las páginas públicas. */
seccion('Páginas públicas');

function extraer(html, inicio, fin) {
    const desde = html.indexOf(inicio);
    if (desde === -1) return null;
    const hasta = html.indexOf(fin, desde);
    if (hasta === -1) return null;
    return html.slice(desde, hasta + fin.length);
}

function normalizarCabecera(html) {
    return html
        .replace(/\s+activo/g, '')
        .replace(/\s+aria-current="page"/g, '');
}

let cabeceraPatron = null;
let piePatron = null;

for (const pagina of PAGINAS_PUBLICAS) {
    const archivo = path.join(raiz, pagina);
    if (!existe(archivo)) continue;

    const html = leer(archivo);
    const problemas = [];

    if (!html.startsWith('<!DOCTYPE html>')) problemas.push('DOCTYPE');
    if (!/<html lang="es">/.test(html)) problemas.push('lang="es"');
    if (!/<meta charset="UTF-8">/.test(html)) problemas.push('charset');
    if (!/<meta name="viewport"/.test(html)) problemas.push('viewport');
    if (!/<main id="contenido"/.test(html)) problemas.push('main#contenido');

    const cabecera = extraer(html, '<header class="site-header"', '</header>');
    const pie = extraer(html, '<footer class="site-footer">', '</footer>');

    if (!cabecera) problemas.push('cabecera compartida');
    if (!pie) problemas.push('pie compartido');
    if (!/data-sesion/.test(cabecera || '')) problemas.push('slot data-sesion');
    if (!/data-cart-count/.test(cabecera || '')) problemas.push('contador del carrito');

    if (cabecera) {
        const normalizada = normalizarCabecera(cabecera);
        if (!cabeceraPatron) cabeceraPatron = normalizada;
        else if (normalizada !== cabeceraPatron) problemas.push('cabecera distinta al resto');
    }

    if (pie) {
        if (!piePatron) piePatron = pie;
        else if (pie !== piePatron) problemas.push('pie distinto al resto');
    }

    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    const repetidos = [...new Set(ids.filter((id, indice) => ids.indexOf(id) !== indice))];

    if (repetidos.length) problemas.push('id repetido: ' + repetidos.join(', '));

    if (problemas.length) error(pagina + ': ' + problemas.join(', '));
    else ok(pagina);
}

/* 5. Orden de estilos y scripts de las páginas públicas. */
seccion('Orden de estilos y scripts');

const CSS_BASE = ['tokens.css', 'base.css', 'estructura.css'];
const SCRIPTS_BASE = [
    'negocio.js',
    'utilidades.js',
    'api.js',
    'configuracion.js',
    'sesion.js',
    'catalogo-datos.js',
    'carrito-estado.js',
    'modal.js'
];
const SCRIPTS_FINALES = ['menu.js', 'buscador.js', 'asistente.js', 'contenido-publico.js'];

function hojasDeEstilo(html) {
    return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
        .map(match => /^https?:/i.test(match[1]) ? match[1] : path.basename(match[1]));
}

function scriptsDe(html) {
    return [...html.matchAll(/<script src="([^"]+)"[^>]*>/g)]
        .map(match => path.basename(match[1]));
}

function esSubsecuencia(lista, esperada) {
    let indice = 0;
    for (const elemento of lista) {
        if (elemento === esperada[indice]) indice += 1;
        if (indice === esperada.length) return true;
    }
    return indice === esperada.length;
}

for (const pagina of PAGINAS_PUBLICAS) {
    const archivo = path.join(raiz, pagina);
    if (!existe(archivo)) continue;

    const html = leer(archivo);
    const hojas = hojasDeEstilo(html);
    const scripts = scriptsDe(html);
    const problemas = [];

    if (!esSubsecuencia(hojas, CSS_BASE)) problemas.push('orden de CSS base');
    if (hojas.includes('admin.css')) problemas.push('admin.css en página pública');
    if (!esSubsecuencia(scripts, SCRIPTS_BASE)) problemas.push('orden de scripts base');
    if (!esSubsecuencia(scripts, SCRIPTS_FINALES)) problemas.push('orden de scripts finales');

    const ultimo = scripts[scripts.length - 1];
    if (ultimo !== 'contenido-publico.js') problemas.push('contenido-publico.js debe ir al final');

    const repetidos = [...new Set(scripts.filter((nombre, indice) => scripts.indexOf(nombre) !== indice))];
    if (repetidos.length) problemas.push('script repetido: ' + repetidos.join(', '));

    for (const nombre of hojas) {
        if (nombre.startsWith('http')) continue;
        if (!existe(path.join(css, nombre))) problemas.push('falta CSS ' + nombre);
    }

    for (const nombre of scripts) {
        if (!existe(path.join(js, nombre))) problemas.push('falta JS ' + nombre);
    }

    if (problemas.length) error(pagina + ': ' + problemas.join(', '));
    else ok(pagina);
}

/* 6. Panel de administración. */
seccion('Panel de administración');

const SECCIONES_ADMIN = [
    ['index.html', 'admin-dashboard.js'],
    ['pedidos.html', 'admin-pedidos.js'],
    ['ventas.html', 'admin-ventas.js'],
    ['productos.html', 'admin-productos.js'],
    ['testimonios.html', 'admin-testimonios.js'],
    ['clientes.html', 'admin-clientes.js'],
    ['contenido.html', 'admin-contenido.js'],
    ['auditoria.html', 'admin-auditoria.js']
];

const ADMIN_BASE = ['negocio.js', 'utilidades.js', 'api.js', 'admin-comun.js'];

for (const [pagina, scriptPagina] of SECCIONES_ADMIN) {
    const archivo = path.join(raiz, 'admin', pagina);
    if (!existe(archivo)) continue;

    const html = leer(archivo);
    const scripts = scriptsDe(html);
    const problemas = [];

    if (!/<meta name="robots" content="noindex, nofollow">/.test(html)) problemas.push('noindex');
    if (!/<body class="admin" data-raiz="\.\.">/.test(html)) problemas.push('body.admin y data-raiz');
    if (!/class="admin-shell"/.test(html)) problemas.push('admin-shell');
    if (!/id="adminSidebar"/.test(html)) problemas.push('sidebar');
    if (!/id="contenidoAdmin"/.test(html)) problemas.push('main del panel');
    if (!/data-admin-salir/.test(html)) problemas.push('salir');
    if (!esSubsecuencia(scripts, ADMIN_BASE)) problemas.push('orden de scripts base');
    if (scripts[scripts.length - 1] !== scriptPagina) problemas.push('falta ' + scriptPagina);
    if (!hojasDeEstilo(html).includes('admin.css')) problemas.push('falta admin.css');

    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    const repetidos = [...new Set(ids.filter((id, indice) => ids.indexOf(id) !== indice))];

    if (repetidos.length) problemas.push('id repetido: ' + repetidos.join(', '));

    for (const enlace of SECCIONES_ADMIN.map(([nombre]) => './' + nombre)) {
        if (!html.includes('href="' + enlace + '"')) problemas.push('sidebar sin ' + enlace);
    }

    if (problemas.length) error('admin/' + pagina + ': ' + problemas.join(', '));
    else ok('admin/' + pagina);
}

/* 7. Referencias locales y anclas. */
seccion('Referencias locales');

for (const pagina of [...PAGINAS_PUBLICAS.map(nombre => path.join(raiz, nombre)), ...PAGINAS_ADMIN.map(nombre => path.join(raiz, 'admin', nombre))]) {
    if (!existe(pagina)) continue;

    const html = leer(pagina);
    const carpeta = path.dirname(pagina);
    const problemas = [];
    const referencias = [...html.matchAll(/(?:href|src|action)="([^"]+)"/g)].map(match => match[1]);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));

    for (const referencia of referencias) {
        if (!referencia || referencia.startsWith('#')) {
            if (referencia.startsWith('#') && referencia.length > 1 && !ids.has(referencia.slice(1))) {
                problemas.push('ancla sin destino ' + referencia);
            }
            continue;
        }

        if (/^(?:[a-z]+:)?\/\//i.test(referencia)) continue;
        if (/^(?:mailto|tel|data|javascript):/i.test(referencia)) continue;
        if (referencia.startsWith('/api/') || referencia.startsWith('../api/') || referencia.includes('/api/')) continue;

        const limpia = referencia.split('?')[0].split('#')[0];

        if (!limpia) continue;

        const destino = path.resolve(carpeta, limpia);

        if (!existe(destino)) problemas.push('enlace roto ' + referencia);
    }

    if (problemas.length) error(path.relative(raiz, pagina) + ': ' + problemas.join(', '));
    else ok(path.relative(raiz, pagina));
}

/* 8. Declaraciones globales duplicadas entre scripts compartidos. */
seccion('Scripts compartidos');

const SCRIPTS_COMPARTIDOS = new Set([
    ...SCRIPTS_BASE,
    ...SCRIPTS_FINALES,
    'admin-comun.js'
]);

const declaraciones = new Map();

for (const archivo of fs.readdirSync(js).filter(nombre => nombre.endsWith('.js'))) {
    const contenido = leer(path.join(js, archivo));

    for (const match of contenido.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
        const nombre = match[1];
        if (!declaraciones.has(nombre)) declaraciones.set(nombre, []);
        declaraciones.get(nombre).push(archivo);
    }
}

let duplicados = 0;

for (const [nombre, archivos] of declaraciones) {
    const compartidos = archivos.filter(archivo => SCRIPTS_COMPARTIDOS.has(archivo));

    if (compartidos.length > 1) {
        duplicados += 1;
        error('"' + nombre + '" declarado en ' + compartidos.join(' y '));
    }
}

if (!duplicados) ok('sin declaraciones duplicadas entre scripts compartidos');

/* 9. Restos de la versión estática. */
seccion('Sin restos de la versión estática');

const OBSOLETOS = [
    [/REQUIERE_CUENTA/, 'la configuración de cuenta ahora viene de /api/config'],
    [/enviarCorreoEmailJS/, 'el contacto y los testimonios van a la API'],
    [/EmailJS/, 'el contacto y los testimonios van a la API'],
    [/generar-productos/, 'las fichas son producto.html?slug=...'],
    [/pedidos-estado/, 'el historial vive en la base de datos'],
    [/productos\/[\w-]+\.html/, 'las fichas estáticas fueron reemplazadas']
];

const EXTENSIONES = new Set(['.js', '.html', '.json', '.toml', '.md']);
const IGNORAR = new Set(['node_modules', '.git', 'public', 'img']);

function recorrer(carpeta, salida = []) {
    for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
        if (IGNORAR.has(entrada.name)) continue;
        const ruta = path.join(carpeta, entrada.name);

        if (entrada.isDirectory()) recorrer(ruta, salida);
        else if (EXTENSIONES.has(path.extname(entrada.name))) salida.push(ruta);
    }

    return salida;
}

const archivosRevisados = [
    ...recorrer(path.join(raiz, 'public')),
    ...recorrer(path.join(raiz, 'fuentes')),
    ...recorrer(path.join(raiz, 'datos')),
    ...recorrer(path.join(raiz, 'tools')),
    ...recorrer(path.join(raizProyecto, 'backend')),
    ...recorrer(path.join(raizProyecto, 'scripts')),
    ...recorrer(path.join(raizProyecto, 'docs')),
    path.join(raizProyecto, 'README.md'),
    path.join(raizProyecto, 'netlify.toml')
].filter(existe);

let restos = 0;

for (const archivo of archivosRevisados) {
    if (archivo.endsWith('verificar.js') || archivo.endsWith('generar-sitemap.js')) continue;

    const contenido = leer(archivo);

    for (const [aguja, motivo] of OBSOLETOS) {
        if (aguja.test(contenido)) {
            restos += 1;
            error(path.relative(raizProyecto, archivo) + ' todavía menciona "' + aguja.source + '" (' + motivo + ')');
        }
    }
}

if (!restos) ok('sin referencias obsoletas');

if (existe(path.join(raiz, 'productos'))) {
    const fichas = fs.readdirSync(path.join(raiz, 'productos')).filter(nombre => nombre.endsWith('.html'));
    if (fichas.length) error('quedan fichas estáticas en frontend/productos');
    else aviso('frontend/productos existe pero está vacío');
}

if (existe(path.join(raiz, 'datos', 'testimonios.js'))) {
    error('frontend/datos/testimonios.js ya no se usa');
} else {
    ok('sin semilla de testimonios estática');
}

/* 10. Sitemap y robots. */
seccion('Sitemap y robots');

const sitemap = leer(path.join(raiz, 'sitemap.xml'));
const robots = leer(path.join(raiz, 'robots.txt'));
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const problemasSitemap = [];

for (const pagina of ['index.html', 'catalogo.html', 'servicios.html', 'nosotros.html', 'contacto.html']) {
    if (!urls.some(url => url.endsWith('/' + pagina))) problemasSitemap.push('falta ' + pagina);
}

for (const producto of PRODUCTOS) {
    const nombre = producto.slug || slug(producto.nombre);
    const esperada = 'producto.html?slug=' + encodeURIComponent(nombre);

    if (!urls.some(url => url.endsWith('/' + esperada))) {
        problemasSitemap.push('falta ' + esperada);
    }
}

if (urls.some(url => url.includes('/productos/'))) problemasSitemap.push('quedan URLs /productos/');
if (urls.some(url => /\/admin\/|\/cuenta\.html|\/login\.html|\/carrito\.html/.test(url))) {
    problemasSitemap.push('incluye páginas privadas');
}

for (const regla of ['Disallow: /admin/', 'Disallow: /api/', 'Sitemap: ']) {
    if (!robots.includes(regla)) problemasSitemap.push('robots sin "' + regla + '"');
}

if (problemasSitemap.length) error(problemasSitemap.join(', '));
else ok(urls.length + ' URLs públicas y robots coherentes');

/* 11. CSS: llaves balanceadas y variables declaradas. */
seccion('CSS');

const archivosCss = fs.readdirSync(css).filter(nombre => nombre.endsWith('.css'));
const tokens = leer(path.join(css, 'tokens.css'));
const variablesDeclaradas = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(match => match[1]));
const variablesUsadas = new Map();

for (const archivo of archivosCss) {
    const contenido = leer(path.join(css, archivo));
    const abre = (contenido.match(/{/g) || []).length;
    const cierra = (contenido.match(/}/g) || []).length;

    if (abre !== cierra) {
        error(archivo + ': llaves desbalanceadas (' + abre + '/' + cierra + ')');
    }

    if (/@import\b/.test(contenido)) error(archivo + ': usa @import en vez de <link>');

    for (const match of contenido.matchAll(/var\((--[a-z0-9-]+)/gi)) {
        if (!variablesUsadas.has(match[1])) variablesUsadas.set(match[1], new Set());
        variablesUsadas.get(match[1]).add(archivo);
    }
}

const sinDefinir = [...variablesUsadas.keys()].filter(variable => !variablesDeclaradas.has(variable));

if (sinDefinir.length) aviso('variables sin declarar en tokens.css: ' + sinDefinir.join(', '));
else ok(archivosCss.length + ' hojas de estilo con llaves balanceadas');

if (!/--[a-z0-9-]+\s*:/i.test(tokens)) error('tokens.css no declara variables');

/* 12. Contrato del panel y de la API. */
seccion('Contrato del panel y la API');

const adminComun = leer(path.join(js, 'admin-comun.js'));
const productoJs = leer(path.join(js, 'producto.js'));
const app = leer(path.join(raizProyecto, 'backend', 'src', 'app.js'));

const contratos = [
    [adminComun.includes('superadmin'), 'admin-comun.js exige rol superadmin'],
    [adminComun.includes('adminIrALogin'), 'admin-comun.js redirige al login'],
    [productoJs.includes('application/ld+json'), 'producto.js inyecta JSON-LD'],
    [productoJs.includes('/api/catalogo/'), 'producto.js lee la ficha desde la API'],
    [app.includes('/api/admin'), 'app.js monta las rutas del panel'],
    [app.includes('helmet'), 'app.js usa helmet'],
    [app.includes('cookieParser'), 'app.js usa cookie-parser']
];

for (const [cumple, mensaje] of contratos) {
    if (cumple) ok(mensaje);
    else error(mensaje);
}

/* Resumen. */
console.log('\n' + (fallos ? 'Verificación con ' + fallos + ' falla(s).' : 'Verificación correcta.') +
    (avisos ? ' ' + avisos + ' aviso(s).' : ''));

process.exit(fallos ? 1 : 0);
