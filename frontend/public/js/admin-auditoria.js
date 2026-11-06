'use strict';

/* Auditoría: historial de acciones del panel con filtros por entidad,
   acción, texto y fecha. El detalle se muestra como JSON escapado. */

function filaAuditoria(registro) {
    const detalle = registro.detalle && Object.keys(registro.detalle).length
        ? `<details><summary>Ver</summary><pre>${escaparHTML(JSON.stringify(registro.detalle, null, 2))}</pre></details>`
        : '—';
    const identificador = registro.entidadId ? ' · ' + registro.entidadId : '';

    return `
        <tr>
            <td>${escaparHTML(adminFecha(registro.fecha))}</td>
            <td class="admin-celda-principal">
                <strong>${escaparHTML(registro.actor.nombre)}</strong>
                <small>${escaparHTML(registro.actor.email || '')}</small>
            </td>
            <td>${escaparHTML(registro.accion)}</td>
            <td>${escaparHTML(registro.entidad + identificador)}</td>
            <td>${detalle}</td>
        </tr>`;
}

function pintarAuditoria(datos) {
    const cuerpo = document.getElementById('auditoriaTabla');

    if (!cuerpo) return;

    if (!datos.registros.length) {
        cuerpo.innerHTML = '<tr><td colspan="5"><div class="admin-vacio">No hay registros con esos filtros.</div></td></tr>';
    } else {
        cuerpo.innerHTML = datos.registros.map(filaAuditoria).join('');
    }

    adminPaginar(document.getElementById('auditoriaPaginacion'), datos, irAPaginaAuditoria);
}

function rellenarEntidades(entidades) {
    const select = document.getElementById('auditoriaEntidad');

    if (!select) return;

    const valor = select.value;
    adminRellenarSelect(select, entidades, 'Todas las entidades');
    select.value = valor;
}

async function cargarAuditoria(pagina = 1) {
    const formulario = document.getElementById('auditoriaFiltros');
    const estado = document.getElementById('auditoriaEstado');
    const parametros = adminLeerFormulario(formulario);

    parametros.set('pagina', String(pagina));

    try {
        const datos = await adminPedir('/api/admin/auditoria?' + parametros.toString());
        pintarAuditoria(datos);
        rellenarEntidades(datos.entidades);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaAuditoria(pagina) {
    if (pagina < 1) return;
    cargarAuditoria(pagina);
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('auditoriaFiltros');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarAuditoria(1);
        });

        formulario.addEventListener('reset', () => {
            window.setTimeout(() => cargarAuditoria(1), 0);
        });
    }

    cargarAuditoria(1);
});
