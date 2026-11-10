'use strict';
/* Verificacion estatica del sitio generado.
   Uso: node frontend/tools/verificar.js

   No modifica archivos. Comprueba que el HTML publicado sea reproducible
   desde las fuentes, que las paginas compartan cabecera, pie y orden de
   carga, que el catalogo sea valido, que no queden restos de la version
   full-stack y que el sitemap y robots.txt esten al dia. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const raizProyecto = path.join(raiz, '..');
const css = path.join(raiz, 'public', 'css');
const js = path.join(raiz, 'public', 'js');

let fallos = 0;
let avisos = 0;

function ok(mensaje) { console.log('  ok   ' + mensaje); }
function error(mensaje) { fallos += 1; console.log('  FALLA ' + mensaje); }
function aviso(mensaje) { avisos += 1; console.log('  aviso ' + mensaje); }
function seccion(titulo) { console.log('\n' + titulo); }

function leer(archivo) {
    try { return fs.readFileSync(archivo, 'utf8'); } catch { return null; }
}

function ejecutarRevisar(script) {
    const resultado = spawnSync(process.execPath, [path.join(raiz, 'tools', script), '--revisar'], {
        encoding: 'utf8', cwd: raizProyecto
    });
    if (resultado.stdout) console.log(resultado.stdout);
    if (resultado.stderr) console.log(resultado.stderr);
    return resultado.status === 0;
}

function paginaExiste(archivo) {
    return fs.existsSync(path.join(raiz, archivo));
}

seccion('Reproducibilidad desde las fuentes');

if (!ejecutarRevisar('construir.js')) error('construir.js --revisar encontro paginas desactualizadas');
else ok('construir.js: paginas publicas reproducibles');

if (!ejecutarRevisar('generar-productos.js')) error('generar-productos.js --revisar encontro fichas/datos desactualizados');
else ok('generar-productos.js: fichas y datos reproducibles');

if (!ejecutarRevisar('generar-sitemap.js')) error('generar-sitemap.js --revisar encontro sitemap/robots desactualizados');
else ok('generar-sitemap.js: sitemap y robots reproducibles');

seccion('Paginas publicas');

const PAGINAS = ['index.html', 'catalogo.html', 'carrito.html', 'contacto.html', 'nosotros.html', 'servicios.html', 'pedidos.html', '404.html'];

for (const pagina of PAGINAS) {
    if (paginaExiste(pagina)) ok(pagina + ' publicada');
    else error(pagina + ' no esta publicada');
}

for (const producto of (() => { try { return require(path.join(raiz, 'datos', 'catalogo.js')).PRODUCTOS; } catch { return []; } })()) {
    const archivo = 'producto-' + producto.slug + '.html';
    if (paginaExiste(archivo)) ok(archivo + ' publicada');
    else error(archivo + ' no esta publicada');
}

if (paginaExiste('carrito.html') || paginaExiste('pedidos.html')) {
    /* Estas pages se esperan, no son error. */
}

seccion('Restos de la version full-stack');

const RASTROS = [
    { archivo: 'public/js/api.js', motivo: 'api.js' },
    { archivo: 'public/js/configuracion.js', motivo: 'configuracion.js' },
    { archivo: 'public/js/sesion.js', motivo: 'sesion.js' },
    { archivo: 'public/js/cuenta.js', motivo: 'cuenta.js' },
    { archivo: 'public/js/contenido-publico.js', motivo: 'contenido-publico.js' },
    { archivo: 'api', motivo: 'api/' },
    { archivo: 'scripts', motivo: 'scripts/' },
    { archivo: 'tests', motivo: 'tests/' },
    { archivo: 'e2e', motivo: 'e2e/' }
];

for (const rastro of RASTROS) {
    if (fs.existsSync(path.join(raizProyecto, rastro.archivo))) error('Queda rastro de full-stack: ' + rastro.motivo);
    else ok('Sin rastro de ' + rastro.motivo);
}

const adminFuentes = path.join(raiz, 'fuentes', 'admin');
if (fs.existsSync(adminFuentes)) error('Queda carpeta fuentes/admin/');
else ok('Sin carpeta fuentes/admin/');

const adminPublico = path.join(raiz, 'admin');
if (fs.existsSync(adminPublico)) error('Queda carpeta admin/ publicada');
else ok('Sin carpeta admin/ publicada');

const cuentaHtml = path.join(raiz, 'cuenta.html');
const productoHtml = path.join(raiz, 'producto.html');
for (const h of [cuentaHtml, productoHtml]) {
    if (fs.existsSync(h)) error('Queda pagina eliminada: ' + path.basename(h));
}
if (!fs.existsSync(cuentaHtml) && !fs.existsSync(productoHtml)) ok('Sin paginas de cuenta/producto sueltas');

seccion('Referencias prohibidas en HTML, JS y CSS publicados');

const PROHIBIDOS = ['admin.html', 'cuenta.html', 'mongo', 'mongodb', 'sesion', 'promocion-banner', 'data-shipping-threshold'];
const archivosRevisar = [];

for (const dir of [raiz, path.join(raiz, 'public', 'js'), path.join(raiz, 'public', 'css')]) {
    if (fs.existsSync(dir)) {
        for (const archivo of fs.readdirSync(dir)) {
            const completo = path.join(dir, archivo);
            if (fs.statSync(completo).isFile() && /\.(html|js|css)$/.test(archivo)) archivosRevisar.push(completo);
        }
    }
}

// tambien revisar fichas producto
for (const archivo of fs.readdirSync(raiz)) {
    if (archivo.startsWith('producto-') && archivo.endsWith('.html')) archivosRevisar.push(path.join(raiz, archivo));
}

for (const archivo of archivosRevisar) {
    const contenido = leer(archivo);
    if (!contenido) continue;
    const nombreRelativo = path.relative(raiz, archivo);

    for (const prohibido of PROHIBIDOS) {
        if (prohibido === '/api' && /api\.emailjs\.com/.test(contenido)) continue;
        if (contenido.includes(prohibido)) {
            error(nombreRelativo + ' contiene referencia prohibida: ' + prohibido);
        }
    }
}
if (fallos === 0) ok('Sin referencias prohibidas en archivos publicados');

seccion('CSS: !important y breakpoints');

let cssImportantOk = true;
let cssBreakpointsOk = true;
const breakpointsValidos = ['600px', '768px', '1024px'];

for (const archivo of fs.readdirSync(css)) {
    if (!archivo.endsWith('.css')) continue;
    const contenido = leer(path.join(css, archivo));
    if (!contenido) continue;
    const nombreRelativo = 'public/css/' + archivo;

    const lineas = contenido.split('\n');
    let enHidden = false;
    lineas.forEach((linea, i) => {
        const numero = i + 1;
        if (/\[\s*hidden\s*\]\s*\{/.test(linea)) enHidden = true;
        if (linea.includes('!important')) {
            const dentroDeHidden = enHidden || /\[\s*hidden\s*\]/.test(linea);
            if (!dentroDeHidden) {
                error(nombreRelativo + ':' + numero + ' usa !important fuera de [hidden]');
                cssImportantOk = false;
            }
        }
        if (enHidden && /^\s*\}\s*$/.test(linea)) enHidden = false;
        const mediaMatch = linea.match(/@media\s*\(max-width:\s*(\d+)px/);
        if (mediaMatch) {
            const valor = mediaMatch[1] + 'px';
            if (!breakpointsValidos.includes(valor)) {
                error(nombreRelativo + ':' + numero + ' breakpoint ' + valor + ' no permitido (solo 600/768/1024)');
                cssBreakpointsOk = false;
            }
        }
    });
}

if (cssImportantOk) ok('!important solo en [hidden]');
if (cssBreakpointsOk) ok('Breakpoints solo 600/768/1024 px');

seccion('Estructura compartida');

const cabeceraEsperada = '<header class="site-header"';
const pieEsperado = '<footer class="site-footer">';
const avisoEsperado = 'id="avisoFlotante"';

for (const pagina of PAGINAS) {
    const contenido = leer(path.join(raiz, pagina));
    if (!contenido) continue;

    let paginaOk = true;
    if (!contenido.includes(cabeceraEsperada)) { error(pagina + ' carece de cabecera compartida'); paginaOk = false; }
    if (!contenido.includes(pieEsperado)) { error(pagina + ' carece de pie compartido'); paginaOk = false; }

    if (pagina !== '404.html' && !contenido.includes(avisoEsperado)) {
        error(pagina + ' carece de aviso flotante'); paginaOk = false;
    }

    if (paginaOk) ok(pagina + ' comparte cabecera y pie');
}

seccion('Orden de carga de scripts');

const ORDEN_ESPERADO = ['negocio.js', 'utilidades.js', 'catalogo-datos.js', 'carrito-estado.js', 'pedidos-estado.js', 'modal.js', 'menu.js', 'buscador.js', 'zapi-bot.js'];

for (const pagina of PAGINAS) {
    const contenido = leer(path.join(raiz, pagina));
    if (!contenido) continue;
    const scripts = [];
    const regex = /<script src="[^"]*\/([^"/]+)" defer><\/script>/g;
    let coincidencia;
    while ((coincidencia = regex.exec(contenido)) !== null) scripts.push(coincidencia[1]);

    let ordenOk = true;
    let indice = -1;
    for (const esperado of ORDEN_ESPERADO) {
        const pos = scripts.indexOf(esperado);
        if (pos === -1) continue;
        if (pos < indice) { ordenOk = false; break; }
        indice = pos;
    }

    if (!ordenOk) error(pagina + ' no respeta el orden de scripts: ' + scripts.join(', '));
    else ok(pagina + ' respeta el orden de scripts');
}

seccion('Catalogo de datos');

let catalogoValido = true;
try {
    const catalogo = require(path.join(raiz, 'datos', 'catalogo.js'));
    if (!Array.isArray(catalogo.PRODUCTOS) || catalogo.PRODUCTOS.length === 0) {
        error('datos/catalogo.js no tiene PRODUCTOS valido'); catalogoValido = false;
    } else {
        for (const producto of catalogo.PRODUCTOS) {
            if (!producto.slug || typeof producto.precioBase !== 'number' || typeof producto.stock !== 'number') {
                error('Producto invalido: ' + (producto.nombre || producto.id)); catalogoValido = false;
            }
        }
    }
} catch (e) {
    error('No se pudo cargar datos/catalogo.js: ' + e.message); catalogoValido = false;
}

if (catalogoValido) ok('datos/catalogo.js valido');

const catalogoDatos = leer(path.join(js, 'catalogo-datos.js'));
if (catalogoDatos) {
    if (catalogoDatos.includes('/api/')) error('catalogo-datos.js conserva referencia a /api');
    else ok('catalogo-datos.js sin referencia a API');

    if (catalogoDatos.includes('cargarCatalogo') || catalogoDatos.includes('cuandoCatalogoListo')) {
        error('catalogo-datos.js conserva carga asincrona de catalogo');
    } else {
        ok('catalogo-datos.js es sincronico');
    }

    if (!catalogoDatos.includes('fotosDeProducto')) error('catalogo-datos.js le falta fotosDeProducto');
    else ok('catalogo-datos.js tiene fotosDeProducto');
}

seccion('Portada');

const indexHtml = leer(path.join(raiz, 'index.html'));
if (indexHtml) {
    const lineas = indexHtml.split('\n');
    if (lineas.length > 350) error('index.html supera las 350 lineas (' + lineas.length + ')');
    else ok('index.html tiene menos de 350 lineas');

    const tieneHero = indexHtml.includes('class="hero"');
    const tieneDestacados = indexHtml.includes('id="productosDestacados"');
    const tieneTestimonios = indexHtml.includes('id="testimoniosLista"');

    if (tieneHero && tieneDestacados) ok('Portada con hero y destacados');
    else error('Portada debe tener hero y destacados');

    if (tieneTestimonios) ok('Portada tiene seccion de testimonios');
    else aviso('Portada sin seccion de testimonios');
}

seccion('Estado vacio compartido');

for (const archivo of ['carrito.css', 'catalogo.css', 'inicio.css', 'base.css']) {
    const contenido = leer(path.join(css, archivo));
    if (!contenido) continue;
    const nombreRelativo = 'public/css/' + archivo;

    if (contenido.includes('.carrito-vacio')) error(nombreRelativo + ' conserva .carrito-vacio');
    if (contenido.includes('.catalogo-vacio')) error(nombreRelativo + ' conserva .catalogo-vacio');
    if (contenido.includes('.testimonios-vacio')) error(nombreRelativo + ' conserva .testimonios-vacio');
}

const baseCss = leer(path.join(css, 'base.css'));
if (baseCss && baseCss.includes('.estado-vacio')) ok('base.css define .estado-vacio');
else error('base.css no define .estado-vacio');

seccion('Resultado');

if (fallos === 0) {
    console.log('\nVerificacion completada sin fallos.' + (avisos > 0 ? ' (' + avisos + ' aviso(s).)' : ''));
    process.exit(0);
}

console.log('\nVerificacion finalizada con ' + fallos + ' fallo(s).' + (avisos > 0 ? ' ' + avisos + ' aviso(s).' : ''));
process.exit(1);
