'use strict';

/* Pagina del carrito: dibuja las lineas, calcula totales y arma el pedido
   en el cliente. El pedido se guarda en localStorage ("Mis pedidos") y se
   envia por WhatsApp. El stock nunca se descuenta del catalogo. */

const formularioPedido = document.getElementById('checkoutForm');
const botonWhatsApp = document.getElementById('whatsappButton');
const estadoPedido = document.getElementById('pedEstado');

const CAMPOS_PEDIDO = [
    { id: 'pedNombre', error: 'pedErrorNombre', vacio: 'Escribí tu nombre', corto: 'Escribí tu nombre completo', minimo: 2 },
    { id: 'pedTelefono', error: 'pedErrorTelefono', vacio: 'Falta un teléfono de contacto', corto: 'Revisá el teléfono de contacto', tipo: 'telefono' },
    { id: 'pedEmail', error: 'pedErrorEmail', vacio: '', corto: 'Revisá el correo electrónico', tipo: 'correo', opcional: true }
];

function envioGratisActual() {
    return Number(NEGOCIO.envioGratis) || 0;
}

function actualizarTextosDeEnvio() {
    document.querySelectorAll("[data-envio-gratis]").forEach(elemento => {
        elemento.textContent = formatearPrecio(envioGratisActual());
    });

    const barra = document.getElementById("shippingProgress");

    if (barra) barra.setAttribute("aria-valuemax", String(envioGratisActual()));
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
        ? 'Gratis'
        : formatearPrecio(0);
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
        mostrarEstadoFormulario(estadoPedido, 'Revisá el correo electrónico.', 'error');
        primerError = primerError || 'pedEmail';
    }

    if (primerError) {
        const campo = document.getElementById(primerError);
        if (campo) campo.focus();
        return false;
    }

    return true;
}

function armarDatosPedido() {
    const carrito = obtenerCarrito();
    const { subtotal, envio, total } = calcularTotales(carrito);

    return {
        lineas: carrito.map(linea => ({
            id: linea.id,
            nombre: linea.nombre,
            precio: linea.precio,
            cantidad: linea.cantidad
        })),
        cliente: {
            nombre: leerCampo('pedNombre'),
            telefono: leerCampo('pedTelefono'),
            email: leerCampo('pedEmail') || '',
            zona: leerCampo('pedZona') || '',
            notas: leerCampo('pedNotas') || ''
        },
        subtotal,
        envio: envio === null ? 0 : envio,
        total
    };
}

function confirmarPedido(evento) {
    evento.preventDefault();

    const carrito = obtenerCarrito();

    if (!carrito.length) {
        mostrarEstadoFormulario(estadoPedido, 'Agregá al menos un producto al carrito.', 'error');
        return;
    }

    limpiarErrores(formularioPedido);

    if (!validarPedido()) {
        mostrarEstadoFormulario(estadoPedido, 'Revisá los campos marcados.', 'error');
        return;
    }

    if (botonWhatsApp) {
        botonWhatsApp.disabled = true;
        botonWhatsApp.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">hourglass_top</span> Preparando pedido…';
    }

    mostrarEstadoFormulario(estadoPedido, '', '');

    try {
        const datos = armarDatosPedido();
        const pedido = guardarPedido(armarPedido(datos));

        vaciarCarrito();
        if (formularioPedido) formularioPedido.reset();
        actualizarTextosDeEnvio();

        mostrarEstadoFormulario(
            estadoPedido,
            'Pedido ' + pedido.id + ' listo. Abrimos WhatsApp para coordinar la entrega.',
            'ok'
        );

        abrirWhatsApp(mensajeDePedido(pedido), true);
    } catch (error) {
        mostrarEstadoFormulario(estadoPedido, error.message || 'No se pudo armar el pedido. Intentá de nuevo.', 'error');
    } finally {
        if (botonWhatsApp) {
            botonWhatsApp.disabled = false;
            botonWhatsApp.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Confirmar pedido';
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

if (formularioPedido) {
    formularioPedido.addEventListener('submit', confirmarPedido);
}

suscribirAlCarrito(renderCarrito);

actualizarTextosDeEnvio();
renderCarrito();
