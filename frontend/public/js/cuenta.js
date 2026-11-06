'use strict';

/* Área de cliente: perfil, historial de pedidos, detalle, cancelación
   mientras el pedido está pendiente y estado de las opiniones enviadas. */

let pedidosDelCliente = [];

function renderPerfil(usuario) {
    const nombre = document.getElementById('cuentaNombre');
    const nombrePerfil = document.getElementById('cuentaNombrePerfil');
    const email = document.getElementById('cuentaEmail');
    const telefono = document.getElementById('cuentaTelefono');
    const panelAdmin = document.getElementById('cuentaPanelAdmin');

    if (nombre) nombre.textContent = usuario.nombre;
    if (nombrePerfil) nombrePerfil.textContent = usuario.nombre;
    if (email) email.textContent = usuario.email;
    if (telefono) telefono.textContent = usuario.telefono || 'Sin teléfono registrado';
    if (panelAdmin) panelAdmin.hidden = usuario.role !== 'superadmin';
}

function htmlItemsPedido(pedido) {
    return pedido.items.map(item => `
        <li>
            <span>${escaparHTML(item.nombre)} × ${item.cantidad}</span>
            <strong>${formatearPrecio(item.precio * item.cantidad)}</strong>
        </li>`).join('');
}

function htmlPedido(pedido) {
    const puedeCancelar = pedido.estado === 'pendiente';
    const envio = pedido.envioPendiente
        ? 'Envío a coordinar'
        : pedido.total > pedido.subtotal ? 'Envío ' + formatearPrecio(pedido.total - pedido.subtotal) : 'Envío gratis';

    return `
        <article class="pedido-card" data-pedido-id="${escaparHTML(pedido.id)}">
            <header class="pedido-cabecera">
                <div>
                    <span class="etiqueta">${escaparHTML(pedido.codigo)}</span>
                    <h2>${formatearFecha(pedido.creado)}</h2>
                </div>
                <span class="estado ${claseEstado(pedido.estado)}">${escaparHTML(etiquetaEstado(pedido.estado))}</span>
            </header>

            <p class="pedido-meta">
                ${pedido.items.length} ${pedido.items.length === 1 ? 'producto' : 'productos'} ·
                <strong>${formatearPrecio(pedido.total)}</strong> · ${escaparHTML(envio)}
            </p>

            <div class="pedido-acciones">
                <button class="boton-texto" type="button" data-ver-pedido="${escaparHTML(pedido.id)}" aria-expanded="false">
                    <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                    Ver detalle
                </button>
                ${puedeCancelar ? `
                    <button class="boton-texto boton-peligro" type="button" data-cancelar-pedido="${escaparHTML(pedido.id)}">
                        <span class="material-symbols-outlined" aria-hidden="true">cancel</span>
                        Cancelar pedido
                    </button>` : ''}
            </div>

            <div class="pedido-detalle" id="detalle-${escaparHTML(pedido.id)}" hidden>
                <ul class="pedido-items">${htmlItemsPedido(pedido)}</ul>
                <dl class="pedido-datos">
                    <div><dt>Subtotal</dt><dd>${formatearPrecio(pedido.subtotal)}</dd></div>
                    <div><dt>Total</dt><dd>${formatearPrecio(pedido.total)}</dd></div>
                    <div><dt>Contacto</dt><dd>${escaparHTML(pedido.contacto.nombre)} · ${escaparHTML(pedido.contacto.telefono)}</dd></div>
                    ${pedido.zona ? `<div><dt>Zona</dt><dd>${escaparHTML(pedido.zona)}</dd></div>` : ''}
                    ${pedido.notas ? `<div><dt>Notas</dt><dd>${escaparHTML(pedido.notas)}</dd></div>` : ''}
                    ${pedido.motivoCancelacion ? `<div><dt>Motivo de cancelación</dt><dd>${escaparHTML(pedido.motivoCancelacion)}</dd></div>` : ''}
                </dl>
            </div>
        </article>`;
}

function renderPedidos() {
    const contenedor = document.getElementById('cuentaPedidos');
    const vacio = document.getElementById('cuentaPedidosVacio');

    if (!contenedor || !vacio) return;

    contenedor.innerHTML = pedidosDelCliente.map(htmlPedido).join('');
    vacio.hidden = pedidosDelCliente.length > 0;
    contenedor.hidden = pedidosDelCliente.length === 0;
}

function htmlTestimonio(testimonio) {
    const motivo = testimonio.estado === 'rechazado' && testimonio.motivoRechazo
        ? `<p class="testimonio-motivo">Motivo: ${escaparHTML(testimonio.motivoRechazo)}</p>`
        : '';

    return `
        <article class="testimonio-propio">
            <header>
                <span class="estado ${claseEstado(testimonio.estado)}">${escaparHTML(etiquetaEstado(testimonio.estado))}</span>
                <span class="testimonio-estrellas" aria-label="${testimonio.estrellas} de 5 estrellas">${'★'.repeat(testimonio.estrellas)}${'☆'.repeat(5 - testimonio.estrellas)}</span>
            </header>
            <p>${escaparHTML(testimonio.texto)}</p>
            ${motivo}
            <small>${formatearFechaCorta(testimonio.fecha)}</small>
        </article>`;
}

function renderTestimoniosPropios(testimonios) {
    const contenedor = document.getElementById('cuentaTestimonios');
    const vacio = document.getElementById('cuentaTestimoniosVacio');

    if (!contenedor || !vacio) return;

    contenedor.innerHTML = testimonios.map(htmlTestimonio).join('');
    vacio.hidden = testimonios.length > 0;
}

async function cargarPedidos() {
    const estado = document.getElementById('cuentaEstado');

    try {
        const datos = await API.get('/api/pedidos');
        pedidosDelCliente = Array.isArray(datos.pedidos) ? datos.pedidos : [];
        renderPedidos();
    } catch (error) {
        if (error.estado === 401) {
            volverALogin('cuenta.html');
            return;
        }

        mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
    }
}

async function cargarTestimonios() {
    try {
        const datos = await API.get('/api/testimonios/mios');
        renderTestimoniosPropios(Array.isArray(datos.testimonios) ? datos.testimonios : []);
    } catch (error) {
        if (error.estado === 401) return;

        renderTestimoniosPropios([]);
    }
}

function alternarDetalle(id, boton) {
    const detalle = document.getElementById('detalle-' + id);

    if (!detalle) return;

    const abierto = !detalle.hidden;

    detalle.hidden = abierto;
    boton.setAttribute('aria-expanded', String(!abierto));
}

async function cancelarPedido(id) {
    const pedido = pedidosDelCliente.find(item => item.id === id);

    if (!pedido) return;
    if (!window.confirm('¿Querés cancelar el pedido ' + pedido.codigo + '? El stock vuelve al vivero.')) return;

    const estado = document.getElementById('cuentaEstado');

    try {
        const datos = await API.patch('/api/pedidos/' + encodeURIComponent(id) + '/cancelar', {
            motivo: 'Cancelado por el cliente'
        });

        pedidosDelCliente = pedidosDelCliente.map(item => item.id === id ? datos.pedido : item);
        renderPedidos();
        mostrarEstadoFormulario(estado, 'Pedido ' + pedido.codigo + ' cancelado.', 'ok');
    } catch (error) {
        if (error.estado === 401) {
            volverALogin('cuenta.html');
            return;
        }

        mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
    }
}

document.addEventListener('click', evento => {
    const ver = evento.target.closest('[data-ver-pedido]');

    if (ver) {
        alternarDetalle(ver.dataset.verPedido, ver);
        return;
    }

    const cancelar = evento.target.closest('[data-cancelar-pedido]');

    if (cancelar) cancelarPedido(cancelar.dataset.cancelarPedido);
});

cuandoSesionLista(usuario => {
    if (!usuario) {
        volverALogin('cuenta.html');
        return;
    }

    renderPerfil(usuario);
    cargarPedidos();
    cargarTestimonios();
});
