'use strict';

/* Pedidos online: listado con filtros, detalle completo, cambio de estado,
   notas internas y cancelación con reposición de stock. */

let pedidosPagina = 1;
let pedidoActual = null;

function filaPedido(orden) {
    const cliente = orden.cliente ? orden.cliente.nombre : orden.contacto.nombre;

    return `
        <tr>
            <td><strong>${escaparHTML(orden.codigo)}</strong></td>
            <td>${escaparHTML(adminFechaCorta(orden.creado))}</td>
            <td class="admin-celda-principal">
                <strong>${escaparHTML(cliente)}</strong>
                <small>${escaparHTML(orden.contacto.telefono || orden.contacto.email || 'Sin contacto')}</small>
            </td>
            <td>${escaparHTML(orden.canal === 'online' ? 'Online' : 'Presencial')}</td>
            <td>${adminHtmlEstado(orden.estado)}</td>
            <td class="numero">${formatearPrecio(orden.total)}</td>
            <td><button class="boton-texto" type="button" data-ver-pedido="${escaparHTML(orden.id)}">Ver</button></td>
        </tr>`;
}

function pintarPedidos(datos) {
    const cuerpo = document.getElementById('ordenesTabla');

    if (!cuerpo) return;

    if (!datos.ordenes.length) {
        cuerpo.innerHTML = '<tr><td colspan="7"><div class="admin-vacio">No hay pedidos con esos filtros.</div></td></tr>';
    } else {
        cuerpo.innerHTML = datos.ordenes.map(filaPedido).join('');
    }

    adminPaginar(document.getElementById('ordenesPaginacion'), datos, irAPaginaPedidos);
}

async function cargarPedidos(pagina = 1) {
    const formulario = document.getElementById('ordenesFiltros');
    const estado = document.getElementById('ordenesEstadoLista');
    const parametros = adminLeerFormulario(formulario);

    pedidosPagina = pagina;
    parametros.set('pagina', String(pagina));

    try {
        const datos = await adminPedir('/api/admin/ordenes?' + parametros.toString());
        pintarPedidos(datos);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaPedidos(pagina) {
    if (pagina < 1) return;
    cargarPedidos(pagina);
}

function htmlDetallePedido(orden) {
    const items = orden.items.map(item => `
        <tr>
            <td>${escaparHTML(item.nombre)}</td>
            <td class="numero">${item.cantidad}</td>
            <td class="numero">${formatearPrecio(item.precio)}</td>
            <td class="numero">${formatearPrecio(item.precio * item.cantidad)}</td>
        </tr>`).join('');

    return `
        <div class="admin-detalle">
            <div><dt>Fecha</dt><dd>${escaparHTML(adminFecha(orden.creado))}</dd></div>
            <div><dt>Canal</dt><dd>${escaparHTML(orden.canal === 'online' ? 'Online' : 'Presencial')}</dd></div>
            <div><dt>Método de pago</dt><dd>${escaparHTML(etiquetaMetodoPago(orden.metodoPago))}</dd></div>
            <div><dt>Cliente</dt><dd>${escaparHTML(orden.contacto.nombre)}</dd></div>
            <div><dt>Teléfono</dt><dd>${escaparHTML(orden.contacto.telefono || '—')}</dd></div>
            <div><dt>Correo</dt><dd>${escaparHTML(orden.contacto.email || '—')}</dd></div>
            ${orden.zona ? `<div><dt>Zona</dt><dd>${escaparHTML(orden.zona)}</dd></div>` : ''}
            ${orden.notas ? `<div><dt>Notas del cliente</dt><dd>${escaparHTML(orden.notas)}</dd></div>` : ''}
            ${orden.motivoCancelacion ? `<div><dt>Motivo de cancelación</dt><dd>${escaparHTML(orden.motivoCancelacion)}</dd></div>` : ''}
        </div>
        <div class="admin-tabla-scroll">
            <table class="admin-tabla">
                <thead><tr><th>Producto</th><th class="numero">Cant.</th><th class="numero">Precio</th><th class="numero">Subtotal</th></tr></thead>
                <tbody>${items}</tbody>
            </table>
        </div>
        <div class="admin-detalle">
            <div class="admin-detalle-total"><span>Subtotal</span><span>${formatearPrecio(orden.subtotal)}</span></div>
            ${orden.descuento ? `<div class="admin-detalle-total"><span>Descuento</span><span>-${formatearPrecio(orden.descuento)}</span></div>` : ''}
            <div class="admin-detalle-total"><span>Total</span><span>${formatearPrecio(orden.total)}</span></div>
            <div><dt>Margen</dt><dd>${formatearPrecio(orden.margen)}</dd></div>
            ${orden.envioPendiente ? '<div><dt>Envío</dt><dd>A coordinar</dd></div>' : ''}
        </div>`;
}

async function abrirPedido(id) {
    const estado = document.getElementById('ordenFormEstado');

    try {
        const datos = await adminPedir('/api/admin/ordenes/' + encodeURIComponent(id));
        const orden = datos.orden;

        pedidoActual = orden;

        const codigo = document.getElementById('ordenDialogoCodigo');
        const detalle = document.getElementById('ordenDetalle');
        const select = document.getElementById('ordenEstado');
        const notas = document.getElementById('ordenNotasInternas');
        const motivo = document.getElementById('ordenMotivo');

        if (codigo) codigo.textContent = orden.codigo;
        if (detalle) detalle.innerHTML = htmlDetallePedido(orden);
        if (select) select.value = orden.estado;
        if (notas) notas.value = orden.notasInternas || '';
        if (motivo) motivo.value = '';

        adminEstado(estado, '', '');
        adminAbrirDialogo('ordenDialogo');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

async function guardarPedido(evento) {
    evento.preventDefault();

    if (!pedidoActual) return;

    const estado = document.getElementById('ordenFormEstado');
    const boton = document.querySelector('#ordenForm button[type="submit"]');
    const valorEstado = document.getElementById('ordenEstado').value;
    const notas = document.getElementById('ordenNotasInternas').value.trim();
    const motivo = document.getElementById('ordenMotivo').value.trim();
    const cuerpo = {
        estado: valorEstado,
        notasInternas: notas
    };

    if (valorEstado === 'cancelado') {
        cuerpo.motivoCancelacion = motivo || 'Cancelada desde el panel';
    }

    adminBloquearBoton(boton, true, 'Guardando…');
    adminEstado(estado, '', '');

    try {
        await adminPedir('/api/admin/ordenes/' + encodeURIComponent(pedidoActual.id), {
            method: 'PATCH',
            body: cuerpo
        });

        adminCerrarDialogo(document.getElementById('ordenDialogo'));
        await cargarPedidos(pedidosPagina);
        adminEstado(document.getElementById('ordenesEstadoLista'), 'Pedido actualizado.', 'ok');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Guardar cambios');
    }
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('ordenesFiltros');
    const parametros = new URLSearchParams(window.location.search);
    const busqueda = document.getElementById('ordenesBuscar');

    if (busqueda && parametros.get('q')) busqueda.value = parametros.get('q');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarPedidos(1);
        });

        formulario.addEventListener('reset', () => {
            window.setTimeout(() => cargarPedidos(1), 0);
        });
    }

    const dialogoFormulario = document.getElementById('ordenForm');

    if (dialogoFormulario) dialogoFormulario.addEventListener('submit', guardarPedido);

    document.addEventListener('click', evento => {
        const ver = evento.target.closest('[data-ver-pedido]');

        if (ver) abrirPedido(ver.dataset.verPedido);
    });

    cargarPedidos(1);
});
