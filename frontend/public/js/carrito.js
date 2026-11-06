'use strict';

/* Página del carrito: dibuja las líneas, calcula totales y crea el pedido
   en la API. El servidor vuelve a calcular precios y stock; WhatsApp se
   abre con el código de la orden ya guardada. */

const formularioPedido = document.getElementById('checkoutForm');

function envioGratisActual() {
    return Number(CONFIG.envioGratis) || 0;
}

function actualizarTextosDeEnvio() {
    const limite = envioGratisActual();

    document.querySelectorAll('[data-shipping-threshold]').forEach(elemento => {
        elemento.textContent = formatearPrecio(limite);
    });

    const barra = document.getElementById('shippingProgress');

    if (barra) barra.setAttribute('aria-valuemax', String(limite));
}

function actualizarResumen() {
    const carrito = obtenerCarrito();
    const { subtotal, envio, total } = calcularTotales(carrito);
    const envioGratis = envioGratisActual();
    const progreso = Math.min(subtotal, envioGratis);
    const porcentaje = envioGratis > 0 ? (progreso / envioGratis) * 100 : 100;
    const seccionProgreso = document.getElementById('shippingProgressSection');
    const barra = document.getElementById('shippingProgress');
    const relleno = document.getElementById('shippingProgressFill');
    const mensaje = document.getElementById('shippingProgressMessage');
    const nota = document.getElementById('shippingPendingNote');
    const faltante = Math.max(0, envioGratis - subtotal);

    document.getElementById('subtotal').textContent = formatearPrecio(subtotal);
    document.getElementById('shipping').textContent = envio === null
        ? 'A coordinar'
        : subtotal > 0 ? 'Gratis' : formatearPrecio(0);
    document.getElementById('total').textContent = formatearPrecio(total === null ? subtotal : total);

    if (nota) nota.hidden = total !== null || carrito.length === 0;
    if (seccionProgreso) seccionProgreso.hidden = carrito.length === 0;

    if (barra) {
        barra.hidden = carrito.length === 0;
        barra.setAttribute('aria-valuenow', String(progreso));
        barra.setAttribute('aria-valuetext', subtotal >= envioGratis
            ? 'Envío gratis alcanzado'
            : formatearPrecio(faltante) + ' para alcanzar el envío gratis');
    }

    if (relleno) relleno.style.width = porcentaje + '%';

    if (mensaje) {
        mensaje.textContent = subtotal >= envioGratis
            ? '¡Tenés envío gratis!'
            : 'Te faltan ' + formatearPrecio(faltante) + ' para el envío gratis';
    }
}

function lineaDeCarrito(linea) {
    const producto = obtenerProducto(linea.id);
    const unidades = producto ? unidadesDe(linea.id) : null;
    const detalle = linea.cantidad > 1
        ? `<small>${linea.cantidad} × ${formatearPrecio(linea.precio)}</small>`
        : '';
    const stock = unidades === null
        ? '<p class="stock">Cargando disponibilidad…</p>'
        : `<p class="stock ${claseDeStock(unidades)}">${textoDeStock(unidades)}</p>`;

    return `
        <article class="linea-carrito" data-id="${linea.id}">
            <a class="linea-foto" href="${escaparHTML(rutaFicha(producto))}">
                <img src="${rutaConRaiz(escaparHTML(linea.imagen))}" alt="" loading="lazy" width="798" height="1200">
            </a>
            <div class="linea-datos">
                <span class="etiqueta">${escaparHTML(linea.categoria)}</span>
                <h2>${escaparHTML(linea.nombre)}</h2>
                ${stock}
            </div>
            <div class="linea-acciones">
                <div class="control-cantidad" role="group" aria-label="Cantidad de ${escaparHTML(linea.nombre)}">
                    <button class="boton-cantidad" type="button" data-accion="restar" data-id="${linea.id}" aria-label="Disminuir cantidad">
                        <span class="material-symbols-outlined" aria-hidden="true">remove</span>
                    </button>
                    <span class="cantidad-valor" aria-live="polite">${linea.cantidad}</span>
                    <button class="boton-cantidad" type="button" data-accion="sumar" data-id="${linea.id}" aria-label="Aumentar cantidad"${unidades !== null && linea.cantidad >= unidades ? ' disabled' : ''}>
                        <span class="material-symbols-outlined" aria-hidden="true">add</span>
                    </button>
                </div>
                <div class="linea-total">
                    <strong>${formatearPrecio(linea.precio * linea.cantidad)}</strong>
                    ${detalle}
                </div>
                <button class="icono-boton linea-quitar" type="button" data-accion="quitar" data-id="${linea.id}" aria-label="Eliminar ${escaparHTML(linea.nombre)} del carrito">
                    <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
            </div>
        </article>`;
}

function recomendacionesDelCarrito() {
    const carrito = obtenerCarrito();
    const enCarrito = new Set(carrito.map(linea => linea.id));
    const categorias = new Set(carrito.map(linea => linea.categoria));

    return PRODUCTOS
        .filter(producto => !enCarrito.has(producto.id) && unidadesDe(producto.id) > 0)
        .sort((a, b) => Number(categorias.has(b.categoria)) - Number(categorias.has(a.categoria)))
        .slice(0, 3);
}

function renderRecomendaciones() {
    const seccion = document.getElementById('recommendations');
    const lista = document.getElementById('recommendationsList');

    if (!seccion || !lista) return;

    const recomendaciones = obtenerCarrito().length ? recomendacionesDelCarrito() : [];

    seccion.hidden = recomendaciones.length === 0;
    lista.innerHTML = recomendaciones.map(producto => htmlTarjetaProducto(producto)).join('');
}

function renderCarrito() {
    const contenedor = document.getElementById('cartItems');
    const vacio = document.getElementById('emptyCart');
    const carrito = obtenerCarrito();
    const activo = document.activeElement;
    const accionActiva = activo && activo.closest('#cartItems')
        ? { accion: activo.dataset.accion, id: activo.dataset.id }
        : null;

    if (!contenedor || !vacio) return;

    contenedor.innerHTML = carrito.map(lineaDeCarrito).join('');
    vacio.hidden = carrito.length > 0;

    if (formularioPedido) formularioPedido.hidden = carrito.length === 0;

    actualizarResumen();
    renderRecomendaciones();

    if (accionActiva) {
        const boton = contenedor.querySelector(`[data-accion="${accionActiva.accion}"][data-id="${accionActiva.id}"]`);

        if (boton) boton.focus();
    }
}

function mensajeDelPedido(pedido) {
    const lineas = pedido.items.map(item =>
        '• ' + item.nombre + ' x' + item.cantidad + ' — ' + formatearPrecio(item.precio * item.cantidad)
    ).join('\n');
    const contacto = [
        'Nombre: ' + pedido.contacto.nombre,
        'Teléfono: ' + pedido.contacto.telefono,
        pedido.contacto.email ? 'Correo: ' + pedido.contacto.email : '',
        pedido.zona ? 'Zona: ' + pedido.zona : '',
        pedido.notas ? 'Notas: ' + pedido.notas : ''
    ].filter(Boolean).join('\n');
    const envio = pedido.envioPendiente
        ? 'A coordinar por WhatsApp'
        : pedido.total > pedido.subtotal ? formatearPrecio(pedido.total - pedido.subtotal) : 'Gratis';

    return 'Hola ZAPI\n\nQuiero realizar el siguiente pedido:\n\n' + lineas +
        '\n\n━━━━━━━━━━━━━━━━━━\n\n' +
        'Pedido: ' + pedido.codigo + '\n' +
        'Subtotal: ' + formatearPrecio(pedido.subtotal) + '\n' +
        'Envío: ' + envio + '\n\n' +
        'TOTAL: ' + formatearPrecio(pedido.total) + '\n\n' +
        '━━━━━━━━━━━━━━━━━━\n\nDatos de contacto\n\n' + contacto +
        '\n\n¿Podrían confirmarme la disponibilidad y coordinar la entrega?\n\nGracias.';
}

function leerCampo(id) {
    const campo = document.getElementById(id);
    return campo ? limpiarValor(campo.value) : '';
}

function validarPedido() {
    let primerError = null;

    const nombre = leerCampo('pedNombre');
    const telefono = leerCampo('pedTelefono');
    const email = leerCampo('pedEmail');

    if (nombre.length < 2) {
        marcarErrorCampo('pedNombre', 'pedErrorNombre', 'Escribí tu nombre');
        primerError = primerError || 'pedNombre';
    }

    if (telefono.replace(/\D/g, '').length < 6) {
        marcarErrorCampo('pedTelefono', 'pedErrorTelefono', 'Falta un teléfono de contacto');
        primerError = primerError || 'pedTelefono';
    }

    if (email && !validarCorreo(email)) {
        mostrarEstadoFormulario(document.getElementById('pedEstado'), 'Revisá el correo electrónico.', 'error');
        primerError = primerError || 'pedEmail';
    }

    if (primerError) {
        const campo = document.getElementById(primerError);
        if (campo) campo.focus();
        return false;
    }

    return true;
}

function marcarFaltantes(faltantes) {
    const estado = document.getElementById('pedEstado');
    const detalle = faltantes.map(item =>
        item.nombre + ': pediste ' + item.solicitados + ', hay ' + item.disponibles
    ).join(' · ');

    mostrarEstadoFormulario(estado, 'Ajustamos el stock disponible. ' + detalle, 'error');
}

async function confirmarPedido(evento) {
    evento.preventDefault();

    const carrito = obtenerCarrito();
    const estado = document.getElementById('pedEstado');
    const boton = document.getElementById('whatsappButton');
    const textoBoton = boton ? boton.innerHTML : '';

    if (!carrito.length) {
        mostrarEstadoFormulario(estado, 'Agregá al menos un producto al carrito.', 'error');
        return;
    }

    limpiarErrores(formularioPedido);

    if (!validarPedido()) {
        mostrarEstadoFormulario(estado, 'Revisá los campos marcados.', 'error');
        return;
    }

    if (!SESION.usuario) {
        volverALogin('carrito.html');
        return;
    }

    if (SESION.usuario.role !== 'cliente') {
        mostrarEstadoFormulario(estado, 'Las cuentas de administración no pueden crear pedidos online.', 'error');
        return;
    }

    if (boton) {
        boton.disabled = true;
        boton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">hourglass_top</span> Enviando pedido…';
    }

    mostrarEstadoFormulario(estado, '', '');

    try {
        const datos = await API.post('/api/pedidos', {
            items: carrito.map(linea => ({ productoId: linea.id, cantidad: linea.cantidad })),
            nombre: leerCampo('pedNombre'),
            telefono: leerCampo('pedTelefono'),
            email: leerCampo('pedEmail') || undefined,
            zona: leerCampo('pedZona') || undefined,
            notas: leerCampo('pedNotas') || undefined
        });
        const pedido = datos.pedido;

        vaciarCarrito();
        if (formularioPedido) formularioPedido.reset();
        actualizarTextosDeEnvio();

        mostrarEstadoFormulario(
            estado,
            'Pedido ' + pedido.codigo + ' recibido. Abrimos WhatsApp para coordinar la entrega.',
            'ok'
        );

        abrirWhatsApp(mensajeDelPedido(pedido), true);
    } catch (error) {
        if (error.estado === 401) {
            volverALogin('carrito.html');
            return;
        }

        if (error.estado === 409 && error.datos && Array.isArray(error.datos.faltantes)) {
            marcarFaltantes(error.datos.faltantes);
        } else if (error.datos && error.datos.campo === 'telefono') {
            marcarErrorCampo('pedTelefono', 'pedErrorTelefono', mensajeDeError(error));
        } else if (error.datos && error.datos.campo === 'nombre') {
            marcarErrorCampo('pedNombre', 'pedErrorNombre', mensajeDeError(error));
        } else {
            mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
        }
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = textoBoton;
        }
    }
}

document.addEventListener('click', evento => {
    const boton = evento.target.closest('#cartItems [data-accion]');

    if (!boton) return;

    const id = Number(boton.dataset.id);

    if (boton.dataset.accion === 'sumar') {
        if (!cambiarCantidadCarrito(id, 1)) {
            mostrarAviso('Sin stock', 'No quedan más unidades disponibles de este producto.');
        }
        return;
    }

    if (boton.dataset.accion === 'restar') {
        cambiarCantidadCarrito(id, -1);
        return;
    }

    if (boton.dataset.accion === 'quitar') quitarDelCarrito(id);
});

const botonVaciar = document.getElementById('clearCart');

if (botonVaciar) {
    botonVaciar.addEventListener('click', () => {
        if (!obtenerCarrito().length) return;
        if (!window.confirm('¿Querés vaciar el carrito?')) return;

        vaciarCarrito();
    });
}

if (formularioPedido) formularioPedido.addEventListener('submit', confirmarPedido);

cuandoConfigLista(() => {
    actualizarTextosDeEnvio();
    actualizarResumen();
});

cuandoSesionLista(usuario => {
    if (!usuario || usuario.role !== 'cliente') return;

    const nombre = document.getElementById('pedNombre');
    const telefono = document.getElementById('pedTelefono');
    const email = document.getElementById('pedEmail');

    if (nombre && !nombre.value) nombre.value = usuario.nombre || '';
    if (telefono && !telefono.value) telefono.value = usuario.telefono || '';
    if (email && !email.value) email.value = usuario.email || '';
});

suscribirAlCarrito(renderCarrito);

actualizarTextosDeEnvio();
renderCarrito();
