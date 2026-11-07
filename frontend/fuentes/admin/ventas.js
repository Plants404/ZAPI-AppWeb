'use strict';

module.exports = {
    archivo: 'ventas.html',
    seccion: 'ventas',
    titulo: 'Ventas presenciales',
    descripcion: 'Punto de venta y cierre de caja diario de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Punto de venta</span>
        <p>Registrá una venta en el vivero, descontá stock y cerrá la caja del día.</p>
    </div>
    <div class="admin-filtros">
        <label class="visually-hidden" for="ventasFecha">Fecha</label>
        <input class="campo-input" id="ventasFecha" type="date">
        <button class="boton boton-secundario" type="button" id="ventasActualizar">Actualizar</button>
    </div>
</div>

<p class="formulario-estado" id="ventasEstado" role="status" aria-live="polite" hidden></p>

<section class="admin-grid-pos">
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Buscar</span><h2>Productos</h2></div></header>
        <form class="admin-filtros" id="posBuscarForm">
            <label class="visually-hidden" for="posBuscar">Buscar producto</label>
            <input class="campo-input" id="posBuscar" type="search" placeholder="Nombre o categoría" autocomplete="off">
            <button class="boton boton-primario" type="submit">Buscar</button>
        </form>
        <div class="admin-lista" id="posResultados"></div>
    </article>

    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Ticket</span><h2>Venta actual</h2></div><button class="boton-texto" type="button" id="posVaciar">Vaciar</button></header>
        <div class="admin-lista" id="posTicket"></div>
        <div class="admin-totales">
            <div><span>Subtotal</span><strong id="posSubtotal">$ 0</strong></div>
            <div><span>Descuento</span><input class="campo-input" id="posDescuento" type="number" min="0" step="1" value="0"></div>
            <div class="admin-total"><span>Total</span><strong id="posTotal">$ 0</strong></div>
        </div>
        <form class="admin-form" id="posForm">
            <label class="campo-label" for="posMetodoPago">Método de pago</label>
            <select class="campo-input" id="posMetodoPago" name="metodoPago">
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
            </select>
            <label class="campo-label" for="posNombre">Nombre del cliente (opcional)</label>
            <input class="campo-input" id="posNombre" type="text" maxlength="120">
            <label class="campo-label" for="posTelefono">Teléfono (opcional)</label>
            <input class="campo-input" id="posTelefono" type="tel" maxlength="40">
            <p class="formulario-estado" id="posEstado" role="status" aria-live="polite" hidden></p>
            <button class="boton boton-primario boton-bloque" type="submit">Registrar venta</button>
        </form>
    </article>
</section>

<section class="admin-grid-2">
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Cierre</span><h2>Caja del día</h2></div></header>
        <div class="admin-tabla-scroll">
            <table class="admin-tabla">
                <thead><tr><th>Método</th><th>Ventas</th><th>Total</th><th>Anulado</th></tr></thead>
                <tbody id="ventasCierre"></tbody>
            </table>
        </div>
    </article>
    <article class="admin-card">
        <header class="admin-card-cabecera"><div><span class="admin-etiqueta">Movimientos</span><h2>Ventas del día</h2></div></header>
        <div class="admin-lista" id="ventasLista"></div>
        <nav class="admin-paginacion" id="ventasPaginacion" aria-label="Paginación de ventas"></nav>
    </article>
</section>

<dialog class="admin-dialogo" id="anularDialogo" aria-labelledby="anularTitulo">
    <form class="admin-dialogo-caja" id="anularForm">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta">Anulación</span><h2 id="anularTitulo">Anular venta</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <label class="campo-label" for="anularMotivo">Motivo</label>
        <input class="campo-input" id="anularMotivo" type="text" maxlength="300" required>
        <p class="formulario-estado" id="anularEstado" role="status" aria-live="polite" hidden></p>
        <div class="admin-form-acciones">
            <button class="boton boton-primario" type="submit">Anular y devolver stock</button>
            <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cancelar</button>
        </div>
    </form>
</dialog>`,
    scripts: ['admin-ventas.js']
};
