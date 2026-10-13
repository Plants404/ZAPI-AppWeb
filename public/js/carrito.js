// WhatsApp: 598 + número sin el 0 inicial (098 268 560 -> 59898268560)
const WHATSAPP_NUMBER = "59898268560";


const SHIPPING_COST = 0;


let cart = [];

function leer() {

    cart = obtenerCarrito();
    renderCart();

}


function saveCart() {

    guardarCarrito(cart);

}


function confirmarCarrito() {

    saveCart();

    renderCart();

    actualizarContador(false);

}


      const AFINIDAD = {

          "Hortalizas": ["Aromáticas", "Combo", "Kits"],
          "Aromáticas": ["Hortalizas", "Combo", "Kits"],
          "Plantas de interior": ["Plantas de interior", "Combo", "Kits"],
          "Combo": ["Plantas de interior", "Hortalizas", "Aromáticas", "Kits"],
          "Kits": ["Hortalizas", "Aromáticas", "Plantas de interior", "Combo"]

      };


function obtenerRecomendaciones() {

    const enCarrito = cart.map(item => item.id);

    /* El carrito guardado solo trae {id, precio, cantidad}: la categoría hay que buscarla en el catálogo. */
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

    return candidatos

        .slice()

        .sort((a, b) => a.precioBase - b.precioBase)

        .slice(0, 3);

}


function renderRecommendations() {

    const seccion = document.getElementById("recommendations");

    const lista = document.getElementById("recommendationsList");

    if (!seccion || !lista) return;


    const recomendaciones = obtenerRecomendaciones();


    if (recomendaciones.length === 0) {

        seccion.hidden = true;
        lista.innerHTML = "";

        lista.dataset.ids = "";
        return;

    }


    seccion.hidden = false;


    /* Reescribir la lista en cada cambio de cantidad recrearía las tarjetas y perdería el foco. */
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


function renderCart() {

    const container =
        document.getElementById("cartItems");

    const emptyCart =
        document.getElementById("emptyCart");

    if (!container || !emptyCart) return;


    const raizCheckout =
        document.getElementById("checkoutRoot");

    const formularioCheckout =
        raizCheckout && raizCheckout.querySelector("form");

    if (formularioCheckout) {

        formularioCheckout.hidden =
            cart.length === 0;

    }


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

                    <span class="cart-item-stock" data-stock="${item.id}"></span>


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


    pintarStockEnPantalla();


    updateSummary();

    renderRecommendations();

}


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


function changeQuantity(id, amount) {

    const idProducto = Number(id);

    const item =
        cart.find(product => product.id === idProducto);


    if (!item) return;


    /* Bajar la cantidad nunca borra el producto: el 1 es el piso; para sacarlo está la papelera. */
    item.cantidad = Math.max(1, item.cantidad + amount);

    confirmarCarrito();

}


function removeProduct(id) {

    const idProducto = Number(id);

    const itemElement =
        document.querySelector(
            `.cart-item[data-id="${idProducto}"]`
        );


    if (itemElement) {

        itemElement.style.opacity = "0";

        itemElement.style.transform =
            "translateX(30px) scale(.96)";

    }


    setTimeout(() => {

        cart = cart.filter(
            product => product.id !== idProducto
        );

        confirmarCarrito();

    }, 220);

}


function sumarAlCarrito(id) {

    agregarProductoAlCarrito(id);

}


/* La tarjeta no es un botón: el nombre lo es (antes tenía tabindex sin rol y se anunciaba mal). */
document.addEventListener(
    "click",
    function(event) {

        const tarjeta =
            event.target.closest(".recommendation-card");


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


document.addEventListener(
    "click",
    function(event) {


        const addRecommendation =
            event.target.closest(".recommendation-add");


        if (addRecommendation) {

            sumarAlCarrito(
                Number(addRecommendation.dataset.id)
            );

            return;

        }


        const plus =
            event.target.closest(".quantity-plus");


        if (plus) {

            changeQuantity(
                plus.dataset.id,
                1
            );

            return;

        }


        const minus =
            event.target.closest(".quantity-minus");


        if (minus) {

            changeQuantity(
                minus.dataset.id,
                -1
            );

            return;

        }


        const remove =
            event.target.closest(".remove-item");


        if (remove) {

            removeProduct(
                remove.dataset.id
            );

        }

    }
);


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


function abrirWhatsappPedido(datos) {

    if (cart.length === 0) return;


    const contacto = datos || {};


    const subtotal =
        cart.reduce(
            (total, item) => {

                return total +
                    (item.precio * item.cantidad);

            },

            0
        );


    const shipping =
        SHIPPING_COST;


    const total =
        subtotal + shipping;


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


    const contactoText = [
        `Nombre: ${contacto.nombre || ""}`,
        `Teléfono: ${contacto.telefono || ""}`,
        contacto.email ? `Correo: ${contacto.email}` : "",
        contacto.zona ? `Zona: ${contacto.zona}` : "",
        contacto.notas ? `Notas: ${contacto.notas}` : ""
    ].filter(Boolean).join("\n");

    const message = `Hola ZAPI 🌱

Quiero realizar el siguiente pedido:

${productsText}

━━━━━━━━━━━━━━━━━━

Subtotal: ${formatearPrecio(subtotal)}
Envío: ${formatearPrecio(shipping)}

TOTAL: ${formatearPrecio(total)}

━━━━━━━━━━━━━━━━━━

Datos de contacto

${contactoText}

¿Podrían confirmarme la disponibilidad y coordinar la entrega?

Gracias.`;


    const encodedMessage =
        encodeURIComponent(message);


    window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`,
        "_blank",
        "noopener,noreferrer"
    );


}


const whatsappButton =
    document.getElementById("whatsappButton");


if (whatsappButton) {

    whatsappButton.addEventListener("click", enviarPedido);

}


const CAMPOS_PEDIDO = {

    nombre:  { input: "pedNombre",  error: "pedErrorNombre" },
    telefono: { input: "pedTelefono", error: "pedErrorTelefono" }

};


/* Misma limpieza que el servidor (utils/texto.js): un salto de línea en el nombre rompería el JSON. */
function limpiarValor(valor) {

    return String(valor || "")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim();

}


function marcarCampo(nombreCampo, mensaje) {

    const campo = CAMPOS_PEDIDO[nombreCampo];

    if (!campo) return false;

    const input = document.getElementById(campo.input);
    const error = document.getElementById(campo.error);

    if (input) input.classList.add("campo-con-error");

    if (error) error.textContent = mensaje;

    if (input) input.focus();

    return true;

}


function limpiarErrores() {

    const formulario = document.getElementById("checkoutForm");

    if (!formulario) return;

    for (const input of formulario.querySelectorAll(".campo-input")) {
        input.classList.remove("campo-con-error");
    }

    for (const error of formulario.querySelectorAll(".campo-error")) {
        error.textContent = "";
    }

}


function mostrarEstado(mensaje, esError) {

    const estado = document.getElementById("pedEstado");

    if (!estado) return;

    estado.textContent = mensaje;

    estado.hidden = false;

    estado.classList.toggle("checkout-estado-error", Boolean(esError));

}


function enviarPedido(evento) {

    evento.preventDefault();

    if (cart.length === 0) {
        mostrarEstado("Agregá al menos un producto al carrito.", true);
        return;
    }

    limpiarErrores();

    const nombre = limpiarValor(
        document.getElementById("pedNombre").value
    );

    const telefono = limpiarValor(
        document.getElementById("pedTelefono").value
    );

    if (nombre.length < 2) {
        marcarCampo("nombre", "Escribí tu nombre");
        return;
    }

    if (telefono.replace(/\D/g, "").length < 6) {
        marcarCampo("telefono", "Falta un teléfono de contacto");
        return;
    }

    const boton = document.getElementById("whatsappButton");
    const contenidoBoton = boton ? boton.innerHTML : "";

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando pedido...";
    }

    const email = limpiarValor(document.getElementById("pedEmail").value) || null;
    const zona = limpiarValor(document.getElementById("pedZona").value) || null;
    const notas = limpiarValor(document.getElementById("pedNotas").value) || null;

    const items = cart.map(item => ({
        id: Number(item.id),
        cantidad: Number(item.cantidad)
    }));

    fetch(window.urlApi("/api/pedidos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            nombre,
            telefono,
            email,
            zona,
            notas,
            items
        })
    })
        .then(respuesta => respuesta.json()
            .then(cuerpo => ({ estado: respuesta.status, cuerpo })))
        .then(resultado => {

            const { estado, cuerpo } = resultado;

            if (estado === 201) {

                mostrarEstado(
                    `Pedido ${cuerpo.id} confirmado por ` +
                    `${formatearPrecio(cuerpo.total)}. ` +
                    "Te contactamos para coordinar la entrega.",
                    false
                );

                abrirWhatsappPedido({ nombre, telefono, email, zona, notas });

                cart = [];

                confirmarCarrito();

                /* Variable aparte: asignar directo al global confundiría al verificador de scripts. */
                const refrescarStock = window.actualizarStock;

                if (typeof refrescarStock === "function") {
                    refrescarStock();
                }

                return;

            }

            if (estado === 409) {

                const avisos = cuerpo.shortages
                    .map(shortage => {

                        const item = cart.find(
                            producto => Number(producto.id) === shortage.id
                        );

                        if (!item) return "";

                        if (shortage.disponibles === null || shortage.disponibles <= 0) {

                            cart = cart.filter(
                                producto => Number(producto.id) !== shortage.id
                            );

                            return (
                                `Sacamos “${shortage.nombre}” porque no quedan unidades.`
                            );

                        }

                        if (shortage.disponibles < item.cantidad) {

                            item.cantidad = shortage.disponibles;

                            return (
                                `Bajamos “${shortage.nombre}” a ${shortage.disponibles}.`
                            );

                        }

                        return "";

                    })
                    .filter(Boolean)
                    .join(" ");

                confirmarCarrito();

                mostrarEstado(
                    (cuerpo.error || "No hay stock suficiente") + " " + avisos +
                    " Revisá las cantidades e intentá de nuevo.",
                    true
                );

                return;

            }

            if (estado === 400 && cuerpo.campo) {

                marcarCampo(cuerpo.campo, cuerpo.error || "Revisá este campo");

                mostrarEstado(cuerpo.error || "Revisá los datos del pedido.", true);

                return;

            }

            mostrarEstado(
                cuerpo && cuerpo.error
                    ? cuerpo.error
                    : "No se pudo confirmar el pedido. Intentá de nuevo o coordiná por WhatsApp.",
                true
            );

        })
        .catch(() => {

            mostrarEstado(
                "No se pudo enviar el pedido. " +
                "Revisá tu conexión o coordiná por WhatsApp.",
                true
            );

        })
        .finally(() => {

            if (!boton) return;

            boton.disabled = false;

            boton.innerHTML = contenidoBoton;

        });

}


function montarCheckout() {

    const raiz = document.getElementById("checkoutRoot");

    if (!raiz) return;

    raiz.innerHTML = `

        <form id="checkoutForm" class="checkout-form" novalidate>

            <h3>Datos de contacto</h3>

            <label class="campo-label" for="pedNombre">
                Nombre <span aria-hidden="true">*</span>
            </label>

            <input class="campo-input" id="pedNombre" name="nombre"
                type="text" maxlength="120" autocomplete="name"
                aria-describedby="pedErrorNombre">

            <span class="campo-error" id="pedErrorNombre"></span>

            <label class="campo-label" for="pedTelefono">
                Teléfono <span aria-hidden="true">*</span>
            </label>

            <input class="campo-input" id="pedTelefono" name="telefono"
                type="tel" inputmode="tel" maxlength="40"
                autocomplete="tel" aria-describedby="pedErrorTelefono">

            <span class="campo-error" id="pedErrorTelefono"></span>

            <label class="campo-label" for="pedEmail">
                Correo electrónico (opcional)
            </label>

            <input class="campo-input" id="pedEmail" name="email"
                type="email" inputmode="email" maxlength="160"
                autocomplete="email">

            <label class="campo-label" for="pedZona">
                Zona (opcional)
            </label>

            <input class="campo-input" id="pedZona" name="zona"
                type="text" maxlength="120" autocomplete="address-level2">

            <label class="campo-label" for="pedNotas">
                Notas (opcional)
            </label>

            <textarea class="campo-input campo-area" id="pedNotas"
                name="notas" rows="3" maxlength="500"></textarea>

        </form>

        <p class="checkout-estado" id="pedEstado"
            role="status" aria-live="polite" hidden></p>

    `;

    const formulario = raiz.querySelector("form");

    formulario.hidden = cart.length === 0;

    formulario.addEventListener("submit", enviarPedido);

}


document.addEventListener("DOMContentLoaded", montarCheckout);


/* Relee "zapiCart" en cada cambio: con las dos páginas en index.html, sin esto el carrito mostraba el pedido de antes de la suma. */
suscribirAlCarrito(function () {

    cart = obtenerCarrito();

    renderCart();

});


alCargarElCatalogo(leer);