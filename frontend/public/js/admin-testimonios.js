'use strict';

/* Testimonios: moderación de las opiniones enviadas por los clientes.
   Aprobar o rechazar es un cambio de estado; editar permite corregir el
   texto antes de publicarlo. */

let testimoniosPagina = 1;
let testimonioActual = null;

function filaTestimonio(testimonio) {
    const autor = testimonio.usuario
        ? testimonio.usuario.nombre + ' · ' + testimonio.usuario.email
        : testimonio.autor;

    return `
        <tr>
            <td>${escaparHTML(adminFechaCorta(testimonio.fecha))}</td>
            <td class="admin-celda-principal">
                <strong>${escaparHTML(testimonio.autor)}</strong>
                <small>${escaparHTML(testimonio.lugar || autor)}</small>
            </td>
            <td>${escaparHTML(testimonio.texto)}</td>
            <td class="numero">${testimonio.estrellas} / 5</td>
            <td>${adminHtmlEstado(testimonio.estado)}</td>
            <td>
                <div class="admin-acciones">
                    <button class="boton-texto" type="button" data-editar-testimonio="${escaparHTML(testimonio.id)}">Editar</button>
                    ${testimonio.estado !== 'aprobado' ? `<button class="boton-texto" type="button" data-aprobar-testimonio="${escaparHTML(testimonio.id)}">Aprobar</button>` : ''}
                    ${testimonio.estado !== 'rechazado' ? `<button class="boton-texto" type="button" data-rechazar-testimonio="${escaparHTML(testimonio.id)}">Rechazar</button>` : ''}
                </div>
            </td>
        </tr>`;
}

function pintarTestimonios(datos) {
    const cuerpo = document.getElementById('testimoniosTabla');

    if (!cuerpo) return;

    if (!datos.testimonios.length) {
        cuerpo.innerHTML = '<tr><td colspan="6"><div class="admin-vacio">No hay opiniones con esos filtros.</div></td></tr>';
    } else {
        cuerpo.innerHTML = datos.testimonios.map(filaTestimonio).join('');
    }

    adminPaginar(document.getElementById('testimoniosPaginacion'), datos, irAPaginaTestimonios);
}

async function cargarTestimonios(pagina = 1) {
    const formulario = document.getElementById('testimoniosFiltros');
    const estado = document.getElementById('testimoniosEstado');
    const parametros = adminLeerFormulario(formulario);

    testimoniosPagina = pagina;
    parametros.set('pagina', String(pagina));

    try {
        const datos = await adminPedir('/api/admin/testimonios?' + parametros.toString());
        pintarTestimonios(datos);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaTestimonios(pagina) {
    if (pagina < 1) return;
    cargarTestimonios(pagina);
}

function abrirTestimonio(testimonio, estadoInicial) {
    testimonioActual = testimonio;

    const campos = {
        testimonioAutor: testimonio.autor,
        testimonioLugar: testimonio.lugar || '',
        testimonioTexto: testimonio.texto,
        testimonioEstrellas: String(testimonio.estrellas),
        testimonioEstado: estadoInicial || testimonio.estado,
        testimonioMotivo: testimonio.motivoRechazo || ''
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor;
    });

    adminEstado(document.getElementById('testimonioFormEstado'), '', '');
    adminAbrirDialogo('testimonioDialogo');
}

async function moderarTestimonio(id, estado) {
    const listaEstado = document.getElementById('testimoniosEstado');

    try {
        await adminPedir('/api/admin/testimonios/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: { estado }
        });

        await cargarTestimonios(testimoniosPagina);
        adminEstado(listaEstado, 'Testimonio ' + (estado === 'aprobado' ? 'aprobado' : 'rechazado') + '.', 'ok');
    } catch (error) {
        adminEstado(listaEstado, mensajeDeError(error), 'error');
    }
}

async function guardarTestimonio(evento) {
    evento.preventDefault();

    if (!testimonioActual) return;

    const estado = document.getElementById('testimonioFormEstado');
    const boton = document.querySelector('#testimonioForm button[type="submit"]');
    const cuerpo = {
        autor: document.getElementById('testimonioAutor').value.trim(),
        lugar: document.getElementById('testimonioLugar').value.trim(),
        texto: document.getElementById('testimonioTexto').value.trim(),
        estrellas: Number(document.getElementById('testimonioEstrellas').value),
        estado: document.getElementById('testimonioEstado').value,
        motivoRechazo: document.getElementById('testimonioMotivo').value.trim()
    };

    if (cuerpo.estado === 'rechazado' && !cuerpo.motivoRechazo) {
        adminEstado(estado, 'Indicá el motivo del rechazo.', 'error');
        return;
    }

    adminBloquearBoton(boton, true, 'Guardando…');
    adminEstado(estado, '', '');

    try {
        await adminPedir('/api/admin/testimonios/' + encodeURIComponent(testimonioActual.id), {
            method: 'PATCH',
            body: cuerpo
        });

        adminCerrarDialogo(document.getElementById('testimonioDialogo'));
        await cargarTestimonios(testimoniosPagina);
        adminEstado(document.getElementById('testimoniosEstado'), 'Testimonio actualizado.', 'ok');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Guardar cambios');
    }
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('testimoniosFiltros');
    const formularioDialogo = document.getElementById('testimonioForm');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarTestimonios(1);
        });

        formulario.addEventListener('reset', () => {
            window.setTimeout(() => cargarTestimonios(1), 0);
        });
    }

    if (formularioDialogo) formularioDialogo.addEventListener('submit', guardarTestimonio);

    document.addEventListener('click', evento => {
        const editar = evento.target.closest('[data-editar-testimonio]');
        const aprobar = evento.target.closest('[data-aprobar-testimonio]');
        const rechazar = evento.target.closest('[data-rechazar-testimonio]');

        if (editar) {
            const fila = editar.closest('tr');
            const id = editar.dataset.editarTestimonio;
            abrirTestimonio(testimonioDeFila(id, fila), null);
        }

        if (aprobar) moderarTestimonio(aprobar.dataset.aprobarTestimonio, 'aprobado');

        if (rechazar) {
            const fila = rechazar.closest('tr');
            const id = rechazar.dataset.rechazarTestimonio;
            abrirTestimonio(testimonioDeFila(id, fila), 'rechazado');
        }
    });

    cargarTestimonios(1);
});

/* La tabla no guarda los objetos completos. Para moderar sin otra petición
   reconstruimos lo mínimo desde la fila; el texto y el autor visibles son
   los mismos que devolvió la API. */
function testimonioDeFila(id, fila) {
    const celdas = fila ? fila.querySelectorAll('td') : [];
    const autor = celdas[1] ? celdas[1].querySelector('strong') : null;
    const lugar = celdas[1] ? celdas[1].querySelector('small') : null;
    const texto = celdas[2] ? celdas[2].textContent : '';
    const estrellas = celdas[3] ? parseInt(celdas[3].textContent, 10) : 5;
    const estado = celdas[4] ? celdas[4].textContent.trim().toLowerCase() : 'pendiente';

    return {
        id,
        autor: autor ? autor.textContent : '',
        lugar: lugar ? lugar.textContent : '',
        texto,
        estrellas: Number.isFinite(estrellas) ? estrellas : 5,
        estado: ETIQUETAS_ESTADO[estado] ? estado : 'pendiente',
        motivoRechazo: ''
    };
}
