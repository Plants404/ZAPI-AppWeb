/* ==========================================================
   CARRITO ZAPI
   ------------------------------------------------------------
   Toda la logica del carrito de compras:

     - guarda lo que el visitante eligio en localStorage
       para que el pedido sobreviva a una recarga;
     - dibuja los items, el resumen y las recomendaciones;
     - propone productos que van bien con lo ya comprado;
     - arma el texto del pedido y lo manda a WhatsApp,
       que es el checkout real de la tienda.

   El guardado y la suma de productos viven en productos.js, el
   unico que escribe en "zapiCart". Aca solo se dibuja el pedido
   y se ATIENDE lo que avise productos.js cuando el carrito
   cambia, para que el catalogo que esta en la misma pagina
   (index.html) y esta lista no queden desfasados entre si.

   Depende de productos.js (PRODUCTOS, precios,
   formatearPrecio, obtenerCarrito, guardarCarrito,
   actualizarContador y agregarProductoAlCarrito) y de
   modal.js (ventana de detalle).
   ========================================================== */


/* ==========================================================
   CONFIGURACIÓN
   ========================================================== */

// WhatsApp REAL de ZAPI
// Formato internacional, SIN +, espacios ni guiones.
// Uruguay: 598 + número sin el 0 inicial
// 098 268 560  ->  59898268560
const WHATSAPP_NUMBER = "59898268560";


/*
    Costo fijo de envío.

    Si el costo se coordina directamente
    por WhatsApp, dejar en 0.
*/
const SHIPPING_COST = 0;


/* ==========================================================
   OBTENER CARRITO
   ------------------------------------------------------------
   El carrito se lee de localStorage al cargar la pagina, de
   modo que sigue ahi si el visitante recarga o vuelve otro
   dia. La lectura pasa por obtenerCarrito, en productos.js, que
   ademas completa los datos que le falten a cada item con los
   del catalogo: asi un pedido guardado por una version vieja
   del sitio no se dibuja con la imagen rota o sin nombre.

   Por que arranca vacio y no se lee de una
   -----------------------------------------
   obtenerCarrito, en productos.js, descarta los items cuyo id no
   encuentra en PRODUCTOS, porque no se pueden dibujar. Antes el
   catalogo estaba entero en el script, asi que discardar era
   correcto. Ahora PRODUCTOS se llena con un fetch: si se leyera el
   carrito al cargar, todavia no habria nada y TODOS los items se
   descartarian, dejando el carrito vacio.

   Peor todavia: guardarCarrito escribe esa lista vacia en
   localStorage. Con solo recargar, un visitante con el pedido
   armado lo perdia de verdad.

   Por eso cart arranca vacio y se arma adentro de
   alCargarElCatalogo, ya con el catalogo cargado. La funcion leer()
   es la que se suscribe.
   ========================================================== */

let cart = [];

function leer() {

    cart = obtenerCarrito();
    renderCart();

}


/* ==========================================================
   GUARDAR CARRITO
   ------------------------------------------------------------
   Toda modificacion del pedido termina pasando por confirmar:
   se guarda el carrito entero y se redibujan la lista, el
   resumen y las recomendaciones.

   La escritura se delega a guardarCarrito, en productos.js, que
   es el unico punto que toca localStorage. Esta copia estaba
   escribiendo directo y tiraba toda la pagina en modo privado o
   con la cuota llena.
   ========================================================== */

function saveCart() {

    guardarCarrito(cart);

}


/* Unico punto de salida de los cambios del pedido.

   Dibuja la lista y actualiza el contador del nav. El contador
   se refresca sin animacion a proposito: el "pop" y el sonido
   los pone agregarProductoAlCarrito en productos.js, que es el
   camino de las sumas. Aqui se trata de cambiar cantidades o
   borrar, que no suenan. */

function confirmarCarrito() {

    saveCart();

    renderCart();

    actualizarContador(false);

}


/* ==========================================================
   AFINIDAD ENTRE PRODUCTOS
   Define qué productos combinan bien entre sí.
   ========================================================== */

      const AFINIDAD = {

          /* El kit de huerta combina con todo lo que se cultiva en
             maceta o en jardín, por eso "Kits" figura como compatible
             con todas las categorías. Sin esto el kit puntuaba 0
             contra cualquier carrito y el filtro lo descartaba
             siempre, por más productos que hubiera. */

          "Hortalizas": ["Aromáticas", "Combo", "Kits"],
          "Aromáticas": ["Hortalizas", "Combo", "Kits"],
          "Plantas de interior": ["Plantas de interior", "Combo", "Kits"],
          "Combo": ["Plantas de interior", "Hortalizas", "Aromáticas", "Kits"],
          "Kits": ["Hortalizas", "Aromáticas", "Plantas de interior", "Combo"]

      };


/* ==========================================================
   OBTENER RECOMENDACIONES
   Excluye lo que ya está en el carrito y
   prioriza productos de categorías compatibles.
   ========================================================== */

function obtenerRecomendaciones() {

    const enCarrito = cart.map(item => item.id);

    /* El carrito guardado en localStorage solo trae
       {id, precio, cantidad}: la categoría no viaja con el item, así
       que hay que buscarla en el catálogo. Sin esto ninguna afinidad
       empataba nunca, el filtro de puntaje se quedaba sin nada y la
       sección quedaba oculta para siempre. */

    const categoriasEnCarrito = cart

        .map(item => {

            const producto = PRODUCTOS.find(
                p => p.id === item.id
            );

            return producto ? producto.categoria : null;

        })

        .filter(Boolean);

    const candidatos = PRODUCTOS.filter(
        producto => !enCarrito.includes(producto.id)
    );

    const conAfinidad = candidatos

        .map(producto => {

            /* Puntaje por afinidad de categoría */

            const afinidad = categoriasEnCarrito.reduce(
                (total, categoria) => {

                    const compatibles =
                        AFINIDAD[categoria] || [];

                    return total +
                        (compatibles.includes(producto.categoria) ? 2 : 0);

                },
                0
            );

            return {
                producto,
                puntaje: afinidad
            };

        })

        .filter(item => item.puntaje > 0)

        .sort((a, b) => b.puntaje - a.puntaje)

        .map(item => item.producto);

    if (conAfinidad.length > 0) {

        return conAfinidad.slice(0, 3);

    }

    /* Si no hay coincidencia por categoría,
       mostrar los más económicos como sugerencia */

    return candidatos

        .slice()

        .sort((a, b) => a.precioBase - b.precioBase)

        .slice(0, 3);

}


/* ==========================================================
   RENDERIZAR RECOMENDACIONES
   ========================================================== */

function renderRecommendations() {

    const seccion = document.getElementById("recommendations");

    const lista = document.getElementById("recommendationsList");

    if (!seccion || !lista) return;


    const recomendaciones = obtenerRecomendaciones();


    /* Sin recomendaciones: ocultar la sección */

    if (recomendaciones.length === 0) {

        seccion.hidden = true;
        lista.innerHTML = "";

        /* Se olvida la lista anterior para que la proxima vez que
           haya productos la animacion de entrada vuelva a correr. */

        lista.dataset.ids = "";
        return;

    }


    seccion.hidden = false;


    /* Solo se reescribe la lista cuando cambian los productos.

       Si se reescribiera en cada cambio de cantidad, las tarjetas
       se recrearian y la animacion de entrada volveria a empezar
       una y otra vez. Ademas, al no reescribir, el foco del
       teclado no se pierde. Con --i cada tarjeta entra
       escalonada: 0 la primera, 110ms la segunda, 220ms la
       tercera. */

    const ids = recomendaciones.map(p => p.id).join(",");

    if (lista.dataset.ids === ids) return;

    lista.dataset.ids = ids;


    lista.innerHTML = recomendaciones.map((producto, indice) => {

        const precio = precios[producto.id] || producto.precioBase;

        return `

            <article
                class="recommendation-card"
                style="--i: ${indice}"
                data-id="${producto.id}"
            >

                <div class="recommendation-image">

                    <img
                        src="${escaparHTML(producto.imagen)}"
                        alt="${escaparHTML(producto.nombre)}"
                        loading="lazy"
                    >

                </div>

                <div class="recommendation-info">

                    <div class="recommendation-category">
                        ${escaparHTML(producto.categoria)}
                    </div>

                    <h3>
                        <button class="recommendation-link" type="button"
                            data-id="${producto.id}" aria-haspopup="dialog">
                            ${escaparHTML(producto.nombre)}
                        </button>
                    </h3>

                    <p>
                        ${escaparHTML(producto.descripcion)}
                    </p>

                    <div class="recommendation-footer">

                        <strong>
                            ${formatearPrecio(precio)}
                        </strong>

                        <button
                            class="recommendation-add"
                            type="button"
                            data-id="${producto.id}"
                            aria-label="Agregar ${escaparHTML(producto.nombre)} al carrito"
                        >

                            <span class="material-symbols-outlined">
                                add_shopping_cart
                            </span>

                            Agregar

                        </button>

                    </div>

                </div>

            </article>

        `;

    }).join("");

}


/* ==========================================================
   RENDERIZAR CARRITO
   ------------------------------------------------------------
   Reconstruye la lista de items y ademas refresca el
   resumen y las recomendaciones, para que las tres zonas
   de la pagina nunca queden desactualizadas entre si.
   ========================================================== */

function renderCart() {

    const container =
        document.getElementById("cartItems");

    const emptyCart =
        document.getElementById("emptyCart");

    /* Esta pagina se carga sola en carrito.html, pero tambien
       dentro de index.html. Si el bloque del carrito no esta en
       el DOM no hay nada que dibujar y se sale, en vez de fallar
       al buscar la lista vacia. */

    if (!container || !emptyCart) return;


    /* Carrito vacío */

        if (cart.length === 0) {

            container.innerHTML = "";

            emptyCart.classList.remove("hidden");

            updateSummary();

            renderRecommendations();

            return;

        }


    emptyCart.classList.add("hidden");


    container.innerHTML = cart.map(item => {

        const itemTotal =
            item.precio * item.cantidad;


        return `

            <article
                class="cart-item"
                data-id="${item.id}"
            >

                <div class="cart-item-image">

                    <img
                        src="${escaparHTML(item.imagen)}"
                        alt="${escaparHTML(item.nombre)}"
                        loading="lazy"
                        decoding="async"
                    >

                </div>


                <div class="cart-item-info">

                    <h3>
                        ${escaparHTML(item.nombre)}
                    </h3>

                    <div class="cart-item-category">
                        ${escaparHTML(item.categoria) || "Producto ZAPI"}
                    </div>

                    <div class="cart-item-price">
                        ${formatearPrecio(item.precio)}
                    </div>


                    <div class="quantity-control">

                        <button
                            class="quantity-minus"
                            data-id="${item.id}"
                            aria-label="Disminuir cantidad"
                            type="button"
                        >

                            <span class="material-symbols-outlined">
                                remove
                            </span>

                        </button>


                        <span>
                            ${item.cantidad}
                        </span>


                        <button
                            class="quantity-plus"
                            data-id="${item.id}"
                            aria-label="Aumentar cantidad"
                            type="button"
                        >

                            <span class="material-symbols-outlined">
                                add
                            </span>

                        </button>

                    </div>

                </div>


                <div class="cart-item-total">

                    <strong>
                        ${formatearPrecio(itemTotal)}
                    </strong>


                    <button
                        class="remove-item"
                        data-id="${item.id}"
                        aria-label="Eliminar ${escaparHTML(item.nombre)} del carrito"
                        type="button"
                    >

                        <span class="material-symbols-outlined">
                            delete
                        </span>

                    </button>

                </div>

            </article>

        `;

    }).join("");


    updateSummary();

    renderRecommendations();

}


/* ==========================================================
   ACTUALIZAR RESUMEN
   ------------------------------------------------------------
   Subtotal, envio y total. El envio se cobra solo cuando
   hay productos en el carrito, para que el resumen de un
   carrito vacio muestre 0 en las tres columnas.
   ========================================================== */

function updateSummary() {

    const subtotal =
        cart.reduce(

            (total, item) => {

                return total +
                    (item.precio * item.cantidad);

            },

            0

        );


    const shipping =
        cart.length > 0
            ? SHIPPING_COST
            : 0;


    const total =
        subtotal + shipping;


    document.getElementById("subtotal")
        .textContent = formatearPrecio(subtotal);


    document.getElementById("shipping")
        .textContent = formatearPrecio(shipping);


    document.getElementById("total")
        .textContent = formatearPrecio(total);

}


/* ==========================================================
   CAMBIAR CANTIDAD
   ------------------------------------------------------------
   Suma o resta unidades. Bajar de 1 elimina el producto en
   lugar de dejarlo en cero, para que el boton de disminuir
   nunca produzca un item vacio.
   ========================================================== */

function changeQuantity(id, amount) {

    const item =
        cart.find(product => product.id == id);


    if (!item) return;


    /* Bajar la cantidad nunca borra el producto. Antes, llegar
       a 1 y tocar "-" eliminaba la fila sin avisar, y eso se
       leia como un fallo de la tienda. El 1 es el piso y para
       sacar el producto esta el boton de papelera. */

    item.cantidad = Math.max(1, item.cantidad + amount);

    confirmarCarrito();

}


/* ==========================================================
   ELIMINAR PRODUCTO
   ------------------------------------------------------------
   Primero anima la fila que se va y recien despues la saca
   del carrito. Se ve que producto desaparecio, en vez de
   borrarse de golpe.
   ========================================================== */

function removeProduct(id) {

    const itemElement =
        document.querySelector(
            `.cart-item[data-id="${id}"]`
        );


    if (itemElement) {

        itemElement.style.opacity = "0";

        itemElement.style.transform =
            "translateX(30px) scale(.96)";

    }


    setTimeout(() => {

        cart = cart.filter(
            product => product.id != id
        );

        confirmarCarrito();

    }, 220);

}


/* ==========================================================
   AGREGAR DESDE RECOMENDACIÓN
   ------------------------------------------------------------
   La suma la hace agregarProductoAlCarrito, en productos.js:
   es el mismo camino que usa el boton de la tarjeta del
   catalogo y el de la ventana de detalle, asi que el contador,
   el sonido y el guardado salen identicos en los tres casos.
   Esta lista se redibuja sola, porque esta pagina esta
   suscrita a los cambios del carrito.

   La tarjeta que se toco sale de la lista al sumarla: esa
   es la confirmacion de que se agrego.
   ========================================================== */

function sumarAlCarrito(id) {

    agregarProductoAlCarrito(id);

}


/* ==========================================================
   VENTANA FLOTANTE DE PRODUCTO
   El mecanismo esta en modal.js, compartido con el catalogo.
   Desde aqui solo se le pasa el producto desde las tarjetas de
   recomendacion. El boton "Agregar al carrito" de la ventana
   dispara "modal:agregar" y lo escucha productos.js, una sola
   vez: con catalogo.js tambien cargado en index.html, tener el
   listener en los dos sumaba dos unidades por clic.
   ========================================================== */

/* La tarjeta de recomendacion no es un boton: el nombre del
   producto lo es. Antes el <article> tenia tabindex="0" y
   aria-haspopup="dialog" sin ningun rol, asi que se anunciaba
   como un articulo generico aunque se pudiera abrir con Enter.
   Se mantiene el clic en toda la tarjeta y el control de verdad
   pasa a ser el boton del nombre. */
document.addEventListener(
    "click",
    function(event) {

        const tarjeta =
            event.target.closest(".recommendation-card");


        /* El boton de agregar manda: no abrir el detalle */

        if (tarjeta &&
            !event.target.closest(".recommendation-add")) {

            window.abrirModalProducto(
                Number(tarjeta.dataset.id),
                tarjeta
            );

            return;

        }

    }
);


/* ==========================================================
   EVENTOS DEL CARRITO
   ------------------------------------------------------------
   Un solo listener sobre el documento en vez de uno por
   boton: como renderCart() redibuja la lista en cada cambio,
   los botones se recrean en cada dibujado y habria que
   volver a engancharlos.

   Cada rama corta con return porque un unico clic solo debe
   disparar una accion.
   ========================================================== */

document.addEventListener(
    "click",
    function(event) {


        /* Agregar desde recomendación.
           La tarjeta sale de la lista al sumarla, asi que
           ver como desaparece es la confirmacion. */

        const addRecommendation =
            event.target.closest(".recommendation-add");


        if (addRecommendation) {

            sumarAlCarrito(
                Number(addRecommendation.dataset.id)
            );

            return;

        }


        /* Aumentar */

        const plus =
            event.target.closest(".quantity-plus");


        if (plus) {

            changeQuantity(
                plus.dataset.id,
                1
            );

            return;

        }


        /* Disminuir */

        const minus =
            event.target.closest(".quantity-minus");


        if (minus) {

            changeQuantity(
                minus.dataset.id,
                -1
            );

            return;

        }


        /* Eliminar */

        const remove =
            event.target.closest(".remove-item");


        if (remove) {

            removeProduct(
                remove.dataset.id
            );

        }

    }
);


/* ==========================================================
   VACIAR CARRITO
   ------------------------------------------------------------
   Pide confirmacion antes de borrar: un pedido completo
   guardado no se puede recuperar, no hay historial.
   ========================================================== */

const clearCartButton =
    document.getElementById("clearCart");


if (clearCartButton) {

    clearCartButton.addEventListener(
        "click",
        function() {

            if (cart.length === 0) return;


            const confirmClear =
                confirm(
                    "¿Querés vaciar el carrito?"
                );


            if (!confirmClear) return;


            cart = [];

            confirmarCarrito();

        }
    );

}


/* ==========================================================
   WHATSAPP
   ------------------------------------------------------------
   Este es el checkout de la tienda. No hay pasarela de pago:
   se arma el pedido como texto y se abre una conversacion
   con ZAPI, donde se confirman stock, precio y entrega.
   ========================================================== */

const whatsappButton =
    document.getElementById("whatsappButton");


if (whatsappButton) {

    whatsappButton.addEventListener(
        "click",
        function() {

            /* Verificar carrito */

            if (cart.length === 0) {

                alert(
                    "Agregá al menos un producto al carrito."
                );

                return;

            }


            /* Calcular subtotal */

            const subtotal =
                cart.reduce(
                    (total, item) => {

                        return total +
                            (item.precio * item.cantidad);

                    },

                    0
                );


            /* Calcular envío */

            const shipping =
                SHIPPING_COST;


            /* Calcular total */

            const total =
                subtotal + shipping;


            /* ==================================================
               CONSTRUIR DETALLE DE PRODUCTOS
               Una linea por producto: nombre, unidades y el
               total de esa linea (precio x cantidad).
               ================================================== */

            const productsText =
                cart.map(item => {

                    const itemTotal =
                        item.precio *
                        item.cantidad;


                    return (
                        `• ${item.nombre} x${item.cantidad} — ` +
                        `${formatearPrecio(itemTotal)}`
                    );

                }).join("\n");


            /* ==================================================
               CREAR MENSAJE
               El texto tal cual lo va a leer el cliente en
               WhatsApp: pedido, totales y la pregunta por la
               entrega.
               ================================================== */

            const message = `Hola ZAPI 🌱

Quiero realizar el siguiente pedido:

${productsText}

━━━━━━━━━━━━━━━━━━

Subtotal: ${formatearPrecio(subtotal)}
Envío: ${formatearPrecio(shipping)}

TOTAL: ${formatearPrecio(total)}

¿Podrían confirmarme la disponibilidad y coordinar la entrega?

Gracias.`;


            /* ==================================================
               CODIFICAR MENSAJE
               El mensaje va dentro de la URL, asi que hay que
               escapar los saltos de linea, el simbolo $ y los
               acentos. Sin esto WhatsApp lo cortaria a la
               primera linea.
               ================================================== */

            const encodedMessage =
                encodeURIComponent(message);


            /* ==================================================
               CREAR ENLACE ESTÁNDAR DE WHATSAPP
               ================================================== */

            const whatsappURL =
                `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;


            /* ==================================================
               ABRIR WHATSAPP
               Pestana nueva para no perder el carrito, y
               noopener/noreferrer para que la pagina no
               reciba acceso a la ventana abierta.
               ================================================== */

            window.open(
                whatsappURL,
                "_blank",
                "noopener,noreferrer"
            );

        }
    );

}


/* ==========================================================
   INICIALIZAR
   ------------------------------------------------------------
   Primero se relee el carrito guardado: esta pagina guarda su
   propia copia en "cart" para dibujar el pedido, y esa copia
   tiene que volver a leerse de "zapiCart" cada vez que otra
   parte de la pagina (el catalogo, el chat, la ventana de
   detalle) suma o borra algo. Con las dos paginas en
   index.html, sin esto el carrito mostraba el pedido de antes
   de la suma.
   ========================================================== */

suscribirAlCarrito(function () {

    cart = obtenerCarrito();

    renderCart();

});


/* Con solo renderizar el carrito la pagina queda lista:
   el resumen y las recomendaciones se actualizan desde ahi.

   La primera lectura va atrasada hasta que el catalogo este
   cargado: ver el bloque OBTENER CARRITO mas arriba, que explica
   por que leer el carrito antes seria perderlo. */
alCargarElCatalogo(leer);