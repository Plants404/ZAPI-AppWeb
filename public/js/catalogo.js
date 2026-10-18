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

    /* Los chips se construyen una sola vez: si ya existen, solo se
       actualiza su estado. Asi el foco del teclado no se pierde al
       alternar categorias (antes se recreaban en cada clic). */
    if (contenedor.querySelector(".catalog-filter")) {

        actualizarEstadoFiltros();
        return;

    }

    const categorias = categoriasDelCatalogo();

    const botones = [{ valor: "", texto: "Todas" }, ...categorias.map(categoria => ({ valor: categoria, texto: categoria }))];

    contenedor.insertAdjacentHTML("beforeend", botones.map(({ valor, texto }) => `

            <button class="catalog-filter${valor === categoriaActual ? " activo" : ""}"
                type="button" data-categoria="${escaparHTML(valor)}"
                aria-pressed="${valor === categoriaActual}">
                ${escaparHTML(texto)}
            </button>

    `).join(""));

    actualizarEstadoFiltros();

}


function actualizarEstadoFiltros() {

    const contenedor = document.getElementById("catalogFilters");

    if (!contenedor) return;

    contenedor.querySelectorAll(".catalog-filter").forEach(boton => {

        const activo = boton.dataset.categoria === categoriaActual;

        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));

    });

    posicionarIndicador();

}


/* Centra el chip activo dentro del riel deslizable sin marear a quien
   pidio menos movimiento. */
function centrarFiltro(boton) {

    if (!boton || typeof boton.scrollIntoView !== "function") return;

    const sinMovimiento = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    boton.scrollIntoView({
        behavior: sinMovimiento ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
    });

}


document.addEventListener("click", function (event) {

    const boton = event.target.closest(".catalog-filter");

    if (!boton) return;

    categoriaActual = boton.dataset.categoria;

    actualizarEstadoFiltros();
    renderCatalog();
    centrarFiltro(boton);

});


let productosFiltrados = [];

function tarjetaProducto(producto) {

    const beneficio = producto.infoDeVenta && producto.infoDeVenta[0] ? producto.infoDeVenta[0] : "";

    return `

            <article class="product-card" data-id="${producto.id}">

                <div class="product-visual">
                    <img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">
                    <div class="product-beneficios-lista">
                        ${producto.infoDeVenta.map(item => `
                            <div class="product-beneficio-item">
                                <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                                <span>${escaparHTML(item)}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="product-body">
                    <h3 class="product-name">
                        <button class="product-link" type="button" data-id="${producto.id}"
                            aria-haspopup="dialog">
                            ${escaparHTML(producto.nombre)}
                        </button>
                    </h3>

                    <div class="product-tags">
                        <span class="product-badge">${escaparHTML(producto.categoria)}</span>
                        <span class="product-stock-pill" data-stock="${producto.id}"></span>
                    </div>

                    <p class="product-desc">${escaparHTML(producto.descripcion)}</p>

                    <div class="product-benefit">
                        <span class="benefit-icon" aria-hidden="true">✓</span>
                        <span>${escaparHTML(beneficio)}</span>
                    </div>
                </div>

                <div class="product-footer">
                    <div class="product-price">
                        <span class="current">${formatearPrecio(precios[producto.id] ?? producto.precioBase)}</span>
                    </div>
                    <button class="add-cart" type="button" data-id="${producto.id}">
                        <span class="material-symbols-outlined">shopping_cart</span>
                        Agregar al carrito
                    </button>
                </div>

            </article>

        `;

}

/* Se expone el constructor de tarjetas para reutilizar las originales
   fuera del catalogo (carrusel de Inicio) con diseno identico. */
window.tarjetaProducto = tarjetaProducto;

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

        const mensaje = busquedaActual
            ? `No encontramos productos para "${busquedaActual}".`
            : "No hay productos en esta categoría por ahora.";

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

    /* Si se vuelve a tocar antes de que termine el mensaje, se reinicia
       el temporizador en vez de acumular varios. */
    clearTimeout(button._resetTimer);

    button._resetTimer = setTimeout(() => {
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


/* Mide el header y la barra de filtros reales y los publica en las
   variables CSS. Asi la barra se pega exactamente al borde inferior del
   header en cualquier ancho, sin dejar hueco ni quedar tapada. */
function sincronizarAlturasSticky() {

    const root = document.documentElement;

    const header = document.querySelector("header");

    if (header) {

        root.style.setProperty(
            "--header-h",
            Math.round(header.getBoundingClientRect().height) + "px"
        );

    }

    const filterbar = document.querySelector(".catalog-filterbar");

    if (filterbar) {

        root.style.setProperty(
            "--filterbar-h",
            Math.round(filterbar.getBoundingClientRect().height) + "px"
        );

    }

}


alCargarElCatalogo(function () {

    renderFiltros();
    renderCatalog();
    refrescarContadores(false);

    const contenedor = document.getElementById("catalogFilters");
    const header = document.querySelector("header");
    const filterbar = document.querySelector(".catalog-filterbar");

    /* Una sola medicion por cuadro: agrupa resize, cambios de tamano de
       header/riel y fuentes listas en un mismo requestAnimationFrame. */
    let pendiente = false;

    function programarMedicion() {

        if (pendiente) return;

        pendiente = true;

        requestAnimationFrame(() => {

            pendiente = false;

            sincronizarAlturasSticky();
            posicionarIndicador();

        });

    }

    if (typeof ResizeObserver === "function") {

        const observador = new ResizeObserver(programarMedicion);

        if (contenedor) observador.observe(contenedor);
        if (header) observador.observe(header);
        if (filterbar) observador.observe(filterbar);

    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(programarMedicion);
    }

    window.addEventListener("resize", programarMedicion);
    window.addEventListener("orientationchange", programarMedicion);

    /* Primera medicion sincronica para evitar el salto inicial. */
    sincronizarAlturasSticky();

});
