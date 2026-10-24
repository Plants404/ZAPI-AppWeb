'use strict';
/* Inserta partials/header.html en los HTML. Idempotente: si el
   bloque entre marcadores ya coincide con el partial procesado,
   no cambia el archivo.

   Usage: node tools/componer-paginas.js
   Tambien se requiere desde generar-productos.js. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const rutaPartial = path.join(raiz, 'partials', 'header.html');

const INICIO = '<!-- @header';
const FIN = '<!-- /@header -->';

const PAGINAS = [
    {
        archivo: 'index.html',
        activo: 'inicio',
        claseHeader: '',
        buscador: 'si',
        prefijo: './',
        logo: 'completo',
        logoHref: './index.html',
        spa: 'si',
        extras: '',
        carrito: 'header',
        cartHref: '#carrito',
        cartSpa: true,
        cuentaAlineado: true
    },
    {
        archivo: 'catalogo.html',
        activo: 'catalogo',
        claseHeader: '',
        buscador: 'si',
        prefijo: './',
        logo: 'completo',
        logoHref: 'catalogo.html',
        spa: 'no',
        extras: '',
        carrito: 'header',
        cartHref: 'carrito.html',
        cartSpa: false,
        cuentaAlineado: true
    },
    {
        archivo: 'carrito.html',
        activo: 'carrito',
        claseHeader: 'cart-header',
        buscador: 'no',
        prefijo: '',
        logo: 'texto',
        spa: 'no',
        extras: 'pedidos',
        carrito: 'header',
        cartHref: 'carrito.html',
        cartSpa: false,
        cuentaAlineado: true
    },
    {
        archivo: 'pedidos.html',
        activo: 'pedidos',
        claseHeader: 'cart-header',
        buscador: 'no',
        prefijo: '',
        logo: 'texto',
        spa: 'no',
        extras: 'carrito',
        carrito: 'header',
        cartHref: 'carrito.html',
        cartSpa: false,
        cuentaAlineado: true
    }
];

const PARAMS_PRODUCTO = {
    activo: 'catalogo',
    claseHeader: 'header-producto',
    buscador: 'producto',
    prefijo: '../',
    logo: 'producto',
    spa: 'no',
    extras: 'secciones',
    carrito: 'producto',
    cartHref: '../carrito.html',
    cartSpa: false,
    cuentaAlineado: false
};

function navItems(params) {
    const prefijo = params.prefijo || '';
    const activo = params.activo || '';
    const claseInicio = activo === 'inicio' ? ' active' : '';
    const claseCatalogo = activo === 'catalogo' ? ' active' : '';
    const ariaInicio = activo === 'inicio' ? ' aria-current="page"' : '';
    const ariaCatalogo = activo === 'catalogo' ? ' aria-current="page"' : '';

    if (params.spa === 'si') {
        return [
            `            <li><button type="button" class="nav-link${claseInicio}" data-section="inicio"${ariaInicio}>Inicio</button></li>`,
            `            <li><button type="button" class="nav-link${claseCatalogo}" data-section="catalogo"${ariaCatalogo}>Catálogo</button></li>`,
            '            <li><button type="button" class="nav-link" data-section="servicios">Servicios</button></li>',
            '            <li><button type="button" class="nav-link" data-section="nosotros">Nosotros</button></li>',
            '            <li><button type="button" class="nav-link" data-section="contacto">Contacto</button></li>'
        ].join('\n');
    }

    const lineas = [
        `            <li><a class="nav-link${claseInicio}" href="${prefijo}index.html"${ariaInicio}>Inicio</a></li>`,
        `            <li><a class="nav-link${claseCatalogo}" href="${prefijo}catalogo.html"${ariaCatalogo}>Catálogo</a></li>`
    ];

    if (params.extras === 'pedidos') {
        lineas.push(`            <li><a class="nav-link" href="${prefijo}pedidos.html">Mis pedidos</a></li>`);
    }
    if (params.extras === 'carrito') {
        lineas.push(`            <li><a class="nav-link nav-link-carrito" href="${prefijo}carrito.html">Carrito</a></li>`);
    }
    if (params.extras === 'secciones') {
        lineas.push(`            <li><a class="nav-link" href="${prefijo}index.html#servicios">Servicios</a></li>`);
        lineas.push(`            <li><a class="nav-link" href="${prefijo}index.html#nosotros">Nosotros</a></li>`);
        lineas.push(`            <li><a class="nav-link" href="${prefijo}index.html#contacto">Contacto</a></li>`);
    }

    return lineas.join('\n');
}

function contexto(params) {
    const prefijo = params.prefijo || '';
    const clase = params.claseHeader || '';

    return {
        claseAttr: clase ? ` class="${clase}"` : '',
        prefijo,
        logo: params.logo,
        logoHref: params.logoHref || (prefijo + 'index.html'),
        buscador: params.buscador,
        carrito: params.carrito,
        spa: params.spa,
        cartHref: params.cartHref,
        cartDataSection: params.cartSpa ? ' data-section="carrito"' : '',
        cuentaAlineado: params.cuentaAlineado ? ' nav-usuario-alineado' : '',
        navItems: navItems(params)
    };
}

function aplicarEq(tpl, ctx) {
    const re = /\{\{#eq\s+(\w+)\s+(\w+)\}\}([\s\S]*?)\{\{\/eq\}\}/g;
    let anterior;
    let salida = tpl;
    do {
        anterior = salida;
        salida = salida.replace(re, (_, clave, valor, interior) => (
            String(ctx[clave]) === valor ? interior : ''
        ));
    } while (salida !== anterior);
    return salida;
}

function aplicarVars(tpl, ctx) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (m, clave) => {
        if (Object.prototype.hasOwnProperty.call(ctx, clave)) {
            return ctx[clave];
        }
        return m;
    });
}

function compactarLineasVacias(texto) {
    return texto
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n');
}

function renderHeader(params) {
    const tpl = fs.readFileSync(rutaPartial, 'utf8');
    const ctx = contexto(params);
    return compactarLineasVacias(aplicarVars(aplicarEq(tpl, ctx), ctx));
}

function attrsMarcador(params) {
    const clase = params.claseHeader || '';
    const prefijo = params.prefijo || '';
    return `<!-- @header activo="${params.activo}" clase-header="${clase}" buscador="${params.buscador}" prefijo="${prefijo}" logo="${params.logo}" spa="${params.spa}" -->`;
}

function bloqueHeader(params) {
    return `${attrsMarcador(params)}\n${renderHeader(params)}${FIN}`;
}

function extraerBloque(html) {
    const i = html.indexOf(INICIO);
    const f = html.indexOf(FIN);
    if (i < 0 || f < 0 || f < i) return null;
    return html.slice(i, f + FIN.length);
}

function envolverOReemplazar(html, params) {
    const nuevo = bloqueHeader(params);
    const actual = extraerBloque(html);
    if (actual) {
        if (actual === nuevo) return { html, cambio: false };
        return { html: html.slice(0, html.indexOf(INICIO)) + nuevo + html.slice(html.indexOf(FIN) + FIN.length), cambio: true };
    }

    const reHeader = /<header\b[\s\S]*?<\/header>\s*(?:<div class="nav-backdrop"[^>]*><\/div>\s*)?(?:<p class="visually-hidden" id="searchStatus"[^>]*>[\s\S]*?<\/p>\s*)?/;
    if (!reHeader.test(html)) {
        throw new Error('no se encontro <header> para envolver');
    }
    return { html: html.replace(reHeader, nuevo + '\n\n'), cambio: true };
}

function componerArchivo(rutaRelativa, params) {
    const ruta = path.join(raiz, rutaRelativa);
    const antes = fs.readFileSync(ruta, 'utf8');
    const { html, cambio } = envolverOReemplazar(antes, params);
    if (cambio) fs.writeFileSync(ruta, html);
    return cambio;
}

function headerAlDia(html, params) {
    const actual = extraerBloque(html);
    if (!actual) return false;
    return actual === bloqueHeader(params);
}

function main() {
    let cambios = 0;
    for (const pagina of PAGINAS) {
        const cambio = componerArchivo(pagina.archivo, pagina);
        console.log((cambio ? '  escribio ' : '  igual    ') + pagina.archivo);
        if (cambio) cambios++;
    }

    const dirProductos = path.join(raiz, 'productos');
    if (fs.existsSync(dirProductos)) {
        for (const f of fs.readdirSync(dirProductos).filter(n => n.endsWith('.html'))) {
            const cambio = componerArchivo(path.join('productos', f), PARAMS_PRODUCTO);
            console.log((cambio ? '  escribio ' : '  igual    ') + 'productos/' + f);
            if (cambio) cambios++;
        }
    }

    console.log(cambios ? cambios + ' archivo(s) actualizado(s)' : 'Nada para actualizar');
}

if (require.main === module) {
    main();
}

module.exports = {
    PAGINAS,
    PARAMS_PRODUCTO,
    renderHeader,
    bloqueHeader,
    extraerBloque,
    headerAlDia
};
