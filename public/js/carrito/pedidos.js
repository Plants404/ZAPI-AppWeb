'use strict';
(function () {

    const lista = document.getElementById('pedidosLista');
    const vacio = document.getElementById('pedidosVacio');
    const aviso = document.getElementById('pedidosError');

    if (!lista || !vacio) return;

    /* Miniatura real desde el catalogo por producto_id, con fallback
       si el producto ya no existe. Alt vacio: es decorativa, el nombre
       va como texto al lado. */
    function imagenDeLinea(item) {
        const id = Number(item.producto_id);
        const producto = Array.isArray(PRODUCTOS)
            ? PRODUCTOS.find(function (p) { return p && Number(p.id) === id; })
            : null;
        const fuente = (producto && producto.imagen) || IMAGEN_FALLBACK;

        return `<img class="pedido-linea-foto" src="${ZAPI.escaparHTML(fuente)}" alt="" loading="lazy">`;
    }

    function lineaHTML(item) {
        return `
            <li class="pedido-linea">
                <span class="pedido-linea-cantidad">${item.cantidad}×</span>
                ${imagenDeLinea(item)}
                <span class="pedido-linea-nombre">${ZAPI.escaparHTML(item.nombre)}</span>
                <span class="pedido-linea-precio">${ZAPI.formatearPrecio(item.precio * item.cantidad)}</span>
            </li>
        `;
    }

    function claseEstado(estado) {
        return estado === 'cancelado'
            ? 'pedido-estado pedido-estado-cancelado'
            : 'pedido-estado';
    }

    /* Solo los pedidos locales se pueden cancelar: con backend el
       servidor no ofrece todavia esa accion. */
    function botonCancelar(pedido) {
        if (ZAPI.hayBackend() || pedido.estado === 'cancelado') return '';

        return `
                <div class="pedido-acciones">
                    <button type="button" class="pedido-cancelar" data-cancelar="${ZAPI.escaparHTML(pedido.id)}">
                        <span class="material-symbols-outlined" aria-hidden="true">undo</span>
                        Cancelar pedido
                    </button>
                </div>
        `;
    }

    function pedidoHTML(pedido) {
        const items = Array.isArray(pedido.items) ? pedido.items : [];

        return `
            <article class="pedido-card">
                <div class="pedido-cabecera">
                    <div>
                        <span class="pedido-codigo">${ZAPI.escaparHTML(pedido.id)}</span>
                        <span class="pedido-fecha">${ZAPI.escaparHTML(ZAPI.formatearFecha(pedido.creado))}</span>
                    </div>
                    <span class="${claseEstado(pedido.estado)}">${ZAPI.escaparHTML(pedido.estado)}</span>
                </div>
                <ul class="pedido-lineas">${items.map(lineaHTML).join('')}</ul>
                <footer class="pedido-pie">
                    <span>${pedido.envio_pendiente ? "Subtotal" : "Total"}</span>
                    <strong>${pedido.envio_pendiente
        ? `${ZAPI.formatearPrecio(pedido.total)} · envío a coordinar`
        : ZAPI.formatearPrecio(pedido.total)}</strong>
                </footer>
                ${botonCancelar(pedido)}
            </article>
        `;
    }

    function mostrarVacio() {
        lista.innerHTML = '';
        lista.hidden = true;
        vacio.classList.remove('hidden');
    }

    function mostrarAviso() {
        lista.hidden = true;
        vacio.classList.add('hidden');
        if (aviso) aviso.hidden = false;
    }

    let ultimosPedidos = null;
    let repintadoConCatalogo = false;

    function pintar(pedidos) {
        if (aviso) aviso.hidden = true;

        ultimosPedidos = pedidos;
        repintadoConCatalogo = Array.isArray(PRODUCTOS) && PRODUCTOS.length > 0;

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            mostrarVacio();
            return;
        }

        lista.hidden = false;
        vacio.classList.add('hidden');
        lista.innerHTML = pedidos.map(pedidoHTML).join('');
    }

    /* El catalogo llega por fetch y suele tardar mas que la sesion: si
       se pinto con el catalogo vacio (miniaturas fallback), se repinta
       una sola vez al llegar para mostrar las fotos reales. */
    if (typeof alCargarElCatalogo === 'function') {
        alCargarElCatalogo(function () {
            if (!repintadoConCatalogo && ultimosPedidos) {
                repintadoConCatalogo = true;
                pintar(ultimosPedidos);
            }
            /* El conteo inicial corre con el catalogo vacio (da 0):
               se recalcula al llegar para que los badges muestren el
               total real en vez de quedar congelados. */
            if (typeof actualizarContador === 'function') {
                actualizarContador(false);
            }
        });
    }

    async function cargar() {
        /* Sin backend el historial es local: los pedidos que se
           guardaron en el navegador al enviarlos. */
        if (!ZAPI.hayBackend()) {
            const listar = window.listarPedidosLocales;
            const locales = typeof listar === 'function' ? listar() : [];

            pintar(locales);
            return;
        }

        try {
            const respuesta = await fetch(window.urlApi('/api/pedidos'), {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });

            if (respuesta.status === 401) return;

            if (!respuesta.ok) {
                mostrarAviso();
                return;
            }

            const datos = await respuesta.json();

            pintar(datos && datos.pedidos);
        } catch (error) {
            mostrarAviso();
        }
    }

    function cancelarPedido(id) {
        const cancelarLocal = window.cancelarPedidoLocal;

        if (typeof cancelarLocal !== 'function') return;
        if (!window.confirm('¿Cancelar el pedido ' + id + '?')) return;

        const cancelado = cancelarLocal(id);

        if (!cancelado) return;

        const devolverStock = window.devolverStockPedido;

        if (typeof devolverStock === 'function') {
            devolverStock((cancelado.items || []).map(function (item) {
                return { id: item.producto_id, cantidad: item.cantidad };
            }));
        }

        cargar();
    }

    lista.addEventListener('click', function (evento) {
        const boton = evento.target.closest('[data-cancelar]');

        if (!boton) return;

        cancelarPedido(boton.getAttribute('data-cancelar'));
    });

    cargar();

})();
