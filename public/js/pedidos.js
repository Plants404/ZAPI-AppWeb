'use strict';
(function () {

    const lista = document.getElementById('pedidosLista');
    const vacio = document.getElementById('pedidosVacio');
    const aviso = document.getElementById('pedidosError');
    const subtitulo = document.getElementById('pedidosSubtitulo');
    const explorar = document.getElementById('pedidosExplorar');
    const estadosProgreso = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado'];

    if (!lista || !vacio) return;

    const escaparHTML = valor => String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caracter]));

    function formatearPrecio(valor) {
        return new Intl.NumberFormat('es-UY', {
            style: 'currency',
            currency: 'UYU',
            maximumFractionDigits: 0,
        }).format(Number(valor) || 0);
    }

    function formatearFecha(iso) {
        const fecha = new Date(iso);

        if (Number.isNaN(fecha.getTime())) return '';

        const fechaLarga = new Intl.DateTimeFormat('es-UY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(fecha);
        const hora = new Intl.DateTimeFormat('es-UY', {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(fecha);

        return `${fechaLarga} · ${hora}`;
    }

    /* Miniatura real desde el catalogo por producto_id, con fallback
       si el producto ya no existe. Alt vacio: es decorativa, el nombre
       va como texto al lado. */
    function imagenDeLinea(item) {
        const id = Number(item.producto_id);
        const producto = Array.isArray(PRODUCTOS)
            ? PRODUCTOS.find(function (p) { return p && Number(p.id) === id; })
            : null;
        const fuente = (producto && producto.imagen) || IMAGEN_FALLBACK;

        return `<img class="pedido-linea-foto" src="${escaparHTML(fuente)}" alt="" loading="lazy">`;
    }

    function lineaHTML(item) {
        return `
            <li class="pedido-linea">
                <span class="pedido-linea-cantidad">${escaparHTML(item.cantidad)}×</span>
                ${imagenDeLinea(item)}
                <span class="pedido-linea-nombre">${escaparHTML(item.nombre)}</span>
                <span class="pedido-linea-precio">${formatearPrecio(Number(item.precio) * Number(item.cantidad))}</span>
            </li>
        `;
    }

    function hayBackend() {
        const fn = window.hayApiConfigurada;
        return typeof fn !== 'function' || fn();
    }

    function claseEstado(estado) {
        if (estado === 'cancelado') return 'pedido-estado pedido-estado-cancelado';
        return estadosProgreso.includes(estado)
            ? `pedido-estado pedido-estado-${estado}`
            : 'pedido-estado';
    }

    /* Solo los pedidos locales se pueden cancelar: con backend el
       servidor no ofrece todavia esa accion. */
    function botonCancelar(pedido) {
        if (hayBackend() || pedido.estado === 'cancelado') return '';

        return `
                <div class="pedido-acciones">
                    <button type="button" class="pedido-cancelar" data-cancelar="${escaparHTML(pedido.id)}">
                        <span class="material-symbols-outlined" aria-hidden="true">undo</span>
                        Cancelar pedido
                    </button>
                </div>
        `;
    }

    function botonOcultar(pedido) {
        if (!hayBackend()) return '';

        return `
                <div class="pedido-acciones">
                    <button type="button" class="pedido-ocultar" data-ocultar="${escaparHTML(pedido.id)}">
                        <span class="material-symbols-outlined" aria-hidden="true">visibility_off</span>
                        Quitar del historial
                    </button>
                </div>
        `;
    }

    function pedidoHTML(pedido) {
        const items = Array.isArray(pedido.items) ? pedido.items : [];
        const id = String(pedido.id ?? '');
        const codigo = id.length > 6 ? id.slice(-6).toUpperCase() : id;
        const indiceEstado = estadosProgreso.indexOf(pedido.estado);
        let estadoPedido = '';

        if (hayBackend() && indiceEstado !== -1) {
            estadoPedido = `
                <ol class="pedido-progreso" aria-label="Estado del pedido">
                    ${estadosProgreso.map((estado, indice) => {
        const actual = indice === indiceEstado;
        const completado = indice < indiceEstado;
        const clasePaso = actual ? 'pedido-progreso-actual' : completado ? 'pedido-progreso-completado' : '';
        return `
                    <li class="pedido-progreso-paso ${clasePaso}" ${actual ? 'aria-current="step"' : ''}>
                        <span>${escaparHTML(estado)}</span>
                    </li>
                `;
    }).join('')}
                </ol>
            `;
        } else if (pedido.estado === 'cancelado') {
            estadoPedido = '<p class="pedido-cancelado-nota">Este pedido fue cancelado.</p>';
        }

        return `
            <article class="pedido-card">
                <div class="pedido-cabecera">
                    <div>
                        <span class="pedido-codigo" title="${escaparHTML(id)}">Pedido #${escaparHTML(codigo)}</span>
                        <span class="pedido-fecha">${escaparHTML(formatearFecha(pedido.creado))}</span>
                    </div>
                    <span class="${claseEstado(pedido.estado)}">${escaparHTML(pedido.estado)}</span>
                </div>
                ${estadoPedido}
                <div class="pedido-contenido">
                    <ul class="pedido-lineas">${items.map(lineaHTML).join('')}</ul>
                    <aside class="pedido-resumen">
                        <div class="pedido-envio">
                            <span>Envío</span>
                            <strong>${pedido.envio_pendiente ? 'A coordinar' : 'Gratis'}</strong>
                        </div>
                        <footer class="pedido-pie">
                            <span>${pedido.envio_pendiente ? 'Subtotal' : 'Total'}</span>
                            <strong>${formatearPrecio(pedido.total)}</strong>
                        </footer>
                    </aside>
                </div>
                ${botonCancelar(pedido)}
                ${botonOcultar(pedido)}
            </article>
        `;
    }

    function mostrarVacio() {
        lista.innerHTML = '';
        lista.hidden = true;
        vacio.classList.remove('hidden');
        if (subtitulo) subtitulo.textContent = 'Acá vas a ver el estado de cada pedido que hagas.';
        if (explorar) explorar.hidden = true;
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
        if (subtitulo) {
            const cantidad = pedidos.length;
            subtitulo.textContent = `${cantidad} pedido${cantidad === 1 ? '' : 's'} realizado${cantidad === 1 ? '' : 's'}`;
        }
        if (explorar) explorar.hidden = false;
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
        if (!hayBackend()) {
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

    async function ocultarPedido(id) {
        if (!id || !window.confirm('¿Quitar este pedido de tu historial? El pedido se conservará en la base de datos.')) return;

        try {
            const respuesta = await fetch(window.urlApi(`/api/pedidos/${encodeURIComponent(id)}/ocultar`), {
                method: 'PATCH',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });

            if (!respuesta.ok) {
                window.alert('No se pudo quitar el pedido del historial. El pedido sigue guardado.');
                return;
            }

            await cargar();
        } catch (error) {
            window.alert('No se pudo conectar con el servidor. El pedido sigue guardado en el historial.');
        }
    }

    lista.addEventListener('click', function (evento) {
        const boton = evento.target.closest('[data-cancelar]');

        if (boton) {
            cancelarPedido(boton.getAttribute('data-cancelar'));
            return;
        }

        const ocultar = evento.target.closest('[data-ocultar]');
        if (ocultar) ocultarPedido(ocultar.getAttribute('data-ocultar'));
    });

    cargar();

})();
