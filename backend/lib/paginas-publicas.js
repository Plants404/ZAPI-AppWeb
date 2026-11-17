'use strict';

/* Lista de rutas públicas conocidas del sitio estático.
   Sincronizada con frontend/tools/generar-sitemap.js y las fuentes de
   frontend/fuentes/paginas/. Sirve para validar que el campo pagina de un
   evento de analítica apunte a una ruta real del sitio. */

const PAGINAS_ESTATICAS = new Set([
    '/',
    '/index.html',
    '/catalogo.html',
    '/servicios.html',
    '/nosotros.html',
    '/contacto.html',
    '/carrito.html',
    '/pedidos.html',
    '/privacidad.html',
    '/login.html'
]);

const REGEX_PRODUCTO = /^\/producto-[a-z0-9-]{1,80}$/;

function normalizarRuta(ruta) {
    if (typeof ruta !== 'string') return ruta;
    let p = ruta.trim();
    // quitar barra final (excepto raíz)
    while (p.length > 1 && p.endsWith('/')) {
        p = p.slice(0, -1);
    }
    // quitar .html final, incluida la página de inicio
    if (p === '/index.html') {
        p = '/';
    } else if (p.length > 5 && p.endsWith('.html')) {
        p = p.slice(0, -5);
    }
    return p;
}

function esRutaPublicaConocida(ruta) {
    if (typeof ruta !== 'string') return false;
    const normalizada = normalizarRuta(ruta);
    if (PAGINAS_ESTATICAS.has(normalizada)) return true;
    // aceptar cualquier ruta /producto-<slug>
    if (REGEX_PRODUCTO.test(normalizada)) return true;
    const conHtml = normalizada + '.html';
    if (PAGINAS_ESTATICAS.has(conHtml)) return true;
    return false;
}

module.exports = { esRutaPublicaConocida, normalizarRuta };
