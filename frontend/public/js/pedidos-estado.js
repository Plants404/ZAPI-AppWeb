'use strict';

/* Historial de pedidos guardado en el navegador. Cada pedido es una copia
   cerrada de lo que se envió por WhatsApp: precios, cantidades y datos de
   contacto. El stock del catálogo nunca se descuenta desde acá. */

const CLAVE_PEDIDOS = "zapiPedidos";
const LIMITE_PEDIDOS = 40;

const ESTADOS_PEDIDO = Object.freeze({
    pendiente: "Pendiente de confirmación"
});

function leerPedidosGuardados() {
    try {
        const crudo = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS));

        return Array.isArray(crudo) ? crudo : [];
    } catch {
        return [];
    }
}

function obtenerPedidos() {
    return leerPedidosGuardados().map(pedido => ({ ...pedido, lineas: Array.isArray(pedido.lineas) ? pedido.lineas : [] }));
}

function crearIdPedido(usados) {
    let id = "";

    do {
        id = "ZAPI-" + Date.now().toString(36).toUpperCase();
    } while (usados.has(id));

    return id;
}

function guardarPedido(pedido) {
    const pedidos = leerPedidosGuardados();
    const usados = new Set(pedidos.map(item => item.id));

    if (!pedido.id) pedido.id = crearIdPedido(usados);

    pedidos.unshift(pedido);

    try {
        localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos.slice(0, LIMITE_PEDIDOS)));
    } catch {
        /* Sin almacenamiento el pedido igual se envía por WhatsApp. */
    }

    return pedido;
}

function armarPedido(datos) {
    const fecha = new Date().toISOString();
    const cliente = datos.cliente || {};
    const lineas = datos.lineas.map(linea => ({
        id: linea.id,
        nombre: linea.nombre,
        precio: linea.precio,
        cantidad: linea.cantidad
    }));

    return {
        id: "",
        fecha,
        estado: "pendiente",
        cliente: {
            nombre: cliente.nombre || "",
            telefono: cliente.telefono || "",
            email: cliente.email || "",
            zona: cliente.zona || "",
            notas: cliente.notas || ""
        },
        lineas,
        subtotal: datos.subtotal,
        envio: datos.envio,
        total: datos.envio === null ? datos.subtotal : datos.subtotal + datos.envio
    };
}

function textoEstadoPedido(estado) {
    return ESTADOS_PEDIDO[estado] || ESTADOS_PEDIDO.pendiente;
}

function mensajeDePedido(pedido) {
    const lineas = pedido.lineas.map(linea =>
        "- " + linea.cantidad + " × " + linea.nombre + " — " + formatearPrecio(linea.precio * linea.cantidad)
    );
    const envio = pedido.envio === null ? "A coordinar" : formatearPrecio(pedido.envio);
    const total = pedido.envio === null
        ? formatearPrecio(pedido.total) + " + envío a coordinar"
        : formatearPrecio(pedido.total);
    const datos = [
        "Hola ZAPI, quiero confirmar este pedido:",
        "",
        "Pedido: " + pedido.id,
        "Fecha: " + formatearFecha(pedido.fecha),
        "",
        ...lineas,
        "",
        "Subtotal: " + formatearPrecio(pedido.subtotal),
        "Envío: " + envio,
        "Total: " + total,
        "",
        "Nombre: " + pedido.cliente.nombre,
        "Teléfono: " + pedido.cliente.telefono
    ];

    if (pedido.cliente.email) datos.push("Correo: " + pedido.cliente.email);
    if (pedido.cliente.zona) datos.push("Zona: " + pedido.cliente.zona);
    if (pedido.cliente.notas) datos.push("Notas: " + pedido.cliente.notas);

    return datos.join("\n");
}

function eliminarPedido(id) {
    const pedidos = leerPedidosGuardados().filter(pedido => pedido.id !== id);

    try {
        localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos));
    } catch {
        /* Sin almacenamiento no hay historial que actualizar. */
    }
}

function vaciarPedidos() {
    try {
        localStorage.removeItem(CLAVE_PEDIDOS);
    } catch {
        /* Sin almacenamiento no hay historial que vaciar. */
    }
}
