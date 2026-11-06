'use strict';

module.exports = {
    archivo: 'index.html',
    seccion: 'dashboard',
    titulo: 'Dashboard',
    descripcion: 'Resumen de ventas online y presenciales de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Resumen general</span>
        <p>Ventas, márgenes y pendientes del período seleccionado.</p>
    </div>
    <form class="admin-filtros" id="dashboardFiltros">
        <label class="visually-hidden" for="dashboardDesde">Desde</label>
        <input class="campo-input" id="dashboardDesde" name="desde" type="date">
        <label class="visually-hidden" for="dashboardHasta">Hasta</label>
        <input class="campo-input" id="dashboardHasta" name="hasta" type="date">
        <button class="boton boton-primario" type="submit">Aplicar</button>
        <button class="boton boton-secundario" type="button" data-rango="hoy">Hoy</button>
        <button class="boton boton-secundario" type="button" data-rango="semana">Semana</button>
        <button class="boton boton-secundario" type="button" data-rango="mes">Mes</button>
        <a class="boton boton-secundario" id="dashboardExportar" href="../api/admin/dashboard/export.csv" download>Exportar CSV</a>
    </form>
</div>

<p class="formulario-estado" id="dashboardEstado" role="status" aria-live="polite" hidden></p>

<section class="admin-resumen" aria-label="Resumen por período">
    <article class="admin-kpi"><span>Hoy</span><strong id="kpiHoyTotal">—</strong><small id="kpiHoyDetalle"></small></article>
    <article class="admin-kpi"><span>Esta semana</span><strong id="kpiSemanaTotal">—</strong><small id="kpiSemanaDetalle"></small></article>
    <article class="admin-kpi"><span>Este mes</span><strong id="kpiMesTotal">—</strong><small id="kpiMesDetalle"></small></article>
    <article class="admin-kpi"><span>Ticket promedio</span><strong id="kpiTicket">—</strong><small id="kpiTicketDetalle"></small></article>
</section>

<section class="admin-grid-2" aria-label="Indicadores del período">
    <article class="admin-card">
        <header class="admin-card-cabecera">
            <div><span class="admin-etiqueta">Período</span><h2>Ventas y margen</h2></div>
            <span class="admin-rango" id="dashboardRango"></span>
        </header>
        <div class="admin-kpi-linea">
            <div><span>Online</span><strong id="kpiOnline">—</strong><small id="kpiOnlineDetalle"></small></div>
            <div><span>Presencial</span><strong id="kpiPresencial">—</strong><small id="kpiPresencialDetalle"></small></div>
            <div><span>Total</span><strong id="kpiTotal">—</strong><small id="kpiTotalDetalle"></small></div>
            <div><span>Margen bruto</span><strong id="kpiMargen">—</strong><small id="kpiMargenDetalle"></small></div>
        </div>
        <p class="admin-comparacion" id="dashboardComparacion"></p>
    </article>

    <article class="admin-card">
        <header class="admin-card-cabecera">
            <div><span class="admin-etiqueta">Evolución</span><h2>Ventas por día</h2></div>
            <span class="admin-leyenda"><i class="leyenda-online"></i> Online <i class="leyenda-presencial"></i> Presencial</span>
        </header>
        <div class="admin-grafico" id="dashboardGrafico"></div>
    </article>
</section>

<section class="admin-grid-2" aria-label="Detalle de ventas">
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Cobros</span><h2>Métodos de pago</h2></div></header>
        <div class="admin-lista" id="dashboardMetodos"></div>
    </article>
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Ranking</span><h2>Top 10 productos</h2></div></header>
        <div class="admin-tabla-scroll">
            <table class="admin-tabla">
                <thead><tr><th>Producto</th><th>Cant.</th><th>Ingresos</th><th>Margen</th></tr></thead>
                <tbody id="dashboardTop"></tbody>
            </table>
        </div>
    </article>
</section>

<section class="admin-grid-3" aria-label="Pendientes">
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Stock</span><h2>Stock bajo</h2></div><span class="admin-contador" id="dashboardStockContador">0</span></header>
        <div class="admin-lista" id="dashboardStock"></div>
    </article>
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Online</span><h2>Pedidos pendientes</h2></div><span class="admin-contador" id="dashboardPendientesContador">0</span></header>
        <div class="admin-lista" id="dashboardPendientes"></div>
    </article>
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Comunidad</span><h2>Novedades</h2></div></header>
        <div class="admin-lista">
            <div class="admin-dato"><span>Clientes nuevos</span><strong id="dashboardClientesNuevos">0</strong></div>
            <div class="admin-dato"><span>Testimonios pendientes</span><strong id="dashboardTestimoniosPendientes">0</strong></div>
        </div>
        <div class="admin-acciones">
            <a class="boton boton-secundario" href="./pedidos.html">Ver pedidos</a>
            <a class="boton boton-secundario" href="./testimonios.html">Moderar opiniones</a>
        </div>
    </article>
</section>`,
    scripts: ['admin-dashboard.js']
};
