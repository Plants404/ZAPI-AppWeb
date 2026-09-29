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
   actualizarContador y agregarProductoAlCarrito) y de modal.js.
   ========================================================== */


/* ==========================================================
   FILTRAR POR CATEGORÍA
   ------------------------------------------------------------
   Los botones se arman con las categorias que existen en
   PRODUCTOS, no con una lista escrita a mano: asi el filtro
   nunca queda con una categoria sin productos. "Todas" es el
   estado inicial, y volver a esa categoria lo deja vacio.
   ========================================================== */

let categoriaActual = "";


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
                type="button" data-categoria="${valor}"
                aria-pressed="${valor === categoriaActual}">
                ${texto}
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
   RENDERIZAR CATÁLOGO
   ------------------------------------------------------------
   Un article por producto dentro de #productGrid. La
   tarjeta completa es un boton (role, tabindex y
   aria-haspopup) para que se pueda abrir con teclado y los
   lectores de pantalla sepan que abre algo.
   ========================================================== */

function renderCatalog() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    const productos = categoriaActual
        ? PRODUCTOS.filter(producto => producto.categoria === categoriaActual)
        : PRODUCTOS;

    /* El filtro puede dejar la grilla vacia (por ejemplo si se
       borra un producto de esa categoria). Se avisa en vez de
       mostrar un hueco sin explicación. */

    if (productos.length === 0) {

        grid.innerHTML = `

            <p class="catalog-empty">
                Todavia no hay productos en esta categoria.
            </p>

        `;

        return;

    }

    grid.innerHTML = productos.map(producto => {

        return `
            <article class="product-card" data-id="${producto.id}"
                tabindex="0" role="button" aria-haspopup="dialog"
                aria-label="Ver detalle de ${producto.nombre}">
                <div class="product-visual">
                    <span class="product-badge">${producto.categoria}</span>
                    <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">
                </div>
                <div class="product-body">
                    <h3 class="product-name">${producto.nombre}</h3>
                    <p class="product-desc">${producto.descripcion}</p>

                    <div class="product-info-wrap">
                        <div class="product-info">
                            <ul>
                                ${producto.infoDeVenta.map(item => `
                                    <li>
                                        <span class="material-symbols-outlined">check_circle</span>
                                        <span>${item}</span>
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="product-footer">
                    <div class="product-price">
                        <span class="current">${formatearPrecio(precios[producto.id])}</span>
                        <span class="since">precio por unidad</span>
                    </div>
                    <button class="add-cart" type="button" data-id="${producto.id}">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                        Agregar al carrito
                    </button>
                </div>
            </article>
        `;
    }).join("");
}


/* ==========================================================
   AGREGAR AL CARRITO
   ========================================================== */

  /* Sincroniza el contador del botón flotante
     y dispara la animación al sumar un producto.
     El número y el color los pone actualizarContador en
     productos.js, que también usa el chat. */
  function refrescarContadores(animar) {

      actualizarContador(animar);

      if (animar) {

          const link = document.getElementById("cartLinkFloat");

          if (link) {

              link.classList.remove("animado");
              void link.offsetWidth;
              link.classList.add("animado");

          }

      }

  }

  /* El rebote del botón flotante va por suscripción y no
     dentro de agregarProductoAlCarrito porque ese rebote es
     propio del catálogo: el carrito y el chat suman sin él.
     Así, con las dos páginas cargadas en index.html, el
     catálogo se entera igual de las sumas que llegan desde la
     tarjeta de recomendación o desde la ventana de detalle. */

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

document.addEventListener("click", function (event) {

    const tarjeta = event.target.closest(".product-card");

    /* El botón de agregar manda: no abrir el detalle */
    if (tarjeta && !event.target.closest(".add-cart")) {

        window.abrirModalProducto(Number(tarjeta.dataset.id), tarjeta);

    }

});

document.addEventListener("keydown", function (event) {

    /* Teclado sobre la tarjeta enfocada */
    const objetivo = event.target instanceof Element ? event.target : null;

    const tarjeta = objetivo ? objetivo.closest(".product-card") : null;

    if (tarjeta && !objetivo.closest(".add-cart") &&
        (event.key === "Enter" || event.key === " ")) {

        event.preventDefault();
        window.abrirModalProducto(Number(tarjeta.dataset.id), tarjeta);
        return;

    }

});

/* ==========================================================
   INICIALIZAR
   ------------------------------------------------------------
   Se dibujan los filtros y los productos, y se pone el
   contador al dia con lo que ya habia en el carrito (sin
   animarlo: todavia no hizo nada el visitante).
   ========================================================== */

renderFiltros();
renderCatalog();
refrescarContadores(false);
