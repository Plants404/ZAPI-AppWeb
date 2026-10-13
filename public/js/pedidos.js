'use strict';
(function () {

    const lista = document.getElementById('pedidosLista');
    const vacio = document.getElementById('pedidosVacio');
    const aviso = document.getElementById('pedidosError');

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

        return new Intl.DateTimeFormat('es-UY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(fecha);
    }

    function lineaHTML(item) {
        return `
            <li class="pedido-linea">
                <span class="pedido-linea-cantidad">${item.cantidad}×</span>
                <span class="pedido-linea-nombre">${escaparHTML(item.nombre)}</span>
                <span class="pedido-linea-precio">${formatearPrecio(item.precio * item.cantidad)}</span>
            </li>
        `;
    }

    function pedidoHTML(pedido) {
        const items = Array.isArray(pedido.items) ? pedido.items : [];

        return `
            <article class="pedido-card">
                <header class="pedido-cabecera">
                    <div>
                        <span class="pedido-codigo">${escaparHTML(pedido.id)}</span>
                        <span class="pedido-fecha">${escaparHTML(formatearFecha(pedido.creado))}</span>
                    </div>
                    <span class="pedido-estado">${escaparHTML(pedido.estado)}</span>
                </header>
                <ul class="pedido-lineas">${items.map(lineaHTML).join('')}</ul>
                <footer class="pedido-pie">
                    <span>Total</span>
                    <strong>${formatearPrecio(pedido.total)}</strong>
                </footer>
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

    function pintar(pedidos) {
        if (aviso) aviso.hidden = true;

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            mostrarVacio();
            return;
        }

        lista.hidden = false;
        vacio.classList.add('hidden');
        lista.innerHTML = pedidos.map(pedidoHTML).join('');
    }

    async function cargar() {
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

    const auth = window.zapiAuth;

    if (!auth) return;

    auth.listo.then(function () {
        if (auth.autenticado) cargar();
    });

})();
