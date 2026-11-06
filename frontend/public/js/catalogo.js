'use strict';

/* Catálogo: filtros por categoría, búsqueda y grilla de tarjetas. La
   búsqueda del encabezado llama a aplicarBusqueda() desde buscador.js,
   así el mismo estado alimenta las dos entradas. */

let categoriaActual = '';
let busquedaActual = '';

function coincideBusqueda(producto) {
    if (!busquedaActual) return true;

    const texto = normalizarTexto([
        producto.nombre,
        producto.categoria,
        producto.descripcion,
        Array.isArray(producto.infoDeVenta) ? producto.infoDeVenta.join(' ') : ''
    ].join(' '));

    return normalizarTexto(busquedaActual)
        .split(/\s+/)
        .filter(Boolean)
        .every(palabra => texto.includes(palabra));
}

function productosVisibles() {
    return PRODUCTOS.filter(producto =>
        (!categoriaActual || producto.categoria === categoriaActual) && coincideBusqueda(producto)
    );
}

function renderFiltros() {
    const contenedor = document.getElementById('catalogFilters');

    if (!contenedor) return;

    const opciones = [{ valor: '', texto: 'Todas' }].concat(
        CATEGORIAS.map(categoria => ({ valor: categoria, texto: categoria }))
    );

    contenedor.innerHTML = opciones.map(({ valor, texto }) => `
        <button class="catalogo-filtro${valor === categoriaActual ? ' activo' : ''}" type="button"
            data-categoria="${escaparHTML(valor)}" aria-pressed="${valor === categoriaActual}">
            ${escaparHTML(texto)}
        </button>`).join('');
}

function actualizarFiltros() {
    document.querySelectorAll('#catalogFilters .catalogo-filtro').forEach(boton => {
        const activo = boton.dataset.categoria === categoriaActual;

        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-pressed', String(activo));
    });
}

function centrarFiltro(boton) {
    if (!boton || typeof boton.scrollIntoView !== 'function') return;

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    boton.scrollIntoView({
        behavior: sinMovimiento ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest'
    });
}

function renderCatalogo() {
    const grilla = document.getElementById('productGrid');
    const conteo = document.getElementById('catalogCount');

    if (!grilla) return;

    const visibles = productosVisibles();

    if (conteo) {
        conteo.textContent = visibles.length === 1
            ? '1 producto'
            : visibles.length + ' productos';
    }

    if (!visibles.length) {
        const mensaje = busquedaActual
            ? 'No encontramos productos para "' + escaparHTML(busquedaActual) + '".'
            : 'No hay productos en esta categoría por ahora.';

        grilla.innerHTML = `<p class="catalogo-vacio">${mensaje}
            <button class="boton-texto" type="button" data-limpiar-busqueda>Limpiar búsqueda</button>
        </p>`;
        return;
    }

    grilla.innerHTML = visibles.map(producto => htmlTarjetaProducto(producto)).join('');
}

function aplicarBusqueda(texto) {
    busquedaActual = String(texto || '').trim();
    renderCatalogo();
    return productosVisibles().length;
}

document.addEventListener('click', evento => {
    const filtro = evento.target.closest('.catalogo-filtro');

    if (filtro) {
        categoriaActual = filtro.dataset.categoria;
        actualizarFiltros();
        renderCatalogo();
        centrarFiltro(filtro);
        return;
    }

    if (!evento.target.closest('[data-limpiar-busqueda]')) return;

    busquedaActual = '';
    renderCatalogo();

    if (typeof window.refrescarCampoBuscador === 'function') {
        window.refrescarCampoBuscador('');
    }
});

cuandoCatalogoListo(estado => {
    renderFiltros();

    if (estado.error) {
        const grilla = document.getElementById('productGrid');

        if (grilla) {
            grilla.innerHTML = '<p class="catalogo-vacio">No pudimos cargar el catálogo. Revisá tu conexión y recargá la página.</p>';
        }

        return;
    }

    if (busquedaActual && typeof window.buscarEnElCatalogo === 'function') {
        window.buscarEnElCatalogo(busquedaActual);
        return;
    }

    renderCatalogo();
});
