'use strict';

/* Estado único del carrito. La página lee con obtenerCarrito() y las
   acciones de agregar, cambiar cantidad y quitar persisten en
   localStorage. El stock se toma siempre del catálogo publicado. */

const CLAVE_CARRITO = "zapiCarrito";

let carritoEnMemoria = null;
const suscriptores = [];

function suscribirAlCarrito(escucha) {
    if (typeof escucha === "function") suscriptores.push(escucha);
}

function notificarCarrito() {
    suscriptores.forEach(cb => {
        try { cb(); } catch { /* sin fallar la pagina por un escucha */ }
    });
}

function lineaGuardadaValida(linea) {
    if (!linea || typeof linea !== "object") return null;

    const id = Number(linea.id);
    const cantidad = Math.max(1, Math.floor(Number(linea.cantidad) || 1));

    if (!Number.isFinite(id)) return null;

    return {
        id,
        nombre: String(linea.nombre || "Producto"),
        categoria: String(linea.categoria || ""),
        imagen: String(linea.imagen || ""),
        precio: Math.max(0, Number(linea.precio) || 0),
        cantidad
    };
}

function normalizarLinea(linea) {
    const guardada = lineaGuardadaValida(linea);

    if (!guardada) return null;

    const producto = obtenerProducto(guardada.id);

    if (!producto) return null;

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
    const normalizadas = lineas.map(normalizarLinea).filter(Boolean);

    carritoEnMemoria = normalizadas;
    persistirCarrito(normalizadas);
    notificarCarrito();
}

function obtenerCarrito() {
    if (!carritoEnMemoria) {
        carritoEnMemoria = leerCarritoGuardado().map(normalizarLinea).filter(Boolean);
    }

    return carritoEnMemoria.map(linea => ({ ...linea }));
}

function calcularTotales(lineas = obtenerCarrito()) {
    const subtotal = lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
    const envio = lineas.length === 0 || subtotal >= NEGOCIO.envioGratis ? 0 : null;

    return {
        subtotal,
        envio,
        total: envio === null ? subtotal : subtotal + envio
    };
}

function actualizarContador(animar) {
    const total = obtenerCarrito().reduce((suma, linea) => suma + linea.cantidad, 0);

    document.querySelectorAll("[data-cart-count]").forEach(insignia => {
        insignia.textContent = String(total);
        insignia.classList.toggle("con-productos", total > 0);

        if (!animar) return;

        insignia.classList.remove("pop");
        void insignia.offsetWidth;
        insignia.classList.add("pop");
    });

    const enlace = document.querySelector(".header-carrito");

    if (enlace) {
        enlace.setAttribute(
            "aria-label",
            total === 1 ? "Ver carrito, 1 producto" : "Ver carrito, " + total + " productos"
        );
    }
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
    return true;
}

function quitarDelCarrito(id) {
    guardarCarrito(obtenerCarrito().filter(linea => linea.id !== Number(id)));
    actualizarContador(false);
}

function vaciarCarrito() {
    guardarCarrito([]);
    actualizarContador(false);
}

document.addEventListener("DOMContentLoaded", () => actualizarContador(false));
