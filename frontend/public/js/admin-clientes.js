'use strict';

/* Clientes: listado con historial de compras, ficha con pedidos y bloqueo o
   desbloqueo de la cuenta. */

let clientesPagina = 1;
let clienteActual = null;

function filaCliente(cliente) {
    const estado = cliente.activo
        ? '<span class="admin-etiqueta-estado estado-activo">Activa</span>'
        : '<span class="admin-etiqueta-estado estado-bloqueado">Bloqueada</span>';

    return `
        <tr>
            <td class="admin-celda-principal">
                <strong>${escaparHTML(cliente.nombre)}</strong>
                <small>Desde ${escaparHTML(adminFechaCorta(cliente.creado))}</small>
            </td>
            <td>${escaparHTML(cliente.email)}</td>
            <td>${escaparHTML(cliente.telefono || '—')}</td>
            <td class="numero">${cliente.pedidos}</td>
            <td class="numero">${formatearPrecio(cliente.totalGastado)}</td>
            <td>${estado}</td>
            <td><button class="boton-texto" type="button" data-ver-cliente="${escaparHTML(cliente.id)}">Ver ficha</button></td>
        </tr>`;
}

function pintarClientes(datos) {
    const cuerpo = document.getElementById('clientesTabla');

    if (!cuerpo) return;

    if (!datos.clientes.length) {
        cuerpo.innerHTML = '<tr><td colspan="7"><div class="admin-vacio">No hay clientes con esos filtros.</div></td></tr>';
    } else {
        cuerpo.innerHTML = datos.clientes.map(filaCliente).join('');
    }

    adminPaginar(document.getElementById('clientesPaginacion'), datos, irAPaginaClientes);
}

async function cargarClientes(pagina = 1) {
    const formulario = document.getElementById('clientesFiltros');
    const estado = document.getElementById('clientesEstado');
    const parametros = adminLeerFormulario(formulario);

    clientesPagina = pagina;
    parametros.set('pagina', String(pagina));

    try {
        const datos = await adminPedir('/api/admin/clientes?' + parametros.toString());
        pintarClientes(datos);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaClientes(pagina) {
    if (pagina < 1) return;
    cargarClientes(pagina);
}

function htmlFichaCliente(cliente) {
    const estado = cliente.activo
        ? '<span class="admin-etiqueta-estado estado-activo">Cuenta activa</span>'
        : '<span class="admin-etiqueta-estado estado-bloqueado">Cuenta bloqueada</span>';

    return `
        <div class="admin-detalle">
            <div><dt>Nombre</dt><dd>${escaparHTML(cliente.nombre)}</dd></div>
            <div><dt>Correo</dt><dd>${escaparHTML(cliente.email)}</dd></div>
            <div><dt>Teléfono</dt><dd>${escaparHTML(cliente.telefono || '—')}</dd></div>
            <div><dt>Alta</dt><dd>${escaparHTML(adminFecha(cliente.creado))}</dd></div>
            <div><dt>Estado</dt><dd>${estado}</dd></div>
        </div>`;
}

function filaPedidoCliente(orden) {
    return `
        <tr>
            <td>${escaparHTML(orden.codigo)}</td>
            <td>${escaparHTML(adminFechaCorta(orden.creado))}</td>
            <td>${escaparHTML(orden.canal === 'online' ? 'Online' : 'Presencial')}</td>
            <td>${adminHtmlEstado(orden.estado)}</td>
            <td class="numero">${formatearPrecio(orden.total)}</td>
        </tr>`;
}

async function abrirCliente(id) {
    const estado = document.getElementById('clienteDialogoEstado');
    const detalle = document.getElementById('clienteDetalle');
    const pedidos = document.getElementById('clientePedidos');
    const titulo = document.getElementById('clienteDialogoTitulo');
    const boton = document.getElementById('clienteBloquear');

    try {
        const datos = await adminPedir('/api/admin/clientes/' + encodeURIComponent(id));
        const cliente = datos.cliente;

        clienteActual = cliente;

        if (titulo) titulo.textContent = cliente.nombre;
        if (detalle) detalle.innerHTML = htmlFichaCliente(cliente);

        if (pedidos) {
            pedidos.innerHTML = datos.ordenes.length
                ? datos.ordenes.map(filaPedidoCliente).join('')
                : '<tr><td colspan="5"><div class="admin-vacio">Todavía no hizo pedidos.</div></td></tr>';
        }

        if (boton) {
            boton.textContent = cliente.activo ? 'Bloquear cuenta' : 'Desbloquear cuenta';
            boton.classList.toggle('boton-peligro', cliente.activo);
            boton.classList.toggle('boton-primario', !cliente.activo);
            boton.classList.toggle('boton-secundario', cliente.activo);
        }

        adminEstado(estado, '', '');
        adminAbrirDialogo('clienteDialogo');
    } catch (error) {
        adminEstado(document.getElementById('clientesEstado'), mensajeDeError(error), 'error');
    }
}

async function cambiarBloqueo() {
    if (!clienteActual) return;

    const estado = document.getElementById('clienteDialogoEstado');
    const boton = document.getElementById('clienteBloquear');
    const activo = !clienteActual.activo;
    const confirmado = window.confirm(
        activo
            ? '¿Desbloquear la cuenta de ' + clienteActual.nombre + '?'
            : '¿Bloquear la cuenta de ' + clienteActual.nombre + '? No podrá iniciar sesión.'
    );

    if (!confirmado) return;

    adminBloquearBoton(boton, true, 'Guardando…');
    adminEstado(estado, '', '');

    try {
        const datos = await adminPedir('/api/admin/clientes/' + encodeURIComponent(clienteActual.id), {
            method: 'PATCH',
            body: { activo }
        });

        clienteActual = datos.cliente;

        if (boton) {
            boton.textContent = clienteActual.activo ? 'Bloquear cuenta' : 'Desbloquear cuenta';
            boton.classList.toggle('boton-peligro', clienteActual.activo);
            boton.classList.toggle('boton-primario', !clienteActual.activo);
            boton.classList.toggle('boton-secundario', clienteActual.activo);
        }

        const detalle = document.getElementById('clienteDetalle');
        if (detalle) detalle.innerHTML = htmlFichaCliente(clienteActual);

        adminEstado(estado, 'Cuenta ' + (clienteActual.activo ? 'desbloqueada' : 'bloqueada') + '.', 'ok');
        await cargarClientes(clientesPagina);
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, clienteActual.activo ? 'Bloquear cuenta' : 'Desbloquear cuenta');
    }
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('clientesFiltros');
    const boton = document.getElementById('clienteBloquear');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarClientes(1);
        });

        formulario.addEventListener('reset', () => {
            window.setTimeout(() => cargarClientes(1), 0);
        });
    }

    if (boton) boton.addEventListener('click', cambiarBloqueo);

    document.addEventListener('click', evento => {
        const ver = evento.target.closest('[data-ver-cliente]');

        if (ver) abrirCliente(ver.dataset.verCliente);
    });

    cargarClientes(1);
});
