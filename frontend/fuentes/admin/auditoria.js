'use strict';

module.exports = {
    archivo: 'auditoria.html',
    seccion: 'auditoria',
    titulo: 'Auditoría',
    descripcion: 'Registro de acciones del panel de administración de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Trazabilidad</span>
        <p>Quién hizo qué y cuándo sobre pedidos, ventas, productos, clientes y contenido.</p>
    </div>
</div>

<form class="admin-filtros" id="auditoriaFiltros">
    <label class="visually-hidden" for="auditoriaBuscar">Buscar</label>
    <input class="campo-input" id="auditoriaBuscar" name="q" type="search" placeholder="Actor, acción o identificador">
    <select class="campo-input" id="auditoriaEntidad" name="entidad" aria-label="Entidad"><option value="">Todas las entidades</option></select>
    <label class="visually-hidden" for="auditoriaAccion">Acción</label>
    <input class="campo-input" id="auditoriaAccion" name="accion" type="text" placeholder="Acción" maxlength="60">
    <input class="campo-input" name="desde" type="date" aria-label="Desde">
    <input class="campo-input" name="hasta" type="date" aria-label="Hasta">
    <button class="boton boton-primario" type="submit">Filtrar</button>
    <button class="boton boton-secundario" type="reset">Limpiar</button>
</form>

<p class="formulario-estado" id="auditoriaEstado" role="status" aria-live="polite" hidden></p>

<div class="admin-card">
    <div class="admin-tabla-scroll">
        <table class="admin-tabla">
            <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
            <tbody id="auditoriaTabla"></tbody>
        </table>
    </div>
    <nav class="admin-paginacion" id="auditoriaPaginacion" aria-label="Paginación de auditoría"></nav>
</div>`,
    scripts: ['admin-auditoria.js']
};
