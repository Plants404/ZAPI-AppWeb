'use strict';

module.exports = {
    archivo: 'pedidos.html',
    seccion: 'pedidos',
    titulo: 'Mis pedidos | ZAPI Vivero Agroecologico',
    descripcion: 'Historial de pedidos realizados con ZAPI, guardados en tu navegador.',
    robots: 'noindex, follow',
    contenido: `
    <div class="pedidos-heading">
        <div class="pedidos-heading-copy">
            <span class="cart-eyebrow">TU HISTORIAL</span>
            <h1>Tu historial de pedidos</h1>
            <p>Cada pedido queda guardado en este navegador y se coordina con ZAPI por WhatsApp.</p>
        </div>
        <a class="pedidos-explorar" id="pedidosExplorar" href="./catalogo.html" hidden>
            <span class="material-symbols-outlined" aria-hidden="true">eco</span>
            Explorar catálogo
        </a>
    </div>
    <h2>Pedidos realizados</h2>
    <div id="pedidosContenedor" class="pedidos-lista"></div>
    <div id="pedidosVacio" class="pedidos-vacio hidden" hidden>
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
            <div class="pedidos-ejemplo" aria-hidden="true">
                <p class="pedidos-ejemplo-eyebrow">ASÍ SE VERÁ TU PRIMER PEDIDO</p>
                <div class="pedidos-ejemplo-tarjeta">
                    <div class="pedidos-ejemplo-cabecera"><strong>Pedido de ejemplo</strong><span>Pendiente</span></div>
                    <div class="pedidos-ejemplo-linea"><span>2× Albahaca</span><strong>$ 300</strong></div>
                    <div class="pedidos-ejemplo-linea"><span>1× Ruda</span><strong>$ 120</strong></div>
                    <div class="pedidos-ejemplo-total"><span>Total</span><strong>$ 420</strong></div>
                </div>
            </div>
        </div>
        <ol class="pedidos-pasos">
            <li><span class="pedidos-paso-numero">01</span><div><h3>Armá tu carrito</h3><p>Elegí tus plantas del catálogo y ajustá las cantidades.</p></div></li>
            <li><span class="pedidos-paso-numero">02</span><div><h3>Enviá tu pedido</h3><p>Lo mandás por WhatsApp y lo confirmamos con vos.</p></div></li>
            <li><span class="pedidos-paso-numero">03</span><div><h3>Seguilo acá</h3><p>El historial de pedidos queda guardado en este navegador.</p></div></li>
        </ol>
    </div>
`,
    scripts: ['pedidos.js']
};
