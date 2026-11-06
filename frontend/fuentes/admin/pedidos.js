'use strict';

module.exports = {
    archivo: 'pedidos.html',
    seccion: 'pedidos',
    titulo: 'Pedidos online',
    descripcion: 'Gestión de pedidos online de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Pedidos online</span>
        <p>Revisá el detalle, cambiá el estado y dejá notas internas.</p>
    </div>
    <form class="admin-filtros" id="ordenesFiltros">
        <label class="visually-hidden" for="ordenesBuscar">Buscar</label>
        <input class="campo-input" id="ordenesBuscar" name="q" type="search" placeholder="Código, nombre, correo o teléfono">
        <label class="visually-hidden" for="ordenesEstado">Estado</label>
        <select class="campo-input" id="ordenesEstado" name="estado">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="preparando">Preparando</option>
            <option value="enviado">Enviado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
        </select>
        <input class="campo-input" name="desde" type="date" aria-label="Desde">
        <input class="campo-input" name="hasta" type="date" aria-label="Hasta">
        <button class="boton boton-primario" type="submit">Filtrar</button>
        <button class="boton boton-secundario" type="reset">Limpiar</button>
    </form>
</div>

<p class="formulario-estado" id="ordenesEstadoLista" role="status" aria-live="polite" hidden></p>

<div class="admin-card">
    <div class="admin-tabla-scroll">
        <table class="admin-tabla">
            <thead>
                <tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Estado</th><th>Total</th><th></th></tr>
            </thead>
            <tbody id="ordenesTabla"></tbody>
        </table>
    </div>
    <nav class="admin-paginacion" id="ordenesPaginacion" aria-label="Paginación de pedidos"></nav>
</div>

<dialog class="admin-dialogo" id="ordenDialogo" aria-labelledby="ordenDialogoTitulo">
    <div class="admin-dialogo-caja">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta" id="ordenDialogoCodigo"></span><h2 id="ordenDialogoTitulo">Detalle del pedido</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar detalle"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div class="admin-dialogo-cuerpo" id="ordenDetalle"></div>
        <form class="admin-form" id="ordenForm">
            <label class="campo-label" for="ordenEstado">Estado</label>
            <select class="campo-input" id="ordenEstado" name="estado">
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="preparando">Preparando</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
            </select>
            <label class="campo-label" for="ordenNotasInternas">Notas internas</label>
            <textarea class="campo-input" id="ordenNotasInternas" name="notasInternas" rows="3" maxlength="2000"></textarea>
            <label class="campo-label" for="ordenMotivo">Motivo de cancelación (si cancelás)</label>
            <input class="campo-input" id="ordenMotivo" name="motivoCancelacion" type="text" maxlength="300">
            <p class="formulario-estado" id="ordenFormEstado" role="status" aria-live="polite" hidden></p>
            <div class="admin-form-acciones">
                <button class="boton boton-primario" type="submit">Guardar cambios</button>
                <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cancelar</button>
            </div>
        </form>
    </div>
</dialog>`,
    scripts: ['admin-pedidos.js']
};
