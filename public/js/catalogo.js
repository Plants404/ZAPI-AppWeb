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
   "Plántas" finds lo mismo. Hay que pasar por NFD porque
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
   SCROLL INFINITO
   ------------------------------------------------------------
   Los productos no se dibujan todos de una vez: entran por lotes
   de PRODUCTOS_POR_LOTE y el lote siguiente se pide cuando el
   centinela (un div vacio debajo de la grilla) entra a pantalla.

   Con los 7 productos que hay hoy y un lote de 6 se ve el
   mecanismo: al cargar aparecen 6 tarjetas y la septima al bajar.
   Cuando el catalogo crezca, esto ya estara hecho y solo va a
   cargar mas. El tamano del lote se cambia en esa constante de
   arriba.

   Por que IntersectionObserver y no un listener de scroll: el
   observer avisa cuando el elemento se ve, no cada vez que se
   mueve un pixel la pagina, asi que no hace falta calcular
   posiciones ni mirando cada scroll.

   Lo que hay que tener cuidado:

   1. Cambiar de filtro o de busqueda vuelve al primer lote. Si
      no, al filtrar por una categoria con 3 productos se
      seguian viendo los que ya habian cargado del filtro anterior.
   2. Mientras se esta pidiendo un lote no se pide otro, para que
      un scroll rapido no carregue tres veces el mismo.
   3. Cuando se terminaron los productos, el observer se
      desconecta. Si no, queda mirando un centinela que nunca mas
      va a disparar y cada filtro nuevo paga el costo de un
      observer vivo.
   4. El aviso con role=status dice cuantos productos hay y que
      se estan cargando mas: quien navega con lector de pantalla no
      tiene forma de saber que el scroll sigue trayendo cosas.
   ========================================================== */

const PRODUCTOS_POR_LOTE = 6;

/* Los productos que pasan el filtro en este momento, y cuantos ya
   se dibujaron. La lista se calcula una vez por render y se
   recorre de a lotes; no se vuelve a filtrar en cada pedido. */
let productosFiltrados = [];
let mostrados = 0;

let centinela = null;
let avisoCatalogo = null;
letObserverScroll = null;
let cargando = false;


function conectarCentinela() {

    if (!centinela || !("IntersectionObserver" in window)) return;

    ObserverScroll = new IntersectionObserver((entradas) => {

        /* Se pide el lote siguiente solo si el centinela esta
           entrando a pantalla. Sin este filtro, tambien saltaria
           la primera vez que no hay nada que cargar. */
        if (entradas.some(entrada => entrada.isIntersecting)) {

            cargarMas();

        }

    }, {

        /* rootMargin carga antes de que el centinela llegue
           exactamente a la pantalla: si no, la primera tanda se
           ve y recien ahi se empieza a pedir la segunda, y en una
           pagina rapida se nota el tiron. */
        rootMargin: "200px 0px",

    });

    ObserverScroll.observe(centinela);

}


/* Dibuja el siguiente lote. Si ya se-Endaron todos los productos,
   desconecta el observer y no hace nada mas. */

function cargarMas() {

    if (cargando) return;

    if (mostrados >= productosFiltrados.length) {

        if (ObserverScroll) {

            ObserverScroll.disconnect();
            ObserverScroll = null;

        }

        return;

    }

    cargando = true;

    const lote = productosFiltrados.slice(mostrados, mostrados + PRODUCTOS_POR_LOTE);

    mostrados += lote.length;

    agregarTarjetas(lote);

    /* Con el ultimo lote se suelta el observer: ya no hay nada
       mas que cargar y el listener no hace falta. */
    if (mostrados >= productosFiltrados.length && ObserverScroll) {

        ObserverScroll.disconnect();
        ObserverScroll = null;

    }

    /* El contador del buscador cuenta las tarjetas de verdad, asi
       que hay que avisarle que la grilla cambio. */
    if (typeof window.aplicarBusqueda === "function" && busquedaActual) {

        window.aplicarBusqueda(busquedaActual, { mantenerScroll: true });

    }

    if (avisoCatalogo) {

        const quedan = productosFiltrados.length - mostrados;

        avisoCatalogo.textContent = quedan === 0
            ? "Se/licreron los " + mostrados + " productos de la categoria."
            : "Cargando mas productos. Van " + mostrados + " de " +
              productosFiltrados.length + ".";

    }

    cargando = false;

}


/* El HTML de una tarjeta. Vive en su propia funcion porque ahora
   la escribe el render inicial y tambien cada lote del scroll
   infinito: antes estaba metido dentro de renderCatalog. */

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

}

/* Dibuja las tarjetas de un lote. Van con += y no con = porque el
   scroll infinito va sumando al final de lo que ya esta: si se
   reemplazara el innerHTML se perderian los lotes anteriores. El
   primer += sobre una grilla vacia es igual que un =. */

function agregarTarjetas(lote) {

    const grid = document.getElementById("productGrid");

    if (!grid || !lote.length) return;

    grid.insertAdjacentHTML("beforeend", lote.map(tarjetaProducto).join(""));

}


/* ==========================================================
   RENDERIZAR CATÁLOGO
   ------------------------------------------------------------
   Un article por producto dentro de #productGrid. Solo se
   dibuja el primer lote: los demas llegan por scroll infinito.

   Al cambiar de filtro o de busqueda esto vuelve a arrancar
   desde cero: se suelta el observer viejo, se recalcula la
   lista y se dibuja el primer lote.
   ========================================================== */

function renderCatalog() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    /* Cada render arranca de nuevo. Si el observer del filtro
       anterior sigue vivo, dispara sobre una grilla que ya no
       tiene nada que ver con el. */
    if (observerScroll) {

        observerScroll.disconnect();
        observerScroll = null;

    }

    productosFiltrados = PRODUCTOS.filter(producto =>
        (!categoriaActual || producto.categoria === categoriaActual)
        && coincideBusqueda(producto)
    );

    mostrados = 0;
    cargando = false;

    /* El filtro puede dejar la grilla vacia: por una categoria
       sin productos, o porque el texto buscado no coincide con
       nada. Son dos motivos distintos y el mensaje va distinto,
       con un atajo para limpiar solo la causa. */

    if (productosFiltrados.length === 0) {

        const buscando = busquedaActual.length > 0;
        const conCategoria = categoriaActual.length > 0;

        let mensaje = "Todavia no hay productos en esta categoria.";

        /* sugerencia es HTML a proposito: es el boton que limpia la
           causa. mensaje es texto y se escapa recien al escribirlo,
           no al armarlo, para que el escapado se vea en el mismo
           lugar donde se inserta. */
        let sugerencia = "";

        if (buscando) {
            mensaje = `No encontramos productos para "${busquedaActual}".`;
            sugerencia = `
                <button class="catalog-empty-clear" type="button" data-limpiar-busqueda>
                    Limpiar busqueda
                </button>`;
        } else if (conCategoria) {
            sugerencia = `
                <button class="catalog-empty-clear" type="button" data-ver-todas>
                    Ver todas las categorias
                </button>`;
        }

        grid.innerHTML = `

            <p class="catalog-empty">
                ${escaparHTML(mensaje)}
                ${sugerencia}
            </p>

        `;

        if (avisoCatalogo) avisoCatalogo.textContent = "";

        return;

    }

    grid.innerHTML = "";

    cargarMas();

    /* Si ya se dibujo todo en el primer lote no hay nada que
       esperar con scroll: el observer no llega a hacer falta. */
    if (mostrados < productosFiltrados.length) {

        conectarCentinela();

    }

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

/* Los botones de "Limpiar busqueda" y "Ver todas las
   categorias" que aparecen cuando el filtro deja la grilla
   vacia. Se atienden por delegacion porque los dos botones
   se dibujan dentro del innerHTML de renderCatalog. */

document.addEventListener("click", function (event) {

    if (event.target.closest("[data-limpiar-busqueda]")) {

        busquedaActual = "";
        renderCatalog();
        actualizarBuscadorHeader();
        return;

    }

    if (event.target.closest("[data-ver-todas]")) {

        categoriaActual = "";
        renderFiltros();
        renderCatalog();

    }

});

/* Cuantos productos hay visibles ahora. Con el scroll infinito
   esto es menor que el total: dice cuantas tarjetas hay
   dibujadas de verdad, que es lo que se ve. */

function productosVisibles() {

    return document.querySelectorAll("#productGrid .product-card").length;

}

/* El buscador del header y el filtro de catalogo comparten el
   texto. este es el punto de entrada que usa buscador.js: deja el
   estado, redibuja y avisa. Devuelve cuantos quedaron, que
   es lo que buscador.js lee para el aria-live.

   Con el scroll infinito, avisa cuantos HAY (productosFiltrados),
   no cuantos estan dibujados: si no, al escribir "cactus" se
   anunciaria "1 producto" y al terminar de cargar el resto se
   anunciaria otra vez con el numero real. mantenerScroll evita que
   un filtro repetido salte al inicio de la pagina mientras la
   persona esta leyendo mas abajo. */

window.aplicarBusqueda = function (texto, opciones) {

    busquedaActual = texto.trim();
    renderCatalog();

    if (!opciones || !opciones.mantenerScroll) {

        window.scrollTo({ top: 0, behavior: "smooth" });

    }

    return productosFiltrados.length;

};


/* El boton "limpiar" del header vacia el campo por lo mismo que
   el atajo del estado vacio, pero ademas devuelve el foco al
   input, que desde el boton se ha ido. */

function actualizarBuscadorHeader() {

    if (typeof window.refrescarCampoBuscador === "function") {
        window.refrescarCampoBuscador(busquedaActual);
    }

}


/* ==========================================================
   INICIALIZAR
   ------------------------------------------------------------
   Se dibujan los filtros y los productos, y se pone el
   contador al dia con lo que ya habia en el carrito (sin
   animarlo: todavia no hizo nada el visitante).
   ========================================================== */

/* El centinela y el aviso se buscan una vez: son los mismos para
   todos los lotes y para todos los filtros. Si no estan (por
   ejemplo porque la grilla se copio en una pagina que no los
   tiene) el scroll infinito no arranca, pero la grilla sigue
   mostrando los productos del primer lote. */

centinela = document.querySelector("[data-centinela]");
avisoCatalogo = document.querySelector("[data-catalogo-aviso]");

renderFiltros();
renderCatalog();
refrescarContadores(false);
