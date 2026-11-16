'use strict';

module.exports = {
    archivo: 'pedidos.html',
    seccion: 'pedidos',
    titulo: 'Mis pedidos | ZAPI Vivero Agroecologico',
    descripcion: 'Historial de pedidos realizados con ZAPI, guardados en tu navegador.',
    robots: 'noindex, follow',
    contenido: `
<section class="banner-pagina banner-pedidos">
    <div>
        <span class="etiqueta">Tu historial</span>
        <h1>Mis pedidos</h1>
        <p>Cada pedido queda guardado en este navegador y se coordina con ZAPI por WhatsApp.</p>
    </div>
    <ul class="banner-ventajas">
        <li><span class="material-symbols-outlined" aria-hidden="true">chat</span> Pedido coordinado por WhatsApp</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span> Historial guardado en tu navegador</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">autorenew</span> Reenviá cualquier pedido cuando quieras</li>
    </ul>
</section>

<section class="pedidos-contenido">
    <a class="pedidos-explorar" id="pedidosExplorar" href="./catalogo.html" hidden>
        <span class="material-symbols-outlined" aria-hidden="true">eco</span>
        Explorar catálogo
    </a>
    <h2>Pedidos realizados</h2>
    <div id="pedidosContenedor" class="pedidos-lista"></div>
    <div id="pedidosVacio" class="pedidos-vacio" hidden>
        <div class="pedidos-vacio-principal">
            <div class="pedidos-vacio-mensaje">
                <span class="pedidos-vacio-icono material-symbols-outlined" aria-hidden="true">receipt_long</span>
                <h2>No tienes pedidos todavía.</h2>
                <p>Explora el catálogo y armá tu primer pedido.</p>
                <div class="pedidos-vacio-acciones">
                    <a href="./catalogo.html" class="pedidos-boton pedidos-boton-principal"><span class="material-symbols-outlined" aria-hidden="true">eco</span> Explorar catálogo</a>
                    <a href="./carrito.html" class="pedidos-boton pedidos-boton-secundario">Ir al carrito</a>
                </div>
            </div>
        </div>
        <ol class="pedidos-pasos">
            <li><span class="pedidos-paso-numero">01</span><div><h3>Armá tu carrito</h3><p>Elegí tus plantas del catálogo y ajustá las cantidades.</p></div></li>
            <li><span class="pedidos-paso-numero">02</span><div><h3>Enviá tu pedido</h3><p>Lo mandás por WhatsApp y lo confirmamos con vos.</p></div></li>
            <li><span class="pedidos-paso-numero">03</span><div><h3>Seguilo acá</h3><p>El historial de pedidos queda guardado en este navegador.</p></div></li>
        </ol>
    </div>
</section>
`,
    scripts: ['pedidos.js']
};
