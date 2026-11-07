'use strict';

module.exports = {
    archivo: 'pedidos.html',
    seccion: 'pedidos',
    titulo: 'Mis pedidos | ZAPI Vivero Agroecologico',
    descripcion: 'Historial de pedidos realizados con ZAPI, guardados en tu navegador.',
    robots: 'noindex, follow',
    contenido: `
<section class="banner-pagina">
    <div>
        <span class="etiqueta">Mis pedidos</span>
        <h1>Tu historial de pedidos</h1>
        <p>Cada pedido queda guardado en este navegador y se coordina con ZAPI por WhatsApp.</p>
    </div>
</section>

<section class="seccion pedidos-lista" aria-labelledby="tituloPedidos">
    <div class="seccion-cabecera">
        <h2 id="tituloPedidos">Pedidos realizados</h2>
    </div>
    <div id="pedidosContenedor"></div>
    <p id="pedidosVacio" class="estado-vacio" hidden>
        <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
        <strong>No tienes pedidos todavía.</strong>
        <br>Explora el catálogo y armá tu primer pedido.
    </p>
    <div class="pedidos-accion">
        <a class="boton boton-primario" href="./catalogo.html">
            <span class="material-symbols-outlined" aria-hidden="true">eco</span>
            Ir al catálogo
        </a>
    </div>
</section>`,
    scripts: ['pedidos.js']
};
