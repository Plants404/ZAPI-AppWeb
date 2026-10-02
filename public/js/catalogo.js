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
       un scroll rapido no cargue tres veces el mismo.
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
let observerScroll = null;
let cargando = false;


function conectarCentinela() {

    if (!centinela || !("IntersectionObserver" in window)) return;

    observerScroll = new IntersectionObserver((entradas) => {

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

    observerScroll.observe(centinela);

}


/* Dibuja el siguiente lote. Si ya se dibujaron todos los productos,
   desconecta el observer y no hace nada mas. */

/* Suelta el observer. Se llama desde los dos momentos en que ya no
   queda nada que cargar: cuando se entra a cargarMas y la lista ya
   esta agotada, y cuando el lote recien dibujado fue el ultimo. */

function desconectarCentinela() {

    if (!observerScroll) return;

    observerScroll.disconnect();
    observerScroll = null;

}


function cargarMas() {

    if (cargando) return;

    if (mostrados >= productosFiltrados.length) {

        desconectarCentinela();
        return;

    }

    cargando = true;

    const lote = productosFiltrados.slice(mostrados, mostrados + PRODUCTOS_POR_LOTE);

    mostrados += lote.length;

    agregarTarjetas(lote);

    /* Con el ultimo lote no queda nada que esperar: si la lista
       entera entra en el primer lote, el observer ni se llega a
       conectar. */
    if (mostrados >= productosFiltrados.length) {

        desconectarCentinela();

    }

    /* Si hay algo escrito en el buscador, su aviso dice cuantos
       productos hay. El total no cambia al cargar lotes, pero el
       aviso se reescribe igual para que no quede desfasado si en
       el meantime se toco el filtro. */
    if (typeof window.refrescarContadorBuscador === "function" && busquedaActual) {

        window.refrescarContadorBuscador(productosFiltrados.length);

    }

    if (avisoCatalogo) {

        const quedan = productosFiltrados.length - mostrados;
        const palabra = mostrados === 1 ? "producto" : "productos";

        avisoCatalogo.textContent = quedan === 0
            ? `Mostrando ${mostrados} ${palabra} de la categoría.`
            : `Cargando más productos. Van ${mostrados} de ` +
              `${productosFiltrados.length}.`;

    }

    cargando = false;

}


/* ==========================================================
   MASONRY: COLUMNAS ASIMETRICAS
   ------------------------------------------------------------
   El flex de .catalog-grid pone todas las tarjetas de una fila
   en el mismo alto, asi que al pie de cada tarjeta queda el
   escalon de la mas corta. Masonry reparte cada tarjeta en la
   columna que menos alto lleva y las columnas quedan desparejas.

   Como se hace:

   1. Se mide el ancho de la columna segun el ancho del
      contenedor y se escribe en la tarjeta. El ancho va primero
      porque el alto se mide con la tarjeta ya angosta.
   2. Cada tarjeta va a la columna mas corta, con left/top.
   3. Al final se le pone a la grilla el alto de la columna mas
      alta. Sin eso el contenedor se quedaria sin alto (todas las
      tarjetas estan en posicion absoluta) y el centinela del
      scroll infinito quedaria pegado al inicio de la pagina.

   Lo que lo hace compatible con el scroll infinito: al llegar un
   lote solo se acomodan las tarjetas nuevas, sin volver a tocar
   las de antes. Por eso cada tarjeta lleva su data-columna (para
   saber si ya esta colocada) y las alturas de columna se guardan
   en alturasColumnas entre lote y lote. Si al agregar se
   recolocaran todas, cada tanda de productos correria lo que hay
   arriba mientras el visitante lo esta leyendo.

   ========================================================== */

/* El ancho de columna se calcula aca, pero el hueco sale del CSS.
   Leerlo del gap evita tener el 1.5rem escrito en dos lugares: si
   un dia se cambia el gap, el masonry se entera solo. */
let separacionMasonry = 24;

/* Alto acumulado de cada columna. El ultimo elemento de cada
   lista es donde llega la siguiente tarjeta de esa columna. */
let alturasColumnas = [];

function separacionDeLaGrilla() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    const gap = parseFloat(window.getComputedStyle(grid).rowGap);

    if (gap > 0) separacionMasonry = gap;

}


/* Cuantas columnas entran. El corte se lee del ancho de la ventana y
   no del ancho de la grilla, a proposito: los cortes del CSS son
   @media, que miden la ventana. Si aca se midiera la grilla, que es
   mas angosta por el padding del contenedor, en una ventana de 900px
   se contarian 3 columnas (grilla de 852px) donde el flex de mas
   arriba pone 2, y el acomodo cambiaria justo al cargar el script. */
function columnasSegunAncho() {

    const ancho = window.innerWidth;

    if (ancho < 572) return 1;
    if (ancho < 846) return 2;
    if (ancho < 1120) return 3;
    return 4;

}


/* Deja la grilla como estaba antes de masonry. Se llama cuando se
   cambia de filtro (la grilla se vacia) y cuando no hay nada que
   mostrar, para que el mensaje de estado vacio no quede con el
   alto de la tanda anterior debajo. */
function reiniciarMasonry() {

    alturasColumnas = [];

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    grid.classList.remove("es-masonry");
    grid.style.height = "";

}


/* Coloca las tarjetas que se le pasan, cada una en la columna mas
   corta, y deja la grilla con el alto de la columna mas alta.

   animar va solo para las tarjetas que acaban de llegar: cuando se
   recoloca todo por un cambio de ancho, las que ya estaban en
   pantalla no tienen por que volver a aparecer. */
function acomodarMasonry(tarjetas, animar) {

    const grid = document.getElementById("productGrid");

    if (!grid || !tarjetas.length) return;

    /* En la home la seccion del catalogo arranca oculta, y ahi la
       grilla tiene ancho 0. Medir en ese estado daria tarjetas de
       ancho 0 (con el texto partido letra por letra, y unos altos
       enormes) que ya no se corrigen solos. Se dejan sin colocar, sin
       quitarles el ancho, y las acomoda el observador de la grilla
       cuando la seccion se muestra. */
    if (grid.clientWidth === 0) return;

    /* La clase se pone antes de medir: si no, las tarjetas siguen
       en el flujo del flex y no tendrian el ancho de columna. */
    grid.classList.add("es-masonry");

    const separacion = separacionMasonry;
    const columnas = columnasSegunAncho();
    const ancho = (grid.clientWidth - separacion * (columnas - 1)) / columnas;

    /* Si cambio el numero de columnas (se giro la ventana) se
       arranca de cero: si no, las columnas conservarian el alto
       de la ronda anterior y las tarjetas nuevas quedarian
       descolgadas. */
    if (alturasColumnas.length !== columnas) {

        alturasColumnas = new Array(columnas).fill(0);

    }

    for (const tarjeta of tarjetas) {

        tarjeta.style.width = ancho + "px";

        /* La columna mas corta. El medio pixel de margen evita que
           una diferencia que no se ve haga cambiar de columna en
           cada tanda, que se lee como un acomodo que titila. */
        let columna = 0;

        for (let i = 1; i < alturasColumnas.length; i++) {

            if (alturasColumnas[i] < alturasColumnas[columna] - 0.5) columna = i;

        }

        /* El alto se mide recien con el ancho puesto, y recien
           antes de escribir la posicion: leer el alto escribe el
           ancho, y escribir top tambien invalida la medida. */
        const alto = tarjeta.offsetHeight;

        tarjeta.style.left = (columna * (ancho + separacion)) + "px";
        tarjeta.style.top = alturasColumnas[columna] + "px";

        alturasColumnas[columna] += alto + separacion;

        tarjeta.dataset.columna = columna;

        if (animar) animarEntrada(tarjeta);

    }

    grid.style.height = (Math.max(...alturasColumnas) - separacion) + "px";

}


/* Las tarjetas que llegan por scroll aparecen en vez de caer de
   golpe. La clase se saca sola al terminar la animacion y no se
   deja puesta: con "both" el transform de la animacion le gana al
   del hover, y la tarjeta dejaria de levantarse al pasar el mouse.
   El CSS ademas lo cubre con "backwards", asi que si la clase se
   queda por ahi el hover tampoco se rompe: esta es la red de
   seguridad.

   Con reduced motion no hay animacion que ejecutar, y la clase no
   se pone. */
function animarEntrada(tarjeta) {

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    tarjeta.classList.add("llega");

    tarjeta.addEventListener("animationend", function () {

        tarjeta.classList.remove("llega");

    }, { once: true });

    /* animationend no siempre llega: si la pestana estaba en
       segundo plano, si el navegador la pausa, o si el elemento
       se quedo sin pintar. Se saca igual al pasar el tiempo de la
       animacion, que para entonces ya termino. */
    setTimeout(function () {

        tarjeta.classList.remove("llega");

    }, 700);

}


/* Recoloca todas las tarjetas. Se usa cuando cambia el ancho de la
   ventana, cuando se muestra la seccion del catalogo y cuando una
   tarjeta cambia de alto. */
function relayoutMasonry() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    const tarjetas = [...grid.querySelectorAll(".product-card")];

    /* Sin tarjetas no hay nada que colocar. Ojo que aqui no se mira
       si la grilla tiene la clase de masonry: en la home se llama
       justamente para ponerla, porque las tarjetas quedaron sin
       colocar cuando la seccion estaba oculta. El estado vacio no
       pasa por aca porque no tiene tarjetas. */
    if (!tarjetas.length) return;

    /* Y el ancho se mira ANTES de tocar nada. Si la seccion se
       ocultó despues del ultimo acomodo, este recolocado no tendria
       forma de terminar: se quedarian las tarjetas sin columna, la
       clase puesta y el alto viejo. Con la guarda, una seccion
       oculta conserva el acomodo que ya tenia, que es el correcto. */
    if (grid.clientWidth === 0) return;

    alturasColumnas = [];

    for (const tarjeta of tarjetas) {

        tarjeta.removeAttribute("data-columna");

    }

    acomodarMasonry(tarjetas);

}


/* Al redimensionar a mano se dispara un resize por pixel, y medir
   todas las tarjetas en cada uno se nota. Se espera a que pare. */
let esperaMasonry = null;

window.addEventListener("resize", function () {

    clearTimeout(esperaMasonry);
    esperaMasonry = setTimeout(relayoutMasonry, 150);

});


/* Los altos se miden una vez y se quedan. Si despues cambia el alto
   de una tarjeta, la grilla queda con huecos o con tarjetas
   montadas: pasa cuando tarda la fuente de los titulares, cuando
   una imagen todavia no entro o cuando cambia el texto del
   navegador. Con un ResizeObserver se vuelve a medir solo cuando
   eso pasa.

   Observa las tarjetas y no la grilla a proposito: el alto de la
   grilla lo escribe el propio acomodo, asi que observarla
   realimentaria el ciclo sin fin. */
let observadorTamanio = null;

function observarTamanios() {

    const grid = document.getElementById("productGrid");

    if (!grid || typeof ResizeObserver === "undefined") return;

    if (!observadorTamanio) {

        observadorTamanio = new ResizeObserver(function () {

            clearTimeout(esperaMasonry);
            esperaMasonry = setTimeout(relayoutMasonry, 50);

        });

    }

    for (const tarjeta of grid.querySelectorAll(".product-card")) {

        observadorTamanio.observe(tarjeta);

    }

}


/* En la home el catalogo arranca oculto, y al ocultarse no se puede
   medir nada. Cuando la seccion se muestra no hay ningun resize de
   la ventana que avise (abrir un menu no cambia el tamano de la
   ventana), asi que sin esto las tarjetas se quedarian con el ancho
   que tuvieran al ocultarse.

   Solo se recoloca si hay tarjetas sin colocar, asi que el alto que
   escribe el propio acomodo no vuelve a disparar el ciclo. */
function observarAnchoGrilla() {

    const grid = document.getElementById("productGrid");

    if (!grid || typeof ResizeObserver === "undefined") return;

    new ResizeObserver(function () {

        /* Ancho 0 es la seccion oculta: no hay nada que medir. */
        if (grid.clientWidth === 0) return;

        if (!grid.querySelector(".product-card:not([data-columna])")) return;

        clearTimeout(esperaMasonry);
        esperaMasonry = setTimeout(relayoutMasonry, 50);

    }).observe(grid);

}


/* Red de seguridad del observador. Si la seccion sigue oculta al
   dibujar, las tarjetas quedan sin colocar esperando a que el
   observador avise. Ese aviso es lo normal, pero si el navegador
   no lo entrega (pestana en segundo plano al cargar, o motores que
   no lo soportan) el catalogo de la home se quedaria para siempre
   en el flex de respaldo.

   Por eso se reintenta un numero acotado de veces y se para en
   cuanto las tarjetas quedan colocadas: no es unintervalo vivo, y
   si el visitante esta mirando otra seccion tampoco pasa nada
   porque el acomodo sale sin medir nada. */
function reintentarMasonry() {

    const grid = document.getElementById("productGrid");

    if (!grid) return;

    let intentos = 0;

    const intentar = function () {

        /* Si ya estan colocadas (o la grilla quedo vacia) no hace
           falta seguir probando. */
        if (!grid.querySelector(".product-card:not([data-columna])")) return;

        if (grid.clientWidth === 0) {

            if (++intentos > 20) return;

            setTimeout(intentar, 150);

            return;

        }

        relayoutMasonry();

    };

    setTimeout(intentar, 150);

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
   primer += sobre una grilla vacia es igual que un =. Al final
   las nuevas van a su columna: solo esas, las de antes quedan
   donde estaban. */

function agregarTarjetas(lote) {

    const grid = document.getElementById("productGrid");

    if (!grid || !lote.length) return;

    grid.insertAdjacentHTML("beforeend", lote.map(tarjetaProducto).join(""));

    /* data-columna es la marca de "ya colocada". Las que la tienen
       son de un lote anterior y no se vuelven a mover. */
    const nuevas = [...grid.querySelectorAll(".product-card:not([data-columna])")];

    if (nuevas.length) {

        acomodarMasonry(nuevas, true);
        observarTamanios();

        /* Si la seccion estaba oculta, acomodarMasonry no pudo
           medirlas y se quedaron sin columna. El reintento se
           encarga: sin esto, una tanda que llega con la grilla
           oculta se quedaria sin colocar, porque el reintento del
           arranque ya habia terminado antes de que llegara. */
        reintentarMasonry();

    }

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
    desconectarCentinela();

    productosFiltrados = PRODUCTOS.filter(producto =>
        (!categoriaActual || producto.categoria === categoriaActual)
        && coincideBusqueda(producto)
    );

    mostrados = 0;
    cargando = false;

    /* El filtro puede dejar la grilla vacia, y solo por una causa:
       que el texto buscado no coincida con nada. Los botones de
       categoria se arman a partir de los productos que existen, asi
       que elegir una categoria nunca puede dejarla vacia sola.

       El atajo va dentro del propio mensaje: quien esta escribiendo
       en el buscador ve el campo del header a mano, pero quien llego
       hasta aqui con el scroll bajo puede no mirar arriba. */

    if (productosFiltrados.length === 0) {

        /* Sin esto la grilla se quedaria con el alto de la tanda
           anterior y el mensaje de estado vacio flotaria en una
           columna de espacio en blanco. */
        reiniciarMasonry();

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

        if (avisoCatalogo) avisoCatalogo.textContent = "";

        return;

    }

    /* Antes de vaciar la grilla se le saca el masonry: el alto y
       las posiciones de la tanda anterior son de tarjetas que ya
       no estan, y sin limpiar dejarian hueco abajo y columnas
       descolgadas. */
    reiniciarMasonry();

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
   es lo que buscador.js lee para el aria-live.

   Devuelve el total, no las tarjetas dibujadas: con el scroll
   infinito se muestran de a lotes, asi que contar la grilla
   anunciaria "1 producto" para una categoria que tiene siete. */

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
   ========================================================== */

/* El centinela y el aviso se buscan una vez: son los mismos para
   todos los lotes y para todos los filtros. Si no estan (por
   ejemplo porque la grilla se copio en una pagina que no los
   tiene) el scroll infinito no arranca, pero la grilla sigue
   mostrando los productos del primer lote. */

centinela = document.querySelector("[data-centinela]");
avisoCatalogo = document.querySelector("[data-catalogo-aviso]");

/* El hueco del masonry sale del CSS, asi que se lee antes del
   primer render: despues la grilla ya tiene la clase es-masonry y
   su gap es 0. */
separacionDeLaGrilla();

/* Antes del render, para que tambien este pendiente el caso de la
   seccion oculta: si el catalogo arranca oculto, el primer render
   no puede medir nada y las tarjetas quedan esperando a que la
   grilla tenga ancho. */
observarAnchoGrilla();

/* Y el reintento, que cubre el caso de que el observador no avise. */
reintentarMasonry();

renderFiltros();
renderCatalog();
refrescarContadores(false);
