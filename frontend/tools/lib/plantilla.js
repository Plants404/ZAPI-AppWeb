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

function limpiarEspaciosFinales(html) {
    return html.replace(/[ \t]+$/gm, '');
}

function icono(nombre, clase = '') {
    return `<span class="material-symbols-outlined${clase ? ' ' + clase : ''}" aria-hidden="true">${nombre}</span>`;
}

function enlaceNavegacion(enlace, seccion, raiz) {
    const activo = enlace.seccion === seccion;
    return `<li><a class="nav-link nav-enlace${activo ? ' active activo' : ''}" href="${raiz}/${enlace.archivo}"${activo ? ' aria-current="page"' : ''}>${enlace.texto}</a></li>`;
}

function cabecera(seccion, raiz, fichaProducto) {
    const headerClass = fichaProducto ? ' header-producto' : '';
    const logoContenido = '<div class="logo-items-text"><span class="logo-nombre">ZAPI</span></div><div class="logo-items-img"><img src="' + raiz + '/public/img/logo.svg" alt="" width="42" height="42"></div>';

    return `<header class="site-header${headerClass}" data-header>
        <button class="nav-toggle menu-boton" id="navToggle" type="button" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menu de navegacion">
            <span class="nav-toggle-barra menu-linea" aria-hidden="true"></span>
            <span class="nav-toggle-barra menu-linea" aria-hidden="true"></span>
            <span class="nav-toggle-barra menu-linea" aria-hidden="true"></span>
            <span class="cart-count cart-count-toggle" data-cart-count aria-hidden="true">0</span>
        </button>

        <a class="logo${fichaProducto ? '' : ' marca'}" href="${raiz}/index.html" aria-label="ZAPI, ir al inicio">
            ${logoContenido}
        </a>

        <form class="header-search${fichaProducto ? ' buscador-producto' : ''}" id="headerSearch" role="search" action="${raiz}/catalogo.html" autocomplete="off">
            <label class="visually-hidden" for="searchInput">Buscar productos</label>
            ${fichaProducto ? '' : icono('search', 'header-search-icono')}
            <input class="header-search-input" id="searchInput" name="q" type="search" placeholder="Buscar productos..." aria-describedby="searchStatus" spellcheck="false">
            ${fichaProducto ? `<button class="buscador-submit" type="submit" aria-label="Buscar">${icono('search')}</button>` : ''}
            <button class="header-search-limpiar search-limpiar" id="searchClear" type="button" aria-label="Limpiar busqueda" hidden>${icono('close')}</button>
        </form>

        <a class="header-cart header-carrito${fichaProducto ? ' carrito-enlace' : ''}" href="${raiz}/carrito.html" aria-label="Ver carrito">
            ${icono('shopping_bag')}
            <span class="cart-count" data-cart-count aria-hidden="true">0</span>
        </a>

        <nav class="nav-bar site-nav" id="navPrincipal" aria-label="Navegacion principal">
            <ul>${ENLACES.map(enlace => enlaceNavegacion(enlace, seccion, raiz)).join('')}<li><a class="nav-link nav-enlace" href="${raiz}/login.html">Ingresar</a></li></ul>
        </nav>
</header>
<div class="nav-backdrop" id="navBackdrop" hidden></div>
<p class="visually-hidden" id="searchStatus" role="status" aria-live="polite"></p>`;
}

function hojaMenu(raiz, seccion) {
    const items = [
        ['index.html', 'home', 'Inicio', 'inicio'],
        ['catalogo.html', 'eco', 'Catálogo', 'catalogo'],
        ['servicios.html', 'auto_awesome', 'Servicios', 'servicios'],
        ['nosotros.html', 'group', 'Nosotros', 'nosotros'],
        ['contacto.html', 'mail', 'Contacto', 'contacto'],
        ['carrito.html', 'shopping_bag', 'Carrito', 'carrito']
    ];

    return `<div class="bottom-sheet" id="hojaMenu" role="dialog" aria-modal="true" aria-label="Menú principal" hidden inert>
    <div class="bottom-sheet-manija" aria-hidden="true"></div>
    <header class="bottom-sheet-cabecera">
        <h2 class="bottom-sheet-titulo">Menú</h2>
        <button class="bottom-sheet-cerrar" type="button" aria-label="Cerrar menú">${icono('close')}</button>
    </header>
    <nav class="bottom-sheet-nav" aria-label="Opciones del menú">
        <ul class="bottom-sheet-grilla">${items.map(([archivo, simbolo, texto, clave]) => `<li>
            <a class="bottom-sheet-tarjeta" href="${raiz}/${archivo}"${clave === seccion ? ' aria-current="page"' : ''}>
                <span class="bottom-sheet-icono">${icono(simbolo)}</span>
                <span class="bottom-sheet-etiq">${texto}</span>
                ${clave === 'carrito' ? '<span class="cart-count" data-cart-count aria-hidden="true">0</span>' : ''}
            </a>
        </li>`).join('')}</ul>
    </nav>
    <div class="bottom-sheet-cuenta">
    <div class="bottom-sheet-fila-pedidos" data-cuentas-off>
        <a href="${raiz}/pedidos.html" class="bottom-sheet-pedidos">Mis pedidos ›</a>
    </div>
    <a href="${raiz}/login.html" class="bottom-sheet-ingresar" data-auth-no-sesion>Ingresar</a>
    </div>
</div>`;
}

function pie(raiz, archivo) {
    if (archivo === 'carrito.html' || archivo === 'pedidos.html') {
        return `<footer class="cart-footer">
    <p>ZAPI · Vivero Agroecológico · Precios sujetos a disponibilidad</p>
</footer>`;
    }

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
    <div class="modal-fondo" data-cerrar-modal></div>
    <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modalTitulo" tabindex="-1">
        <button class="icono-boton modal-cerrar" type="button" data-cerrar-modal aria-label="Cerrar detalle del producto">${icono('close')}</button>
        <div class="modal-carrusel modal-galeria" id="modalCarrusel">
            <div class="carrusel-marco modal-foto">
                <img class="carrusel-img" id="carruselImg" src="" alt="">
                <button class="carrusel-flecha carrusel-prev" type="button" aria-label="Foto anterior">${icono('chevron_left')}</button>
                <button class="carrusel-flecha carrusel-next" type="button" aria-label="Foto siguiente">${icono('chevron_right')}</button>
                <span class="carrusel-contador" id="carruselContador" aria-live="polite"></span>
            </div>
            <div class="carrusel-miniaturas" id="carruselMiniaturas" aria-label="Miniaturas del producto"></div>
        </div>
        <div class="modal-detalle">
            <span class="modal-categoria etiqueta" id="modalCategoria"></span>
            <h2 class="modal-titulo" id="modalTitulo"></h2>
            <p class="modal-descripcion" id="modalDescripcion"></p>
            <ul class="modal-info lista-ventajas" id="modalInfo"></ul>
            <p class="modal-precio"><span class="current" id="modalPrecio"></span></p>
            <p class="modal-stock stock" id="modalStock"></p>
            <button class="modal-agregar add-cart boton boton-primario" type="button" id="modalAgregar" data-id="">${icono('add_shopping_cart')} Agregar al carrito</button>
            <a class="modal-ficha enlace-flecha" id="modalFicha" hidden>Ver la ficha completa ${icono('arrow_forward')}</a>
        </div>
    </div>
</dialog>`;
}

function dialogoTestimonio() {
    return `<dialog class="testimonio-modal dialogo" id="dialogoTestimonio" aria-labelledby="testimonioTitulo">
    <div class="testimonio-fondo" data-cerrar-dialogo></div>
    <form class="testimonio-caja testimonio-form dialogo-caja" id="testimonioForm" novalidate>
        <button class="testimonio-cerrar-x icono-boton dialogo-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar formulario de opinion">${icono('close')}</button>
        <span class="etiqueta">Tu experiencia</span>
        <h2 class="testimonio-titulo" id="testimonioTitulo">Contanos cómo fue tu compra</h2>
        <p class="testimonio-bajada">Leemos todas las opiniones. Publicamos solo las que estan verificadas y autorizadas.</p>

        <div class="testimonio-campo">
            <label class="testimonio-etiqueta campo-label" for="testimonioNombre">Nombre <span aria-hidden="true">*</span></label>
            <input class="testimonio-input campo-input" id="testimonioNombre" name="autor" type="text" autocomplete="name" maxlength="120" aria-describedby="errorTestimonioNombre">
            <span class="testimonio-error campo-error" id="errorTestimonioNombre"></span>
        </div>
        <div class="testimonio-campo">
            <label class="testimonio-etiqueta campo-label" for="testimonioLugar">Lugar (opcional)</label>
            <input class="testimonio-input campo-input" id="testimonioLugar" name="lugar" type="text" maxlength="120" aria-describedby="errorTestimonioLugar">
            <span class="testimonio-error campo-error" id="errorTestimonioLugar"></span>
        </div>
        <div class="testimonio-campo">
            <label class="testimonio-etiqueta campo-label" for="testimonioEstrellas">Puntaje</label>
            <select class="testimonio-input campo-input" id="testimonioEstrellas" name="estrellas">
                <option value="5">5 estrellas</option>
                <option value="4">4 estrellas</option>
                <option value="3">3 estrellas</option>
                <option value="2">2 estrellas</option>
                <option value="1">1 estrella</option>
            </select>
        </div>
        <div class="testimonio-campo">
            <label class="testimonio-etiqueta campo-label" for="testimonioTexto">Tu opinion <span aria-hidden="true">*</span></label>
            <textarea class="testimonio-texto campo-input" id="testimonioTexto" name="texto" rows="5" maxlength="600" aria-describedby="errorTestimonioTexto"></textarea>
            <span class="testimonio-error campo-error" id="errorTestimonioTexto"></span>
        </div>

        <div class="visually-hidden" aria-hidden="true">
            <label for="testimonioSitio">Dejá este campo vacío</label>
            <input id="testimonioSitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
        </div>

        <p class="testimonio-error formulario-estado" id="testimonioEstado" role="status" aria-live="polite" hidden></p>
        <div class="testimonio-acciones">
            <button class="testimonio-btn-secundario" type="button" data-cerrar-dialogo>Cerrar</button>
            <button class="testimonio-btn-primario boton boton-primario boton-bloque" id="testimonioEnviar" type="submit"><span id="testimonioEnviarTexto">Enviar opinion</span></button>
        </div>
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
    const fichaProducto = archivo.startsWith('producto-');

    const cssPropio = `${seccion === 'catalogo' ? 'catalogo-catalogo' : seccion}.css`;
    const hojas = archivo === 'login.html'
        ? ['tokens.css', 'styles.css', 'login.css', 'zapi-bot.css', 'asistente.css', 'restauracion.css']
        : fichaProducto
            ? ['styles.css', 'tokens.css', 'base.css', 'estructura.css', 'estilos-producto.css', 'zapi-bot.css', 'asistente.css', 'ajustes-estilo.css']
            : [
                'tokens.css',
                'base.css',
                'estructura.css',
                cssPropio,
                ...(archivo === 'index.html' || archivo === 'carrito.html'
                    ? ['catalogo-catalogo.css', 'catalogo-modal.css']
                    : archivo === 'catalogo.html'
                        ? ['catalogo-modal.css']
                    : []),
                'zapi-bot.css',
                'asistente.css'
            ];
    const fuentes = fichaProducto
        ? 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:opsz,wght@14..32,100..900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap'
        : 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:opsz,wght@14..32,100..900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Montserrat:wght@400;500;600;700&display=swap';
    const preloadHero = archivo === 'index.html'
        ? `    <link rel="preload" as="image" href="${raiz}/public/img/plants-hero.opt.jpg" fetchpriority="high">\n`
        : '';

    if (archivo === '404.html') {
        return limpiarEspaciosFinales(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="${escapar(robots)}">
    <meta name="description" content="${escapar(descripcion)}">
    <link rel="canonical" href="${escapar(canonical)}">
    <title>${escapar(titulo)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:opsz,wght@14..32,100..900&display=swap">
    <link rel="stylesheet" href="${raiz}/public/css/404.css">
</head>
<body>
${contenido}
</body>
</html>
`);
    }

    return limpiarEspaciosFinales(`<!DOCTYPE html>
    <html lang="es" data-cuentas="off">
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
    <link rel="stylesheet" href="${fuentes}">
${preloadHero}${hojas.map(hoja => `    <link rel="stylesheet" href="${raiz}/public/css/${hoja}">`).join('\n')}
${jsonLd ? `    ${jsonLd}\n` : ''}</head>
<body class="pagina-${seccion} ${claseBody}" data-raiz="${raiz}"${bodyAttrs ? ' ' + bodyAttrs : ''}>
${cabecera(seccion, raiz, fichaProducto)}
${hojaMenu(raiz, seccion)}
<main id="contenido" tabindex="-1"${archivo === 'pedidos.html' ? ' class="pedidos-page"' : ''}>
${contenido}
</main>
${fichaProducto ? `<a class="cart-link-float" href="${raiz}/carrito.html" id="cartLinkFloat">
    ${icono('shopping_bag')}
    <span class="cart-link-text">Ver carrito</span>
    <span id="cartCountFloat" class="cart-count" data-cart-count>0</span>
</a>
<footer class="footer-producto">
    <p>ZAPI</p>
    <nav aria-label="Enlaces del pie">
        <a href="${raiz}/index.html">Inicio</a>
        <a href="${raiz}/catalogo.html">Catalogo</a>
        <a href="${raiz}/carrito.html">Carrito</a>
    </nav>
</footer>` : pie(raiz, archivo)}
${productos && !fichaProducto ? modalProducto() : ''}
${opiniones ? dialogoTestimonio() : ''}
${asistente(raiz)}
${avisoFlotante()}
${todosLosScripts.map(nombre => `    <script src="${rutaJs(nombre)}" defer></script>`).join('\n')}
</body>
</html>
`);
}

module.exports = { escapar, icono, pagina, slug };
