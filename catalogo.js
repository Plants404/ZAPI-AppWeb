/* ==========================================================
   CATÁLOGO ZAPI
   ------------------------------------------------------------
   Página de catálogo: arma las tarjetas de producto, las
   agrega al carrito, actualiza el contador flotante y abre
   la ventana de detalle al tocar una tarjeta.

   Guarda en localStorage lo mismo que el carrito
   ({id, precio, cantidad}); de los datos mas rico se
   encarga el listener de "modal:agregar" de abajo.

   Depende de productos.js (PRODUCTOS, precios,
   formatearPrecio y actualizarContador) y de modal.js.
   catalogo.html los carga en ese orden.
   ========================================================== */


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

    grid.innerHTML = PRODUCTOS.map(producto => {

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

  /* El "pop" de al sumar lo pone sonidoAgregar, en productos.js,
     que es donde vive ahora. Ver la seccion CONFIRMACION SONORA
     de ese archivo. */

  function agregarAlCarrito(id) {

    const producto = PRODUCTOS.find(p => p.id == id);

    if (!producto) return;

    let carrito = obtenerCarrito();

    const existente = carrito.find(item => item.id == id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            categoria: producto.categoria,
            imagen: producto.imagen,
            precio: precios[producto.id],
            cantidad: 1
        });
    }

      guardarCarrito(carrito);
      refrescarContadores(true);
      sonidoAgregar();
  }


/* Boton "Agregar al carrito" de la tarjeta.
   Suma el producto, avisa con un visto y devuelve el boton a
   su texto original a los 1,4 segundos, por si se quiere
   sumar el mismo producto otra vez. */

document.addEventListener("click", function (event) {

    const button = event.target.closest(".add-cart");

    if (!button) return;

    /* El boton de la ventana flotante lo lleva modal.js:
       si se atendiera aqui se sumaria dos veces. */

    if (button.closest(".modal-producto")) return;

    agregarAlCarrito(Number(button.dataset.id));

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

/* Al agregar desde la ventana flotante, esta pagina
   suma el producto con su sonido y actualiza el contador. */

document.addEventListener("modal:agregar", function (event) {

    agregarAlCarrito(event.detail.id);

});

/* ==========================================================
   INICIALIZAR
   ------------------------------------------------------------
   Se dibujan los productos y se pone el contador al dia con
   lo que ya habia en el carrito (sin animarlo: todavia no
   hizo nada el visitante).
   ========================================================== */

renderCatalog();
refrescarContadores(false);
