'use strict';

/* Mis pedidos: renderiza el historial guardado en localStorage y permite
   reenviar un pedido por WhatsApp o eliminarlo del historial. */

const contenedor = document.getElementById('pedidosContenedor');
const vacio = document.getElementById('pedidosVacio');

function renderPedidos() {
    const pedidos = obtenerPedidos();

    if (!contenedor || !vacio) return;

    if (!pedidos.length) {
        contenedor.innerHTML = '';
        vacio.hidden = false;
        return;
    }

    vacio.hidden = true;
    contenedor.innerHTML = pedidos.map(pedido => {
        const lineas = pedido.lineas.map(linea =>
            '<li>' + linea.cantidad + ' × ' + escaparHTML(linea.nombre) + ' — ' + formatearPrecio(linea.precio * linea.cantidad) + '</li>'
        ).join('');

        return `<article class="pedido">
            <div class="pedido-cabecera">
                <div>
                    <span class="etiqueta">${escapeHtmlEstado(pedido.estado)}</span>
                    <strong>Pedido ${pedido.id}</strong>
                </div>
                <div class="pedido-fecha">${formatearFecha(pedido.fecha)}</div>
            </div>
            <ul class="pedido-lineas">${lineas}</ul>
            <div class="pedido-total">
                <span>Total</span><strong>${formatearPrecio(pedido.total)}</strong>
            </div>
            <div class="pedido-acciones">
                <button class="boton boton-primario" type="button" data-reenviar="${pedido.id}">
                    <span class="material-symbols-outlined" aria-hidden="true">whatsapp</span> Reenviar por WhatsApp
                </button>
                <button class="boton boton-texto" type="button" data-eliminar="${pedido.id}">
                    <span class="material-symbols-outlined" aria-hidden="true">delete</span> Eliminar del historial
                </button>
            </div>
        </article>`;
    }).join('');
}

function escapeHtmlEstado(estado) {
    const texto = textoEstadoPedido(estado);
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('click', evento => {
    const reenviar = evento.target.closest('[data-reenviar]');
    if (reenviar) {
        evento.preventDefault();
        const pedido = obtenerPedidos().find(p => p.id === reenviar.dataset.reenviar);
        if (pedido) abrirWhatsApp(mensajeDePedido(pedido), true);
        return;
    }

    const eliminar = evento.target.closest('[data-eliminar]');
    if (eliminar) {
        evento.preventDefault();
        const id = eliminar.dataset.eliminar;
        if (!window.confirm('¿Eliminar este pedido del historial?')) return;
        eliminarPedido(id);
        renderPedidos();
    }
});

renderPedidos();
