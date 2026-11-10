'use strict';

/* Catalogo: filtros por categoria, busqueda y grilla de tarjetas. La
   busqueda del encabezado llama a aplicarBusqueda() desde buscador.js, así
   el mismo estado alimenta las dos entradas. Los datos ya estan cargados
   sincronamente en catalogo-datos.js. */

let categoriaActual = '';
let busquedaActual = '';
let ordenActual = 'recomendados';

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
        <button class="catalog-filter catalogo-filtro${valor === categoriaActual ? ' activo' : ''}" type="button"
            data-categoria="${escaparHTML(valor)}" aria-pressed="${valor === categoriaActual}">
            ${escaparHTML(texto)}
        </button>`).join('');
    contenedor.insertAdjacentHTML('beforeend', '<span class="catalog-filter-indicator" id="catalogFilterIndicator" aria-hidden="true"></span>');
    actualizarIndicador();
}

function actualizarFiltros() {
    document.querySelectorAll('#catalogFilters .catalogo-filtro').forEach(boton => {
        const activo = boton.dataset.categoria === categoriaActual;

        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-pressed', String(activo));
    });
    actualizarIndicador();
}

function actualizarIndicador() {
    const contenedor = document.getElementById('catalogFilters');
    const activo = contenedor && contenedor.querySelector('.catalog-filter.activo');
    const indicador = document.getElementById('catalogFilterIndicator');

    if (!contenedor || !activo || !indicador) return;

    indicador.style.width = activo.offsetWidth + 'px';
    indicador.style.height = activo.offsetHeight + 'px';
    indicador.style.transform = 'translateX(' + activo.offsetLeft + 'px)';
    indicador.style.opacity = '1';
    contenedor.classList.add('con-indicador');
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

    if (ordenActual === 'precio-asc') {
        visibles.sort((a, b) => a.precioBase - b.precioBase);
    } else if (ordenActual === 'precio-desc') {
        visibles.sort((a, b) => b.precioBase - a.precioBase);
    } else if (ordenActual === 'nombre') {
        visibles.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    if (conteo) {
        conteo.textContent = visibles.length === 1
            ? '1 producto'
            : visibles.length + ' productos';
    }

    if (!visibles.length) {
        const mensaje = busquedaActual
            ? 'No encontramos productos para "' + escaparHTML(busquedaActual) + '".'
            : 'No hay productos en esta categoria por ahora.';

        grilla.innerHTML = `<p class="estado-vacio">${mensaje}
            <button class="boton-texto" type="button" data-limpiar-busqueda>Limpiar busqueda</button>
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

const selectorOrden = document.getElementById('catalogSort');

if (selectorOrden) {
    selectorOrden.addEventListener('change', () => {
        ordenActual = selectorOrden.value;
        renderCatalogo();
    });
}

renderFiltros();
renderCatalogo();
window.addEventListener('resize', actualizarIndicador);
