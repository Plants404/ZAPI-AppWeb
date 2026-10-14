let categoriaActual = "";
let busquedaActual = "";


/* Quita acentos (NFD) para que "plántas" y "plantas" coincidan. */
function normalizarTexto(texto) {

    return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


function coincideBusqueda(producto) {

    if (!busquedaActual) return true;

    const texto = normalizarTexto([
        producto.nombre,
        producto.categoria,
        producto.descripcion,
        producto.infoDeVenta.join(" "),
    ].join(" "));

    return normalizarTexto(busquedaActual)
        .split(/\s+/)
        .filter(Boolean)
        .every(palabra => texto.includes(palabra));

}


function categoriasDelCatalogo() {

    return [...new Set(PRODUCTOS.map(producto => producto.categoria))];

}


let indicadorListo = false;


/* Mueve la pastilla del filtro activo a la posicion del boton
   seleccionado. La primera vez no anima (evita que entre deslizandose
   desde la esquina) y despues usa la transicion del CSS. */
function posicionarIndicador() {

    const contenedor = document.getElementById("catalogFilters");
    const indicador = document.getElementById("catalogFilterIndicator");

    if (!contenedor || !indicador) return;

    const activo = contenedor.querySelector(".catalog-filter.activo");

    if (!activo || activo.offsetWidth === 0) {
        contenedor.classList.remove("con-indicador");
        indicador.style.opacity = "0";
        return;
    }

    const sinTransicion = !indicadorListo;

    if (sinTransicion) indicador.style.transition = "none";

    indicador.style.width = activo.offsetWidth + "px";
    indicador.style.height = activo.offsetHeight + "px";
    indicador.style.transform =
        "translate(" + activo.offsetLeft + "px, " + activo.offsetTop + "px)";
    indicador.style.opacity = "1";
    contenedor.classList.add("con-indicador");

    if (sinTransicion) {
        void indicador.offsetWidth;
        indicador.style.transition = "";
        indicadorListo = true;
    }

}


function renderFiltros() {

    const contenedor = document.getElementById("catalogFilters");

    if (!contenedor) return;

    const categorias = categoriasDelCatalogo();

    const botones = [{ valor: "", texto: "Todas" }, ...categorias.map(categoria => ({ valor: categoria, texto: categoria }))];

    contenedor.querySelectorAll(".catalog-filter").forEach(boton => boton.remove());

    contenedor.insertAdjacentHTML("beforeend", botones.map(({ valor, texto }) => `

            <button class="catalog-filter${valor === categoriaActual ? " activo" : ""}"
                type="button" data-categoria="${escaparHTML(valor)}"
                aria-pressed="${valor === categoriaActual}">
                ${escaparHTML(texto)}
            </button>

    `).join(""));

    posicionarIndicador();

}


document.addEventListener("click", function (event) {

    const boton = event.target.closest(".catalog-filter");

    if (!boton) return;

    categoriaActual = boton.dataset.categoria;

    renderFiltros();
    renderCatalog();

});


let productosFiltrados = [];

function tarjetaProducto(producto) {

    return `

            <article class="product-card" data-id="${producto.id}">

                <div class="product-visual">
                    <span class="product-badge">${escaparHTML(producto.categoria)}</span>
                    <img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">
                </div>

                <div class="product-body">
                    <h3 class="product-name">
                        <button class="product-link" type="button" data-id="${producto.id}"
                            aria-haspopup="dialog">
                            ${escaparHTML(producto.nombre)}
                        </button>
                    </h3>

                    <p class="product-desc">${escaparHTML(producto.descripcion)}</p>

                    <div class="product-info-wrap">
                        <div class="product-info">
                            <ul>
                                ${producto.infoDeVenta.map(item => `

                                <li>
                                    <span class="material-symbols-outlined">check_circle</span>
                                    <span>${escaparHTML(item)}</span>
                                </li>

                                `).join("")}

                            </ul>
                        </div>
                    </div>
                </div>

                <div class="product-footer">
                    <span class="product-stock" data-stock="${producto.id}"></span>

                    <div class="product-price">
                        <span class="current">${formatearPrecio(precios[producto.id] ?? producto.precioBase)}</span>
                        <span class="since">precio por unidad</span>
                    </div>

                    <button class="add-cart" type="button" data-id="${producto.id}">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                        Agregar al carrito
                    </button>
                </div>

            </article>

        `;

}

function renderCatalog() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    productosFiltrados = PRODUCTOS.filter(producto =>
        (!categoriaActual || producto.categoria === categoriaActual)
        && coincideBusqueda(producto)
    );

    if (busquedaActual && typeof window.refrescarContadorBuscador === "function") {
        window.refrescarContadorBuscador(productosFiltrados.length);
    }

    if (productosFiltrados.length === 0) {

        const mensaje = `No encontramos productos para "${busquedaActual}".`;

        grid.innerHTML = `

            <p class="catalog-empty">
                ${escaparHTML(mensaje)}
                <button class="catalog-empty-clear" type="button" data-limpiar-busqueda>
                    Limpiar busqueda
                </button>
            </p>

        `;

        return;

    }

    grid.innerHTML = productosFiltrados.map(tarjetaProducto).join("");

    pintarStockEnPantalla();

}


function refrescarContadores(animar) {

    actualizarContador(animar);

    if (!animar) return;

    const link = document.getElementById("cartLinkFloat");

    if (!link) return;

    link.classList.remove("animado");

    /* Reflow: sin esto el navegador junta las dos clases y la animación no corre. */
    void link.offsetWidth;

    link.classList.add("animado");

}

suscribirAlCarrito(function () {

    refrescarContadores(true);

});


document.addEventListener("click", function (event) {

    const button = event.target.closest(".add-cart");

    if (!button) return;

    if (button.closest(".modal-producto")) return;

    agregarProductoAlCarrito(Number(button.dataset.id));

    button.classList.add("added");

    button.innerHTML =
        `<span class="material-symbols-outlined">check</span> ¡Agregado!`;

    setTimeout(() => {
        button.classList.remove("added");
        button.innerHTML =
            `<span class="material-symbols-outlined">add_shopping_cart</span> Agregar al carrito`;
    }, 1400);
});


document.addEventListener("click", function (event) {

    const tarjeta = event.target.closest(".product-card");

    if (tarjeta && !event.target.closest(".add-cart")) {

        window.abrirModalProducto(Number(tarjeta.dataset.id), tarjeta);

    }

});

document.addEventListener("click", function (event) {

    if (event.target.closest("[data-limpiar-busqueda]")) {

        busquedaActual = "";
        renderCatalog();
        actualizarBuscadorHeader();
        return;

    }

});

window.aplicarBusqueda = function (texto) {

    busquedaActual = texto.trim();
    renderCatalog();
    return productosFiltrados.length;

};


function actualizarBuscadorHeader() {

    if (typeof window.refrescarCampoBuscador === "function") {
        window.refrescarCampoBuscador(busquedaActual);
    }

    if (typeof window.enfocarBuscadorHeader === "function") {
        window.enfocarBuscadorHeader();
    }

}


alCargarElCatalogo(function () {

    renderFiltros();
    renderCatalog();
    refrescarContadores(false);

    const contenedor = document.getElementById("catalogFilters");

    if (contenedor && typeof ResizeObserver === "function") {
        new ResizeObserver(posicionarIndicador).observe(contenedor);
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(posicionarIndicador);
    }

    window.addEventListener("resize", posicionarIndicador);

});
