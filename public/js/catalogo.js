/* ==========================================================
   CATÁLOGO ZAPI
   ------------------------------------------------------------
   Dibuja las tarjetas de producto, las agrega al carrito,
   actualiza el contador flotante y abre la ventana de detalle
   al tocar una tarjeta.

   La suma y el guardado del carrito viven en productos.js, que
   es el unico que escribe en "zapiCart". Aca solo se decide que
   tarjetas se dibujan y que filtro esta activo.

   Depende de productos.js (PRODUCTOS, precios, formatearPrecio,
   actualizarContador, agregarProductoAlCarrito y
   alCargarElCatalogo) y de modal.js.

   PRODUCTOS llega con un fetch, asi que la grilla no se dibuja al
   cargar el script sino cuando el catalogo esta: ver el bloque
   INICIALIZAR, al final.
   ========================================================== */


/* ==========================================================
   FILTRAR POR CATEGORÍA Y POR TEXTO
   ------------------------------------------------------------
   Los botones se arman con las categorias que existen en
   PRODUCTOS, no con una lista escrita a mano: asi el filtro
   nunca queda con una categoria sin productos. "Todas" es el
   estado inicial, y volver a esa categoria lo deja vacio.

   El texto viene del buscador del header (buscador.js) y se
   combina con la categoria: los dos filtros se aplican juntos,
   no uno en lugar del otro.
   ========================================================== */

let categoriaActual = "";
let busquedaActual = "";


/* Quita acentos y pasa a minuscula, para que "plantas" y
   "Plántas" encuentren lo mismo. Hay que pasar por NFD porque
   solo con toLowerCase el acento queda pegado a la letra. */

function normalizarTexto(texto) {

    return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


/* Un producto entra si pasa los dos filtros. Todos los campos
   de texto van juntos en una sola cadena y se busca dentro, para
   que "kit cactus" encuentre el kit de cactus sin tener que
   adivinar en que campo estaba cada palabra. */

function coincideBusqueda(producto) {

    if (!busquedaActual) return true;

    const texto = normalizarTexto([
        producto.nombre,
        producto.categoria,
        producto.descripcion,
        producto.infoDeVenta.join(" "),
    ].join(" "));

    /* Todas las palabras tiene que aparecer. Asi "kit cactus"
       no trae el kit de huerta, que solo coincide con "kit". */
    return normalizarTexto(busquedaActual)
        .split(/\s+/)
        .filter(Boolean)
        .every(palabra => texto.includes(palabra));

}


/* Devuelve las categorias presentes en el catalogo, sin
   repetir y en el orden en que aparecen los productos. */

function categoriasDelCatalogo() {

    return [...new Set(PRODUCTOS.map(producto => producto.categoria))];

}


function renderFiltros() {

    const contenedor = document.getElementById("catalogFilters");

    if (!contenedor) return;

    const categorias = categoriasDelCatalogo();

    const botones = [{ valor: "", texto: "Todas" }, ...categorias.map(categoria => ({ valor: categoria, texto: categoria }))];

    contenedor.innerHTML = botones.map(({ valor, texto }) => `

            <button class="catalog-filter${valor === categoriaActual ? " activo" : ""}"
                type="button" data-categoria="${escaparHTML(valor)}"
                aria-pressed="${valor === categoriaActual}">
                ${escaparHTML(texto)}
            </button>

    `).join("");

}


document.addEventListener("click", function (event) {

    const boton = event.target.closest(".catalog-filter");

    if (!boton) return;

    categoriaActual = boton.dataset.categoria;

    renderFiltros();
    renderCatalog();

});


/* ==========================================================
   CATALOGO COMPLETO, SIN SCROLL
   ------------------------------------------------------------
   Los productos se dibujan todos de una vez. Antes entraban por
   lotes de 6, pedidos con un IntersectionObserver sobre un div
   vacio debajo de la grilla, y con masonry las columnas quedaban
   desparejas: cada tarjeta iba con left/top a la columna mas corta
   y las columnas terminaban en alturas distintas.

   Ahora las tarjetas van en el flujo normal y las coloca el grid
   del CSS, que las estira a la misma altura dentro de cada fila.
   No hay nada que medir, nada que recolocar y nada que observar:
   si el catalogo tiene 300 productos, se dibujan los 300.

   Lo que queda de estado es solo la lista ya filtrada. El aviso de
   cantidad lo pone buscador.js, que es quien sabe cuando cambio el
   filtro.
   ========================================================== */

let productosFiltrados = [];

/* El HTML de una tarjeta. Vive en su propia funcion porque la
   dibuja mas de una vez por render: todas las que pasan el filtro
   activo, cada vez que se cambia la categoria o la busqueda. Antes
   era el segundo trabajo de renderCatalog, que ademas la escribia de
   a un lote para el scroll infinito. */
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

/* ==========================================================
   RENDERIZAR CATÁLOGO
   ------------------------------------------------------------
   Un article por producto dentro de #productGrid, todos de una
   vez. Antes se dibujaba solo el primer lote y el resto llegaba al
   hacer scroll; ahora la grilla se arma entera cada vez que cambia
   la categoria o la busqueda.

   No hace falta colocar las tarjetas a mano ni esperar a que se
   carguen las imagenes: van en el flujo y el grid del CSS las
   ordena y las estira a la misma altura de su fila.
   ========================================================== */

function renderCatalog() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    productosFiltrados = PRODUCTOS.filter(producto =>
        (!categoriaActual || producto.categoria === categoriaActual)
        && coincideBusqueda(producto)
    );

    /* Si hay una busqueda puesta, el contador del header tiene que
       seguir al filtro. Antes lo actualizaba cada lote del scroll
       infinito; ahora alcanza con una vez por render, y de paso se
       corrige el caso de elegir una categoria con una busqueda
       activa: el aviso queda en el total nuevo y no en el viejo.

       Con busqueda vacia no se toca: el aviso se llama solo cuando
       hay algo escrito, y hay que dejarlo como esta. */
    if (busquedaActual && typeof window.refrescarContadorBuscador === "function") {
        window.refrescarContadorBuscador(productosFiltrados.length);
    }

    /* El filtro puede dejar la grilla vacia, y solo por una causa:
       que el texto buscado no coincida con nada. Los botones de
       categoria se arman a partir de los productos que existen, asi
       que elegir una categoria nunca puede dejarla vacia sola.

       El atajo va dentro del propio mensaje: quien esta escribiendo
       en el buscador ve el campo del header a mano, pero quien llego
       hasta aqui con el scroll bajo puede no mirar arriba. */

    if (productosFiltrados.length === 0) {

        /* mensaje se arma aparte y se escapa recien al escribirlo,
           no al armarlo: asi el escapado se ve en el mismo lugar
           donde se inserta y el verificador puede comprobarlo. */
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

}


/* ==========================================================
   AGREGAR AL CARRITO
   ========================================================== */

/* Sincroniza el contador del boton flotante y dispara la
   animacion al sumar un producto. El numero y el color los pone
   actualizarContador en productos.js, que tambien usa el chat. */

function refrescarContadores(animar) {

    actualizarContador(animar);

    if (!animar) return;

    const link = document.getElementById("cartLinkFloat");

    if (!link) return;

    link.classList.remove("animado");

    /* Lee el ancho para forzar el reflow: sin esto el navegador
       junta las dos clases y la animacion no corre. */
    void link.offsetWidth;

    link.classList.add("animado");

}

/* El rebote del boton flotante va por suscripcion y no dentro de
   agregarProductoAlCarrito porque ese rebote es propio del
   catalogo: el carrito y el chat suman sin el. Asi, con las dos
   paginas cargadas en index.html, el catalogo se entera igual de
   las sumas que llegan desde la tarjeta de recomendacion o desde
   la ventana de detalle. */

suscribirAlCarrito(function () {

    refrescarContadores(true);

});


/* Boton "Agregar al carrito" de la tarjeta.
   Suma el producto, avisa con un visto y devuelve el boton a
   su texto original a los 1,4 segundos, por si se quiere
   sumar el mismo producto otra vez. */

document.addEventListener("click", function (event) {

    const button = event.target.closest(".add-cart");

    if (!button) return;

    /* El boton de la ventana flotante lo lleva productos.js,
       que es el unico que escucha "modal:agregar": si se
       atendiera tambien aqui se sumaria dos veces. */

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


/* ==========================================================
   ABRIR LA VENTANA FLOTANTE DESDE UNA TARJETA
   El mecanismo esta en modal.js; aqui solo se decide que
   tarjetas lo abren y que hace cada pagina al agregar.
   ========================================================== */

/* La tarjeta ya no es un boton: el nombre del producto es el
   boton de verdad. Antes el <article> tenia role="button" y
   contenia otro <button> para agregar, o sea un boton dentro de
   un boton: los lectores de pantalla lo anunciaban mal y con
   teclado habia que tabular dos veces para llegar al agregar.

   Se mantiene el clic en cualquier parte de la tarjeta, porque
   es lo que la gente espera de una grilla, pero el control
   accesible y enfocable es el del nombre. */
document.addEventListener("click", function (event) {

    const tarjeta = event.target.closest(".product-card");

    /* El botón de agregar manda: no abrir el detalle */
    if (tarjeta && !event.target.closest(".add-cart")) {

        window.abrirModalProducto(Number(tarjeta.dataset.id), tarjeta);

    }

});

/* El boton de "Limpiar busqueda" que aparece cuando el filtro deja
   la grilla vacia. Se atiende por delegacion porque se dibuja
   dentro del innerHTML de renderCatalog. Al pulsarlo el boton
   desaparece (la grilla se redibuja), por eso despues se le
   devuelve el foco al campo del header. */

document.addEventListener("click", function (event) {

    if (event.target.closest("[data-limpiar-busqueda]")) {

        busquedaActual = "";
        renderCatalog();
        actualizarBuscadorHeader();
        return;

    }

});

/* El buscador del header y el filtro de catalogo comparten el
   texto. este es el punto de entrada que usa buscador.js: deja el
   estado, redibuja y avisa. Devuelve cuantos quedaron, que
   es lo que buscador.js lee para el aria-live. */

window.aplicarBusqueda = function (texto) {

    busquedaActual = texto.trim();
    renderCatalog();
    return productosFiltrados.length;

};


/* Sincroniza el campo del header con el estado del filtro y le
   devuelve el foco.

   El atajo de "Limpiar busqueda" vive dentro de la grilla, y la
   grilla se redibuja al limpiar: el boton desaparece de debajo del
   foco, y sin esto el siguiente tab se pierde en el principio de la
   pagina. El boton del header no lo necesita, porque vive en otro
   lado de la pagina y no se borra al filtrar. */

function actualizarBuscadorHeader() {

    if (typeof window.refrescarCampoBuscador === "function") {
        window.refrescarCampoBuscador(busquedaActual);
    }

    if (typeof window.enfocarBuscadorHeader === "function") {
        window.enfocarBuscadorHeader();
    }

}


/* ==========================================================
   INICIALIZAR
   ------------------------------------------------------------
   Se dibujan los filtros y los productos, y se pone el
   contador al dia con lo que ya habia en el carrito (sin
   animarlo: todavia no hizo nada el visitante).

   Todo esto va dentro de alCargarElCatalogo porque el catalogo ya
   no viene en el script: llega con un fetch desde
   public/data/productos.json. Al arrancar todavia esta vacio, y
   dibujar con la lista vacia daria una grilla sin filtros y con el
   mensaje de "no encontramos productos", que es exactamente lo que
   el visitante no debe ver.

   No hay nada que observar ni que esperar despues: las tarjetas van
   en el flujo y el navegador las coloca. Por eso el catalogo tambien
   funciona igual si arranca con la seccion oculta, que era el
   caso que el masonry no podia cubrir.
   ========================================================== */

alCargarElCatalogo(function () {

    renderFiltros();
    renderCatalog();
    refrescarContadores(false);

});
