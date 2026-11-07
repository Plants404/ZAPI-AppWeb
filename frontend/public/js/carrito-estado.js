'use strict';

/* Estado único del carrito. La página no guarda copias: siempre lee con
   obtenerCarrito() y se entera de los cambios por suscribirAlCarrito().
   Las líneas guardadas sobreviven hasta que la API entrega el catálogo;
   ahí se revalidan contra el stock y los precios vigentes. */

const CLAVE_CARRITO = 'zapiCarrito';

const suscriptoresDelCarrito = [];

let carritoEnMemoria = null;
let carritoRevalidado = false;

function envioGratisActual() {
    if (typeof CONFIG !== 'undefined' && Number.isFinite(Number(CONFIG.envioGratis))) {
        return Number(CONFIG.envioGratis);
    }

    return NEGOCIO.envioGratis;
}

function lineaGuardadaValida(linea) {
    if (!linea || typeof linea !== 'object') return null;

    const id = Number(linea.id);
    const cantidad = Math.max(1, Math.floor(Number(linea.cantidad) || 1));

    if (!Number.isFinite(id)) return null;

    return {
        id,
        nombre: String(linea.nombre || 'Producto'),
        categoria: String(linea.categoria || ''),
        imagen: String(linea.imagen || ''),
        precio: Math.max(0, Number(linea.precio) || 0),
        cantidad
    };
}

function normalizarLinea(linea, conservarSinCatalogo) {
    const guardada = lineaGuardadaValida(linea);

    if (!guardada) return null;

    const producto = obtenerProducto(guardada.id);

    if (!producto) {
        return conservarSinCatalogo && !carritoRevalidado ? guardada : null;
    }

    const maximo = unidadesDe(producto.id);

    if (maximo === 0) return null;

    return {
        id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        imagen: producto.imagen,
        precio: producto.precioBase,
        cantidad: Math.min(maximo, guardada.cantidad)
    };
}

function leerCarritoGuardado() {
    try {
        const crudo = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
        return Array.isArray(crudo) ? crudo : [];
    } catch {
        return [];
    }
}

function persistirCarrito(lineas) {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lineas));
    } catch {
        /* Sin almacenamiento el carrito sigue vivo en esta pestaña. */
    }
}

function guardarCarrito(lineas) {
    const normalizadas = lineas
        .map(linea => normalizarLinea(linea, !carritoRevalidado))
        .filter(Boolean);

    carritoEnMemoria = normalizadas;
    persistirCarrito(normalizadas);
}

function obtenerCarrito() {
    if (!carritoEnMemoria) {
        carritoEnMemoria = leerCarritoGuardado()
            .map(linea => normalizarLinea(linea, !carritoRevalidado))
            .filter(Boolean);
    }

    return carritoEnMemoria.map(linea => ({ ...linea }));
}

function revalidarCarrito() {
    carritoRevalidado = true;

    const lineas = (carritoEnMemoria || leerCarritoGuardado())
        .map(linea => normalizarLinea(linea, false))
        .filter(Boolean);

    carritoEnMemoria = lineas;
    persistirCarrito(lineas);
    actualizarContador(false);
    avisarCambioDelCarrito();
}

function suscribirAlCarrito(escucha) {
    if (typeof escucha === 'function') suscriptoresDelCarrito.push(escucha);
}

function avisarCambioDelCarrito() {
    suscriptoresDelCarrito.forEach(escucha => escucha());
}

function calcularTotales(lineas = obtenerCarrito()) {
    const envioGratis = envioGratisActual();
    const subtotal = lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
    const envio = lineas.length === 0 || subtotal >= envioGratis ? 0 : null;

    return {
        subtotal,
        envio,
        total: envio === null ? null : subtotal + envio
    };
}

function agregarProductoAlCarrito(id) {
    const producto = obtenerProducto(id);

    if (!producto) return false;

    const lineas = obtenerCarrito();
    const existente = lineas.find(linea => linea.id === producto.id);
    const disponibles = unidadesDe(producto.id);

    if (disponibles === 0) return false;
    if (existente && existente.cantidad >= disponibles) return false;

    if (existente) {
        existente.cantidad += 1;
    } else {
        lineas.push({
            id: producto.id,
            nombre: producto.nombre,
            categoria: producto.categoria,
            imagen: producto.imagen,
            precio: producto.precioBase,
            cantidad: 1
        });
    }

    guardarCarrito(lineas);
    actualizarContador(true);
    avisarCambioDelCarrito();
    return true;
}

function cambiarCantidadCarrito(id, delta) {
    const lineas = obtenerCarrito();
    const linea = lineas.find(item => item.id === Number(id));

    if (!linea) return false;

    const maximo = unidadesDe(linea.id);
    const nueva = Math.max(1, Math.min(maximo, linea.cantidad + delta));

    if (nueva === linea.cantidad) return false;

    linea.cantidad = nueva;
    guardarCarrito(lineas);
    actualizarContador(false);
    avisarCambioDelCarrito();
    return true;
}

function quitarDelCarrito(id) {
    const lineas = obtenerCarrito().filter(linea => linea.id !== Number(id));

    guardarCarrito(lineas);
    actualizarContador(false);
    avisarCambioDelCarrito();
}

function vaciarCarrito() {
    guardarCarrito([]);
    actualizarContador(false);
    avisarCambioDelCarrito();
}

function actualizarContador(animar) {
    const total = obtenerCarrito().reduce((suma, linea) => suma + linea.cantidad, 0);

    document.querySelectorAll('[data-cart-count]').forEach(insignia => {
        insignia.textContent = String(total);
        insignia.classList.toggle('con-productos', total > 0);

        if (!animar) return;

        insignia.classList.remove('pop');
        void insignia.offsetWidth;
        insignia.classList.add('pop');
    });

    const enlace = document.querySelector('.header-carrito');

    if (enlace) {
        enlace.setAttribute(
            'aria-label',
            total === 1 ? 'Ver carrito, 1 producto' : 'Ver carrito, ' + total + ' productos'
        );
    }
}

document.addEventListener('catalogo-listo', evento => {
    if (evento.detail && evento.detail.error) return;

    revalidarCarrito();
});

document.addEventListener('DOMContentLoaded', () => actualizarContador(false));
