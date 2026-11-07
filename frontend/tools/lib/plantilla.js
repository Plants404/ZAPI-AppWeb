'use strict';

const { NEGOCIO, slug } = require('../../public/js/negocio.js');

const ENLACES = [
    { seccion: 'inicio', texto: 'Inicio', archivo: 'index.html' },
    { seccion: 'catalogo', texto: 'Catalogo', archivo: 'catalogo.html' },
    { seccion: 'servicios', texto: 'Servicios', archivo: 'servicios.html' },
    { seccion: 'nosotros', texto: 'Nosotros', archivo: 'nosotros.html' },
    { seccion: 'contacto', texto: 'Contacto', archivo: 'contacto.html' }
];

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caracter]));
}

function icono(nombre, clase = '') {
    return `<span class="material-symbols-outlined${clase ? ' ' + clase : ''}" aria-hidden="true">${nombre}</span>`;
}

function enlaceNavegacion(enlace, seccion, raiz) {
    const activo = enlace.seccion === seccion;
    return `<li><a class="nav-enlace${activo ? ' activo' : ''}" href="${raiz}/${enlace.archivo}"${activo ? ' aria-current="page"' : ''}>${enlace.texto}</a></li>`;
}

function cabecera(seccion, raiz) {
    return `<a class="salto-contenido" href="#contenido">Saltar al contenido</a>
<header class="site-header" data-header>
    <div class="header-inner">
        <button class="menu-boton" id="navToggle" type="button" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menu de navegacion">
            <span class="menu-linea" aria-hidden="true"></span>
            <span class="menu-linea" aria-hidden="true"></span>
            <span class="menu-linea" aria-hidden="true"></span>
        </button>

        <a class="logo" href="${raiz}/index.html" aria-label="ZAPI, ir al inicio">
            <div class="logo-items-text">
                <span class="logo-nombre">ZAPI</span>
            </div>
            <div class="logo-items-img">
                <img src="${raiz}/public/img/logo.svg" alt="">
            </div>
        </a>

        <nav class="site-nav" id="navPrincipal" aria-label="Navegacion principal">
            <ul>${ENLACES.map(enlace => enlaceNavegacion(enlace, seccion, raiz)).join('')}<li><a class="nav-enlace" href="${raiz}/login.html">Ingresar</a></li></ul>
        </nav>

        <form class="header-search" id="headerSearch" role="search" action="${raiz}/catalogo.html" autocomplete="off">
            <label class="visually-hidden" for="searchInput">Buscar productos</label>
            ${icono('search', 'header-search-icono')}
            <input id="searchInput" name="q" type="search" placeholder="Buscar productos…" aria-describedby="searchStatus" spellcheck="false">
            <button class="search-limpiar" id="searchClear" type="button" aria-label="Limpiar busqueda" hidden>${icono('close')}</button>
        </form>

        <a class="header-carrito" href="${raiz}/carrito.html" aria-label="Ver carrito">
            ${icono('shopping_bag')}
            <span class="cart-count" data-cart-count aria-hidden="true">0</span>
        </a>
    </div>
</header>
<div class="nav-backdrop" id="navBackdrop" hidden></div>
<p class="visually-hidden" id="searchStatus" role="status" aria-live="polite"></p>`;
}

function pie(raiz) {
    return `<footer class="site-footer">
    <div class="footer-inner">
        <div class="footer-marca">
            <a href="${raiz}/index.html" aria-label="ZAPI, ir al inicio">
                <img src="${raiz}/public/img/logo.svg" alt="" width="38" height="54">
                <span>ZAPI</span>
            </a>
            <p>Plantas, kits y acompañamiento para empezar tu rincón verde.</p>
        </div>
        <nav class="footer-nav" aria-label="Paginas del sitio">
            <h2>Navegar</h2>
            ${ENLACES.map(enlace => `<a href="${raiz}/${enlace.archivo}">${enlace.texto}</a>`).join('')}
            <a href="${raiz}/carrito.html">Carrito</a>
            <a href="${raiz}/pedidos.html">Mis pedidos</a>
        </nav>
        <div class="footer-contacto">
            <h2>Contacto</h2>
            <p>${escapar(NEGOCIO.direccion)}</p>
            <a href="https://wa.me/${NEGOCIO.whatsapp}" target="_blank" rel="noopener">WhatsApp ${NEGOCIO.whatsappVisible}</a>
            <a href="${raiz}/contacto.html">Escribinos por correo</a>
        </div>
    </div>
    <p class="footer-legal">ZAPI · Vivero agroecologico · Precios sujetos a disponibilidad.</p>
</footer>`;
}

function modalProducto() {
    return `<dialog class="modal-producto" id="modalProducto" aria-labelledby="modalTitulo">
    <div class="modal-caja">
        <button class="icono-boton modal-cerrar" type="button" data-cerrar-modal aria-label="Cerrar detalle del producto">${icono('close')}</button>
        <div class="modal-galeria">
            <div class="modal-foto">
                <img id="carruselImg" src="" alt="">
                <button class="carrusel-flecha carrusel-prev" type="button" aria-label="Foto anterior">${icono('chevron_left')}</button>
                <button class="carrusel-flecha carrusel-next" type="button" aria-label="Foto siguiente">${icono('chevron_right')}</button>
                <span class="carrusel-contador" id="carruselContador" aria-live="polite"></span>
            </div>
            <div class="carrusel-miniaturas" id="carruselMiniaturas" aria-label="Miniaturas del producto"></div>
        </div>
        <div class="modal-detalle">
            <span class="etiqueta" id="modalCategoria"></span>
            <h2 id="modalTitulo"></h2>
            <p class="modal-descripcion" id="modalDescripcion"></p>
            <ul class="lista-ventajas" id="modalInfo"></ul>
            <p class="modal-precio" id="modalPrecio"></p>
            <p class="stock" id="modalStock"></p>
            <button class="boton boton-primario" type="button" id="modalAgregar" data-id="">${icono('add_shopping_cart')} Agregar al carrito</button>
            <a class="enlace-flecha" id="modalFicha" hidden>Ver la ficha completa ${icono('arrow_forward')}</a>
        </div>
    </div>
</dialog>`;
}

function dialogoTestimonio() {
    return `<dialog class="dialogo" id="dialogoTestimonio" aria-labelledby="testimonioTitulo">
    <form class="dialogo-caja" id="testimonioForm" novalidate>
        <button class="icono-boton dialogo-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar formulario de opinion">${icono('close')}</button>
        <span class="etiqueta">Tu experiencia</span>
        <h2 id="testimonioTitulo">Contanos cómo fue tu compra</h2>
        <p>Leemos todas las opiniones. Publicamos solo las que estan verificadas y autorizadas.</p>

        <label class="campo-label" for="testimonioNombre">Nombre <span aria-hidden="true">*</span></label>
        <input class="campo-input" id="testimonioNombre" name="autor" type="text" autocomplete="name" maxlength="120" aria-describedby="errorTestimonioNombre">
        <span class="campo-error" id="errorTestimonioNombre"></span>

        <label class="campo-label" for="testimonioLugar">Lugar (opcional)</label>
        <input class="campo-input" id="testimonioLugar" name="lugar" type="text" maxlength="120" aria-describedby="errorTestimonioLugar">
        <span class="campo-error" id="errorTestimonioLugar"></span>

        <label class="campo-label" for="testimonioEstrellas">Puntaje</label>
        <select class="campo-input" id="testimonioEstrellas" name="estrellas">
            <option value="5">5 estrellas</option>
            <option value="4">4 estrellas</option>
            <option value="3">3 estrellas</option>
            <option value="2">2 estrellas</option>
            <option value="1">1 estrella</option>
        </select>

        <label class="campo-label" for="testimonioTexto">Tu opinion <span aria-hidden="true">*</span></label>
        <textarea class="campo-input" id="testimonioTexto" name="texto" rows="5" maxlength="600" aria-describedby="errorTestimonioTexto"></textarea>
        <span class="campo-error" id="errorTestimonioTexto"></span>

        <div class="visually-hidden" aria-hidden="true">
            <label for="testimonioSitio">Dejá este campo vacío</label>
            <input id="testimonioSitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
        </div>

        <p class="formulario-estado" id="testimonioEstado" role="status" aria-live="polite" hidden></p>
        <button class="boton boton-primario boton-bloque" id="testimonioEnviar" type="submit"><span id="testimonioEnviarTexto">Enviar opinion</span></button>
    </form>
</dialog>`;
}

function asistente(raiz) {
    return `<button class="asistente-boton" id="asistenteBoton" type="button" aria-expanded="false" aria-controls="asistentePanel">
    <img src="${raiz}/public/img/personaje/07-guino.svg" alt="">
    <span class="visually-hidden">Abrir asistente ZAPI</span>
</button>
<section class="asistente-panel" id="asistentePanel" aria-labelledby="asistenteTitulo" hidden>
    <header class="asistente-cabecera">
        <img src="${raiz}/public/img/personaje/01-feliz.svg" alt="">
        <div><strong id="asistenteTitulo">Asistente ZAPI</strong><small>Respuestas rápidas del vivero</small></div>
        <button class="icono-boton" id="asistenteCerrar" type="button" aria-label="Cerrar asistente">${icono('close')}</button>
    </header>
    <div class="asistente-mensajes" id="asistenteMensajes" aria-live="polite"></div>
    <form class="asistente-form" id="asistenteForm">
        <label class="visually-hidden" for="asistenteEntrada">Escribí tu consulta</label>
        <input id="asistenteEntrada" name="consulta" type="text" autocomplete="off" placeholder="¿En qué te podemos ayudar?">
        <button type="submit" aria-label="Enviar consulta">${icono('send')}</button>
    </form>
</section>`;
}

function avisoFlotante() {
    return `<div class="aviso-flotante" id="avisoFlotante" role="status" aria-live="polite" hidden>
    ${icono('eco', 'aviso-icono')}
    <div class="aviso-texto"><strong id="avisoFlotanteTitulo"></strong><span id="avisoFlotanteMensaje"></span></div>
    <button class="icono-boton" id="avisoFlotanteCerrar" type="button" aria-label="Cerrar aviso">${icono('close')}</button>
</div>`;
}

const SCRIPTS_BASE = [
    'negocio.js',
    'utilidades.js',
    'catalogo-datos.js',
    'carrito-estado.js',
    'pedidos-estado.js',
    'modal.js',
    'compat-restauracion.js'
];

const SCRIPTS_FINALES = ['menu.js', 'buscador.js', 'asistente.js', 'zapi-bot.js'];

function pagina(opciones) {
    const {
        archivo,
        seccion,
        titulo,
        descripcion,
        robots = 'index, follow',
        claseBody = '',
        raiz = '.',
        scripts = [],
        jsonLd = '',
        contenido,
        canonical = `${NEGOCIO.sitio}/${archivo}`,
        opiniones = false,
        productos = false,
        bodyAttrs = ''
    } = opciones;

    const rutaJs = nombre => `${raiz}/public/js/${nombre}`;
    const todosLosScripts = [...SCRIPTS_BASE, ...scripts, ...SCRIPTS_FINALES];
    const ogImagen = `${NEGOCIO.sitio}/public/img/plants-hero.opt.jpg`;

    const cssPagina = `${raiz}/public/css/${seccion}.css`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapar(titulo)}</title>
    <meta name="description" content="${escapar(descripcion)}">
    <meta name="robots" content="${escapar(robots)}">
    <link rel="canonical" href="${escapar(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ZAPI">
    <meta property="og:locale" content="es_UY">
    <meta property="og:title" content="${escapar(titulo)}">
    <meta property="og:description" content="${escapar(descripcion)}">
    <meta property="og:url" content="${escapar(canonical)}">
    <meta property="og:image" content="${escapar(ogImagen)}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="${raiz}/public/img/logo.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap">
    <link rel="stylesheet" href="${raiz}/public/css/tokens.css">
    <link rel="stylesheet" href="${raiz}/public/css/base.css">
    <link rel="stylesheet" href="${raiz}/public/css/estructura.css">
    <link rel="stylesheet" href="${cssPagina}">
    <link rel="stylesheet" href="${raiz}/public/css/asistente.css">
    <link rel="stylesheet" href="${raiz}/public/css/zapi-bot.css">
    <link rel="stylesheet" href="${raiz}/public/css/restauracion.css">
${jsonLd ? `    ${jsonLd}\n` : ''}</head>
<body class="pagina-${seccion} ${claseBody}" data-raiz="${raiz}"${bodyAttrs ? ' ' + bodyAttrs : ''}>
${cabecera(seccion, raiz)}
<main id="contenido" tabindex="-1">
${contenido}
</main>
${pie(raiz)}
${productos ? modalProducto() : ''}
${opiniones ? dialogoTestimonio() : ''}
${asistente(raiz)}
${avisoFlotante()}
${todosLosScripts.map(nombre => `    <script src="${rutaJs(nombre)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

module.exports = { escapar, icono, pagina, slug };
