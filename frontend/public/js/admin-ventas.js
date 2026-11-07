'use strict';

/* Ventas presenciales: búsqueda de productos, ticket, descuento, cobro,
   listado del día, anulación con motivo y cierre de caja por método. */

let ticketPOS = [];
let resultadosPOS = [];
let ventaPagina = 1;
let ventaAnularId = null;

function fechaVenta() {
    const input = document.getElementById('ventasFecha');
    return input && input.value ? input.value : adminFechaISO();
}

function htmlResultadoPOS(producto) {
    const sinStock = producto.stock <= 0;

    return `
        <div class="admin-resultado">
            <div class="admin-resultado-info">
                <strong>${escaparHTML(producto.nombre)}</strong>
                <small>${escaparHTML(producto.categoria)} · ${formatearPrecio(producto.precio)} · stock ${producto.stock}</small>
            </div>
            <button class="boton boton-secundario" type="button" data-agregar-pos="${producto.productoId}"${sinStock ? ' disabled' : ''}>
                ${sinStock ? 'Sin stock' : 'Agregar'}
            </button>
        </div>`;
}

function pintarResultadosPOS() {
    const contenedor = document.getElementById('posResultados');

    if (!contenedor) return;

    if (!resultadosPOS.length) {
        contenedor.innerHTML = '<p class="admin-vacio">No encontramos productos activos.</p>';
        return;
    }

    contenedor.innerHTML = resultadosPOS.map(htmlResultadoPOS).join('');
}

async function buscarProductosPOS() {
    const entrada = document.getElementById('posBuscar');
    const estado = document.getElementById('posEstado');
    const parametros = new URLSearchParams({ activo: '1', limite: '20' });

    if (entrada && entrada.value.trim()) parametros.set('q', entrada.value.trim());

    try {
        const datos = await adminPedir('/api/admin/productos?' + parametros.toString());
        resultadosPOS = datos.productos;
        pintarResultadosPOS();
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function productoPOS(productoId) {
    return resultadosPOS.find(producto => producto.productoId === Number(productoId)) || null;
}

function agregarAlTicket(productoId) {
    const producto = productoPOS(productoId);

    if (!producto) return;

    const existente = ticketPOS.find(linea => linea.productoId === producto.productoId);

    if (existente) {
        if (existente.cantidad >= producto.stock) {
            adminEstado(document.getElementById('posEstado'), 'No hay más stock de ' + producto.nombre + '.', 'error');
            return;
        }

        existente.cantidad += 1;
    } else {
        ticketPOS.push({
            productoId: producto.productoId,
            nombre: producto.nombre,
            precio: producto.precio,
            stock: producto.stock,
            cantidad: 1
        });
    }

    adminEstado(document.getElementById('posEstado'), '', '');
    pintarTicket();
}

function cambiarCantidadTicket(productoId, delta) {
    const linea = ticketPOS.find(item => item.productoId === productoId);

    if (!linea) return;

    linea.cantidad += delta;

    if (linea.cantidad <= 0) {
        ticketPOS = ticketPOS.filter(item => item.productoId !== productoId);
    } else if (linea.cantidad > linea.stock) {
        linea.cantidad = linea.stock;
        adminEstado(document.getElementById('posEstado'), 'No hay más stock de ' + linea.nombre + '.', 'error');
    }

    pintarTicket();
}

function quitarDelTicket(productoId) {
    ticketPOS = ticketPOS.filter(item => item.productoId !== productoId);
    pintarTicket();
}

function calcularTicket() {
    const subtotal = ticketPOS.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
    const entrada = document.getElementById('posDescuento');
    const descuento = Math.min(subtotal, Math.max(0, Number(entrada ? entrada.value : 0) || 0));

    return { subtotal, descuento, total: subtotal - descuento };
}

function pintarTotalesTicket() {
    const totales = calcularTicket();
    const subtotal = document.getElementById('posSubtotal');
    const total = document.getElementById('posTotal');

    if (subtotal) subtotal.textContent = formatearPrecio(totales.subtotal);
    if (total) total.textContent = formatearPrecio(totales.total);
}

function pintarTicket() {
    const contenedor = document.getElementById('posTicket');

    if (!contenedor) return;

    if (!ticketPOS.length) {
        contenedor.innerHTML = '<p class="admin-vacio">Agregá productos desde la búsqueda.</p>';
        pintarTotalesTicket();
        return;
    }

    contenedor.innerHTML = ticketPOS.map(linea => `
        <div class="admin-ticket-linea">
            <div class="admin-ticket-info">
                <strong>${escaparHTML(linea.nombre)}</strong>
                <small>${formatearPrecio(linea.precio)} × ${linea.cantidad} = ${formatearPrecio(linea.precio * linea.cantidad)}</small>
            </div>
            <div class="admin-ticket-cantidad">
                <button class="admin-cantidad-boton" type="button" data-ticket-menos="${linea.productoId}" aria-label="Quitar una unidad de ${escaparHTML(linea.nombre)}">−</button>
                <span>${linea.cantidad}</span>
                <button class="admin-cantidad-boton" type="button" data-ticket-mas="${linea.productoId}" aria-label="Agregar una unidad de ${escaparHTML(linea.nombre)}"${linea.cantidad >= linea.stock ? ' disabled' : ''}>+</button>
                <button class="admin-cantidad-boton" type="button" data-ticket-quitar="${linea.productoId}" aria-label="Quitar ${escaparHTML(linea.nombre)} del ticket">×</button>
            </div>
        </div>`).join('');

    pintarTotalesTicket();
}

function vaciarTicket() {
    ticketPOS = [];
    pintarTicket();
}

function htmlCierre(datos) {
    const filas = datos.metodos.map(metodo => `
        <tr>
            <td>${escaparHTML(etiquetaMetodoPago(metodo.metodo))}</td>
            <td class="numero">${metodo.ventas}</td>
            <td class="numero">${formatearPrecio(metodo.total)}</td>
            <td class="numero">${metodo.ventasAnuladas ? formatearPrecio(metodo.anulado) + ' (' + metodo.ventasAnuladas + ')' : '—'}</td>
        </tr>`).join('');

    return filas + `
        <tr>
            <td><strong>Total</strong></td>
            <td></td>
            <td class="numero"><strong>${formatearPrecio(datos.total)}</strong></td>
            <td></td>
        </tr>`;
}

async function cargarCierre() {
    const cuerpo = document.getElementById('ventasCierre');

    if (!cuerpo) return;

    try {
        const datos = await adminPedir('/api/admin/ventas/cierre?fecha=' + encodeURIComponent(fechaVenta()));
        cuerpo.innerHTML = htmlCierre(datos);
    } catch (error) {
        cuerpo.innerHTML = '<tr><td colspan="4">' + escaparHTML(mensajeDeError(error)) + '</td></tr>';
    }
}

function filaVenta(orden) {
    const anulada = orden.estado === 'cancelado';

    return `
        <div class="admin-ticket-linea">
            <div class="admin-ticket-info">
                <strong>${escaparHTML(orden.codigo)}</strong>
                <small>${escaparHTML(adminFecha(orden.creado))} · ${escaparHTML(etiquetaMetodoPago(orden.metodoPago))} · ${escaparHTML(orden.contacto.nombre)}</small>
            </div>
            <div class="admin-ticket-cantidad">
                <strong>${formatearPrecio(orden.total)}</strong>
                ${adminHtmlEstado(orden.estado)}
                ${anulada ? '' : `<button class="boton-texto" type="button" data-anular-venta="${escaparHTML(orden.id)}">Anular</button>`}
            </div>
        </div>`;
}

async function cargarVentas(pagina = 1) {
    const contenedor = document.getElementById('ventasLista');
    const estado = document.getElementById('ventasEstado');
    const parametros = new URLSearchParams({
        fecha: fechaVenta(),
        pagina: String(pagina)
    });

    ventaPagina = pagina;

    try {
        const datos = await adminPedir('/api/admin/ventas?' + parametros.toString());

        if (contenedor) {
            contenedor.innerHTML = datos.ordenes.length
                ? datos.ordenes.map(filaVenta).join('')
                : '<p class="admin-vacio">No hay ventas registradas para ese día.</p>';
        }

        adminPaginar(document.getElementById('ventasPaginacion'), datos, irAPaginaVentas);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaVentas(pagina) {
    if (pagina < 1) return;
    cargarVentas(pagina);
}

async function registrarVenta(evento) {
    evento.preventDefault();

    const estado = document.getElementById('posEstado');
    const boton = document.querySelector('#posForm button[type="submit"]');
    const metodoPago = document.getElementById('posMetodoPago').value;
    const nombre = document.getElementById('posNombre').value.trim();
    const telefono = document.getElementById('posTelefono').value.trim();
    const totales = calcularTicket();

    if (!ticketPOS.length) {
        adminEstado(estado, 'Agregá al menos un producto al ticket.', 'error');
        return;
    }

    adminBloquearBoton(boton, true, 'Registrando…');
    adminEstado(estado, '', '');

    try {
        const datos = await adminPedir('/api/admin/ventas', {
            method: 'POST',
            body: {
                items: ticketPOS.map(linea => ({ productoId: linea.productoId, cantidad: linea.cantidad })),
                metodoPago,
                descuento: totales.descuento,
                nombre: nombre || undefined,
                telefono: telefono || undefined
            }
        });

        vaciarTicket();

        const descuento = document.getElementById('posDescuento');
        if (descuento) descuento.value = '0';

        const nombreInput = document.getElementById('posNombre');
        const telefonoInput = document.getElementById('posTelefono');
        if (nombreInput) nombreInput.value = '';
        if (telefonoInput) telefonoInput.value = '';

        adminEstado(estado, 'Venta ' + datos.venta.codigo + ' registrada por ' + formatearPrecio(datos.venta.total) + '.', 'ok');

        await Promise.all([cargarVentas(1), cargarCierre(), buscarProductosPOS()]);
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Registrar venta');
    }
}

function abrirAnulacion(id) {
    ventaAnularId = id;

    const motivo = document.getElementById('anularMotivo');
    if (motivo) motivo.value = '';

    adminEstado(document.getElementById('anularEstado'), '', '');
    adminAbrirDialogo('anularDialogo');
}

async function anularVenta(evento) {
    evento.preventDefault();

    if (!ventaAnularId) return;

    const estado = document.getElementById('anularEstado');
    const motivo = document.getElementById('anularMotivo').value.trim();
    const boton = document.querySelector('#anularForm button[type="submit"]');

    if (motivo.length < 3) {
        adminEstado(estado, 'Indicá un motivo de al menos 3 caracteres.', 'error');
        return;
    }

    adminBloquearBoton(boton, true, 'Anulando…');
    adminEstado(estado, '', '');

    try {
        await adminPedir('/api/admin/ventas/' + encodeURIComponent(ventaAnularId) + '/anular', {
            method: 'PATCH',
            body: { motivo }
        });

        adminCerrarDialogo(document.getElementById('anularDialogo'));
        adminEstado(document.getElementById('ventasEstado'), 'Venta anulada y stock repuesto.', 'ok');

        await Promise.all([cargarVentas(ventaPagina), cargarCierre(), buscarProductosPOS()]);
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Anular y devolver stock');
    }
}

function cargarDiaVentas() {
    cargarVentas(1);
    cargarCierre();
    buscarProductosPOS();
}

cuandoAdminListo(() => {
    const fecha = document.getElementById('ventasFecha');
    const formularioBusqueda = document.getElementById('posBuscarForm');
    const formularioVenta = document.getElementById('posForm');
    const formularioAnular = document.getElementById('anularForm');
    const actualizar = document.getElementById('ventasActualizar');
    const vaciar = document.getElementById('posVaciar');
    const descuento = document.getElementById('posDescuento');

    if (fecha) fecha.value = adminFechaISO();

    if (formularioBusqueda) {
        formularioBusqueda.addEventListener('submit', evento => {
            evento.preventDefault();
            buscarProductosPOS();
        });
    }

    if (formularioVenta) formularioVenta.addEventListener('submit', registrarVenta);
    if (formularioAnular) formularioAnular.addEventListener('submit', anularVenta);
    if (actualizar) actualizar.addEventListener('click', cargarDiaVentas);
    if (vaciar) vaciar.addEventListener('click', vaciarTicket);
    if (descuento) descuento.addEventListener('input', pintarTotalesTicket);

    document.addEventListener('click', evento => {
        const agregar = evento.target.closest('[data-agregar-pos]');
        const menos = evento.target.closest('[data-ticket-menos]');
        const mas = evento.target.closest('[data-ticket-mas]');
        const quitar = evento.target.closest('[data-ticket-quitar]');
        const anular = evento.target.closest('[data-anular-venta]');

        if (agregar) agregarAlTicket(agregar.dataset.agregarPos);
        if (menos) cambiarCantidadTicket(Number(menos.dataset.ticketMenos), -1);
        if (mas) cambiarCantidadTicket(Number(mas.dataset.ticketMas), 1);
        if (quitar) quitarDelTicket(Number(quitar.dataset.ticketQuitar));
        if (anular) abrirAnulacion(anular.dataset.anularVenta);
    });

    pintarTicket();
    cargarDiaVentas();
});
