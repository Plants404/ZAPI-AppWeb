'use strict';

const { NEGOCIO, slug } = require('../../public/js/negocio.js');

const ENLACES = [
    { seccion: 'inicio', texto: 'Inicio', archivo: 'index.html' },
    { seccion: 'catalogo', texto: 'Catálogo', archivo: 'catalogo.html' },
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
        <button class="menu-boton" id="navToggle" type="button" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menú de navegación">
            <span class="menu-linea" aria-hidden="true"></span>
            <span class="menu-linea" aria-hidden="true"></span>
            <span class="menu-linea" aria-hidden="true"></span>
        </button>

        <a class="marca" href="${raiz}/index.html" aria-label="ZAPI, ir al inicio">
            <img src="${raiz}/public/img/logo.svg" alt="" width="44" height="62">
            <span class="marca-texto"><strong>ZAPI</strong><small>Vivero agroecológico</small></span>
        </a>

        <nav class="site-nav" id="navPrincipal" aria-label="Navegación principal">
            <ul>${ENLACES.map(enlace => enlaceNavegacion(enlace, seccion, raiz)).join('')}</ul>
        </nav>

        <form class="header-search" id="headerSearch" role="search" action="${raiz}/catalogo.html" autocomplete="off">
            <label class="visually-hidden" for="searchInput">Buscar productos</label>
            ${icono('search', 'header-search-icono')}
            <input id="searchInput" name="q" type="search" placeholder="Buscar productos…" aria-describedby="searchStatus" spellcheck="false">
            <button class="search-limpiar" id="searchClear" type="button" aria-label="Limpiar búsqueda" hidden>${icono('close')}</button>
        </form>

        <a class="header-carrito" href="${raiz}/carrito.html" aria-label="Ver carrito">
            ${icono('shopping_bag')}
            <span class="cart-count" data-cart-count aria-hidden="true">0</span>
        </a>

        <div class="header-sesion" data-sesion></div>
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
        <nav class="footer-nav" aria-label="Páginas del sitio">
            <h2>Navegar</h2>
            ${ENLACES.map(enlace => `<a href="${raiz}/${enlace.archivo}">${enlace.texto}</a>`).join('')}
            <a href="${raiz}/carrito.html">Carrito</a>
            <a href="${raiz}/cuenta.html">Mi cuenta</a>
        </nav>
        <div class="footer-contacto">
            <h2>Contacto</h2>
            <p>${escapar(NEGOCIO.direccion)}</p>
            <a href="https://wa.me/${NEGOCIO.whatsapp}" target="_blank" rel="noopener">WhatsApp ${NEGOCIO.whatsappVisible}</a>
            <a href="${raiz}/contacto.html">Escribinos por correo</a>
        </div>
    </div>
    <p class="footer-legal">ZAPI · Vivero agroecológico · Precios sujetos a disponibilidad.</p>
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
        <button class="icono-boton dialogo-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar formulario de opinión">${icono('close')}</button>
        <span class="etiqueta">Tu experiencia</span>
        <h2 id="testimonioTitulo">Contanos cómo fue tu compra</h2>
        <p>Leemos todas las opiniones. Publicamos solo las que están verificadas y autorizadas.</p>

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

        <label class="campo-label" for="testimonioTexto">Tu opinión <span aria-hidden="true">*</span></label>
        <textarea class="campo-input" id="testimonioTexto" name="texto" rows="5" maxlength="600" aria-describedby="errorTestimonioTexto"></textarea>
        <span class="campo-error" id="errorTestimonioTexto"></span>

        <div class="visually-hidden" aria-hidden="true">
            <label for="testimonioSitio">Dejá este campo vacío</label>
            <input id="testimonioSitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
        </div>

        <p class="formulario-estado" id="testimonioEstado" role="status" aria-live="polite" hidden></p>
        <button class="boton boton-primario boton-bloque" id="testimonioEnviar" type="submit"><span id="testimonioEnviarTexto">Enviar opinión</span></button>
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

function promocion() {
    return `<aside class="promocion-banner" data-promocion hidden>
    <div>
        <strong data-promocion-titulo></strong>
        <span data-promocion-texto></span>
    </div>
    <a class="enlace-flecha" data-promocion-enlace hidden>Ver más ${icono('arrow_forward')}</a>
</aside>`;
}

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
        canonical = `${NEGOCIO.sitio}/${archivo}`
    } = opciones;

    const rutaJs = nombre => `${raiz}/public/js/${nombre}`;
    const scriptsBase = [
        'negocio.js',
        'utilidades.js',
        'api.js',
        'configuracion.js',
        'sesion.js',
        'catalogo-datos.js',
        'carrito-estado.js',
        'modal.js'
    ];
    const scriptsFinales = ['menu.js', 'buscador.js', 'asistente.js', 'contenido-publico.js'];
    const todosLosScripts = [...scriptsBase, ...scripts, ...scriptsFinales];
    const ogImagen = `${NEGOCIO.sitio}/public/img/plants-hero.opt.jpg`;

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
    <link rel="stylesheet" href="${raiz}/public/css/${seccion === 'inicio' ? 'inicio' : seccion}.css">
    <link rel="stylesheet" href="${raiz}/public/css/asistente.css">
${jsonLd ? `    ${jsonLd}\n` : ''}</head>
<body class="pagina-${seccion} ${claseBody}" data-raiz="${raiz}">
${cabecera(seccion, raiz)}
${promocion()}
<main id="contenido" tabindex="-1">
${contenido}
</main>
${pie(raiz)}
${modalProducto()}
${dialogoTestimonio()}
${asistente(raiz)}
${avisoFlotante()}
${todosLosScripts.map(nombre => `    <script src="${rutaJs(nombre)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

const ENLACES_ADMIN = [
    { seccion: 'dashboard', texto: 'Dashboard', archivo: 'index.html', icono: 'dashboard' },
    { seccion: 'pedidos', texto: 'Pedidos online', archivo: 'pedidos.html', icono: 'receipt_long' },
    { seccion: 'ventas', texto: 'Ventas presenciales', archivo: 'ventas.html', icono: 'point_of_sale' },
    { seccion: 'productos', texto: 'Productos y stock', archivo: 'productos.html', icono: 'inventory_2' },
    { seccion: 'testimonios', texto: 'Testimonios', archivo: 'testimonios.html', icono: 'rate_review' },
    { seccion: 'clientes', texto: 'Clientes', archivo: 'clientes.html', icono: 'group' },
    { seccion: 'contenido', texto: 'Contenido', archivo: 'contenido.html', icono: 'edit_document' },
    { seccion: 'auditoria', texto: 'Auditoría', archivo: 'auditoria.html', icono: 'history' }
];

function paginaAdmin(opciones) {
    const {
        seccion,
        titulo,
        descripcion,
        contenido,
        scripts = []
    } = opciones;

    const raiz = '..';
    const scriptsBase = ['negocio.js', 'utilidades.js', 'api.js', 'admin-comun.js'];
    const todosLosScripts = [...scriptsBase, ...scripts];

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapar(titulo)}</title>
    <meta name="description" content="${escapar(descripcion)}">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/svg+xml" href="${raiz}/public/img/logo.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap">
    <link rel="stylesheet" href="${raiz}/public/css/tokens.css">
    <link rel="stylesheet" href="${raiz}/public/css/base.css">
    <link rel="stylesheet" href="${raiz}/public/css/admin.css">
</head>
<body class="admin" data-raiz="${raiz}">
<a class="salto-contenido" href="#contenidoAdmin">Saltar al contenido</a>
<div class="admin-shell">
    <aside class="admin-sidebar" id="adminSidebar" aria-label="Navegación del panel">
        <a class="admin-marca" href="${raiz}/index.html">
            <img src="${raiz}/public/img/logo.svg" alt="" width="38" height="54">
            <span><strong>ZAPI</strong><small>Panel</small></span>
        </a>
        <nav class="admin-nav">
            ${ENLACES_ADMIN.map(enlace => `<a class="admin-enlace${enlace.seccion === seccion ? ' activo' : ''}" href="./${enlace.archivo}"${enlace.seccion === seccion ? ' aria-current="page"' : ''}>${icono(enlace.icono)}<span>${enlace.texto}</span></a>`).join('\n            ')}
        </nav>
        <a class="admin-volver" href="${raiz}/index.html">${icono('storefront')}<span>Ver el sitio</span></a>
    </aside>

    <div class="admin-principal">
        <header class="admin-topbar">
            <button class="admin-menu" id="adminMenuBoton" type="button" aria-expanded="false" aria-controls="adminSidebar" aria-label="Abrir menú del panel">${icono('menu')}</button>
            <div>
                <span class="admin-topbar-etiqueta">Panel de administración</span>
                <h1>${escapar(titulo)}</h1>
            </div>
            <div class="admin-sesion">
                <span class="admin-usuario" data-admin-usuario>—</span>
                <button class="boton-texto" type="button" data-admin-salir>${icono('logout')} Salir</button>
            </div>
        </header>

        <main class="admin-contenido" id="contenidoAdmin" tabindex="-1">
${contenido}
        </main>
    </div>
</div>
${todosLosScripts.map(nombre => `    <script src="${raiz}/public/js/${nombre}" defer></script>`).join('\n')}
</body>
</html>
`;
}

function estrellas(valor) {
    const nota = Math.min(5, Math.max(0, Number(valor) || 0));
    const llenas = Math.floor(nota);
    const media = nota - llenas >= 0.5;
    let salida = '';

    for (let i = 0; i < llenas; i++) salida += '★';
    if (media) salida += '½';
    for (let i = llenas + (media ? 1 : 0); i < 5; i++) salida += '☆';

    return `<span class="estrellas" role="img" aria-label="${nota} de 5 estrellas">${salida}</span>`;
}

module.exports = { escapar, icono, pagina, paginaAdmin, estrellas, slug };
