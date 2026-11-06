'use strict';

module.exports = {
    archivo: 'clientes.html',
    seccion: 'clientes',
    titulo: 'Clientes',
    descripcion: 'Cuentas de clientes, historial de compras y bloqueos de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Cuentas</span>
        <p>Consultá el historial de cada cliente y bloqueá cuentas si es necesario.</p>
    </div>
</div>

<form class="admin-filtros" id="clientesFiltros">
    <label class="visually-hidden" for="clientesBuscar">Buscar</label>
    <input class="campo-input" id="clientesBuscar" name="q" type="search" placeholder="Nombre, correo o teléfono">
    <select class="campo-input" name="activo" aria-label="Estado">
        <option value="">Todas las cuentas</option>
        <option value="1">Activas</option>
        <option value="0">Bloqueadas</option>
    </select>
    <button class="boton boton-primario" type="submit">Filtrar</button>
    <button class="boton boton-secundario" type="reset">Limpiar</button>
</form>

<p class="formulario-estado" id="clientesEstado" role="status" aria-live="polite" hidden></p>

<div class="admin-card">
    <div class="admin-tabla-scroll">
        <table class="admin-tabla">
            <thead>
                <tr><th>Cliente</th><th>Correo</th><th>Teléfono</th><th>Pedidos</th><th>Total gastado</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="clientesTabla"></tbody>
        </table>
    </div>
    <nav class="admin-paginacion" id="clientesPaginacion" aria-label="Paginación de clientes"></nav>
</div>

<dialog class="admin-dialogo" id="clienteDialogo" aria-labelledby="clienteDialogoTitulo">
    <div class="admin-dialogo-caja admin-dialogo-ancho">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta">Ficha</span><h2 id="clienteDialogoTitulo">Cliente</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div id="clienteDetalle"></div>
        <div class="admin-tabla-scroll">
            <table class="admin-tabla">
                <thead><tr><th>Pedido</th><th>Fecha</th><th>Canal</th><th>Estado</th><th>Total</th></tr></thead>
                <tbody id="clientePedidos"></tbody>
            </table>
        </div>
        <p class="formulario-estado" id="clienteDialogoEstado" role="status" aria-live="polite" hidden></p>
        <div class="admin-form-acciones">
            <button class="boton boton-primario" type="button" id="clienteBloquear">Bloquear cuenta</button>
            <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cerrar</button>
        </div>
    </div>
</dialog>`,
    scripts: ['admin-clientes.js']
};
