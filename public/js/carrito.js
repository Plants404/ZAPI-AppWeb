/* ==========================================================
   CARRITO Y PEDIDO
   ----------------------------------------------------------
   Estado del carrito, render de la pagina, recomendaciones y
   envio. Cuando hay backend el pedido sale por la API; si no
   hay, o si la API falla, se cae a WhatsApp sin bloquear al
   cliente. Los scripts comparten el ambito global (scripts
   clasicos), por eso el carrito es un `let` de nivel superior.
   ========================================================== */

// WhatsApp: 598 + numero sin el 0 inicial (098 268 560 -> 59898268560)
const WHATSAPP_NUMBER = "59898268560";
const FREE_SHIPPING_THRESHOLD = window.ENVIO_GRATIS_MINIMO;

let cart = [];

document.querySelectorAll("[data-shipping-threshold]").forEach(elemento => {
    elemento.textContent = formatearPrecio(FREE_SHIPPING_THRESHOLD);
});

/* --- Estado y persistencia --------------------------------- */

function confirmarCarrito() {
    guardarCarrito(cart);
    renderCart();
    actualizarContador(false);
}

/* Relee el carrito guardado. Se usa al cargar el catalogo y en
   cada cambio, porque index.html tiene dos copias del carrito. */
function sincronizarCarrito() {
    cart = obtenerCarrito();
    renderCart();
}

function calcularTotales(items = cart) {
    const subtotal = items.reduce((total, item) => total + item.precio * item.cantidad, 0);
    const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : null;

    return { subtotal, shipping, total: shipping === null ? null : subtotal + shipping };
}

function updateSummary() {
    const { subtotal, shipping, total } = calcularTotales();
    const progresoEnvio = document.getElementById("shippingProgress");
    const seccionProgreso = document.getElementById("shippingProgressSection");
    const mensajeProgreso = document.getElementById("shippingProgressMessage");
    const rellenoProgreso = document.getElementById("shippingProgressFill");
    const notaEnvioPendiente = document.getElementById("shippingPendingNote");
    const progreso = Math.min(subtotal, FREE_SHIPPING_THRESHOLD);
    const porcentajeProgreso = FREE_SHIPPING_THRESHOLD > 0
        ? (progreso / FREE_SHIPPING_THRESHOLD) * 100
        : 100;

    document.getElementById("subtotal").textContent = formatearPrecio(subtotal);
    document.getElementById("shipping").textContent =
        shipping === null ? "A coordinar" : shipping === 0 && subtotal > 0 ? "Gratis" : formatearPrecio(shipping);
    document.getElementById("total").textContent =
        formatearPrecio(total === null ? subtotal : total);

    if (notaEnvioPendiente) notaEnvioPendiente.hidden = total !== null || cart.length === 0;

    if (seccionProgreso) seccionProgreso.hidden = cart.length === 0;
    if (progresoEnvio) {
        progresoEnvio.hidden = cart.length === 0;
        progresoEnvio.setAttribute("aria-valuemax", String(FREE_SHIPPING_THRESHOLD));
        progresoEnvio.setAttribute("aria-valuenow", String(progreso));
        progresoEnvio.setAttribute(
            "aria-valuetext",
            subtotal >= FREE_SHIPPING_THRESHOLD
                ? "Envío gratis alcanzado"
                : `${formatearPrecio(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal))} para alcanzar el envío gratis`
        );
    }

    if (mensajeProgreso) {
        mensajeProgreso.textContent = subtotal >= FREE_SHIPPING_THRESHOLD
            ? "¡Tenés envío gratis!"
            : `Te faltan ${formatearPrecio(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal))} para el envío gratis`;
    }

    if (rellenoProgreso) rellenoProgreso.style.width = `${porcentajeProgreso}%`;
}

function actualizarFilaCarrito(item) {
    const fila = document.querySelector(`.cart-item[data-id="${item.id}"]`);
    if (!fila) return;

    const cantidad = fila.querySelector(".quantity-value");
    const totalLinea = fila.querySelector(".cart-item-line-total");
    const detalle = fila.querySelector(".cart-item-unit-detail");

    if (cantidad) cantidad.textContent = String(item.cantidad);
    if (totalLinea) totalLinea.textContent = formatearPrecio(item.precio * item.cantidad);
    if (detalle) {
        detalle.textContent = `${item.cantidad} × ${formatearPrecio(item.precio)}`;
        detalle.hidden = item.cantidad <= 1;
    }
}

/* --- Recomendaciones --------------------------------------- */

const AFINIDAD = {
    Hortalizas: ["Aromáticas", "Combo", "Kits"],
    Aromáticas: ["Hortalizas", "Combo", "Kits"],
    "Plantas de interior": ["Plantas de interior", "Combo", "Kits"],
    Combo: ["Plantas de interior", "Hortalizas", "Aromáticas", "Kits"],
    Kits: ["Hortalizas", "Aromáticas", "Plantas de interior", "Combo"],
};

function obtenerRecomendaciones() {
    const idsEnCarrito = new Set(cart.map(({ id }) => id));

    /* El carrito guardado solo trae {id, precio, cantidad}: la
       categoria hay que buscarla en el catalogo. */
    const categorias = cart
        .map(({ id }) => PRODUCTOS.find(producto => producto.id === id)?.categoria)
        .filter(Boolean);

    const puntajeDe = producto => categorias.reduce(
        (total, categoria) =>
            total + ((AFINIDAD[categoria] || []).includes(producto.categoria) ? 2 : 0),
        0
    );

    const candidatos = PRODUCTOS.filter(({ id }) => !idsEnCarrito.has(id));

    const porAfinidad = candidatos
        .map(producto => ({ producto, puntaje: puntajeDe(producto) }))
        .filter(({ puntaje }) => puntaje > 0)
        .sort((a, b) => b.puntaje - a.puntaje)
        .map(({ producto }) => producto)
        .slice(0, 3);

    if (porAfinidad.length > 0) return porAfinidad;

    return [...candidatos].sort((a, b) => a.precioBase - b.precioBase).slice(0, 3);
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

    /* Reescribir la lista en cada cambio de cantidad recrearia las
       tarjetas y perderia el foco. */
    const ids = recomendaciones.map(({ id }) => id).join(",");
    if (lista.dataset.ids === ids) return;
    lista.dataset.ids = ids;

    lista.innerHTML = recomendaciones.map((producto, indice) => {
        const precio = precios[producto.id] || producto.precioBase;
        const beneficios = Array.isArray(producto.infoDeVenta) ? producto.infoDeVenta : [];

        return `
            <article class="recommendation-card" style="--i: ${indice}" data-id="${producto.id}">
                <div class="recommendation-image">
                    <img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">
                    <div class="recommendation-beneficios-lista">
                        ${beneficios.map(item => `
                            <span class="recommendation-beneficio-item">
                                <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                                <span>${escaparHTML(item)}</span>
                            </span>
                        `).join("")}
                    </div>
                </div>
                <div class="recommendation-info">
                    <div class="recommendation-category">${escaparHTML(producto.categoria)}</div>
                    <h3>
                        <button class="recommendation-link" type="button" data-id="${producto.id}" aria-haspopup="dialog">
                            ${escaparHTML(producto.nombre)}
                        </button>
                    </h3>
                    <p>${escaparHTML(producto.descripcion)}</p>
                    <ul class="recommendation-beneficios-tactil" aria-label="Características">
                        ${beneficios.map(item => `
                            <li>
                                <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                                <span>${escaparHTML(item)}</span>
                            </li>
                        `).join("")}
                    </ul>
                    <div class="recommendation-footer">
                        <strong>${formatearPrecio(precio)}</strong>
                        <button class="recommendation-add" type="button" data-id="${producto.id}"
                            aria-label="Agregar ${escaparHTML(producto.nombre)} al carrito">
                            <span class="material-symbols-outlined">add_shopping_cart</span>
                            Agregar
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

/* --- Render del carrito ------------------------------------ */

function renderCart() {
    const container = document.getElementById("cartItems");
    const emptyCart = document.getElementById("emptyCart");

    if (!container || !emptyCart) return;

    const formulario = document.querySelector("#checkoutRoot form");
    if (formulario) formulario.hidden = cart.length === 0;

    if (cart.length === 0) {
        container.innerHTML = "";
        emptyCart.classList.remove("hidden");
        updateSummary();
        renderRecommendations();
        return;
    }

    emptyCart.classList.add("hidden");

    container.innerHTML = cart.map(item => {
        return `
        <article class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.nombre)}" loading="lazy" decoding="async">
            </div>
            <div class="cart-item-info">
                <h3>${escaparHTML(item.nombre)}</h3>
                <span class="cart-item-category">${escaparHTML(item.categoria) || "Producto ZAPI"}</span>
                <span class="cart-item-stock" data-stock="${item.id}" data-id="${item.id}"></span>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control" role="group" aria-label="Cantidad">
                    <button class="quantity-minus" data-id="${item.id}" aria-label="Disminuir cantidad" type="button">
                        <span class="material-symbols-outlined" aria-hidden="true">remove</span>
                    </button>
                    <span class="quantity-value" aria-live="polite">${item.cantidad}</span>
                    <button class="quantity-plus" data-id="${item.id}" aria-label="Aumentar cantidad" type="button">
                        <span class="material-symbols-outlined" aria-hidden="true">add</span>
                    </button>
                </div>
                <div class="cart-item-total">
                    <div class="cart-item-total-text">
                        <strong class="cart-item-line-total">${formatearPrecio(item.precio * item.cantidad)}</strong>
                        <small class="cart-item-unit-detail" ${item.cantidad <= 1 ? "hidden" : ""}>
                            ${item.cantidad} × ${formatearPrecio(item.precio)}
                        </small>
                    </div>
                    <button class="remove-item" data-id="${item.id}"
                        aria-label="Eliminar ${escaparHTML(item.nombre)} del carrito" type="button">
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            </div>
        </article>
    `;
    }).join("");

    pintarStockEnPantalla();
    updateSummary();
    renderRecommendations();
}

/* --- Acciones sobre el carrito ----------------------------- */

function changeQuantity(id, amount) {
    const item = cart.find(({ id: idItem }) => idItem === Number(id));
    if (!item) return;

    if (amount > 0) {
        const unidadesDisponibles = window.unidadesDe(item.id);
        if (Number.isFinite(unidadesDisponibles) && item.cantidad + amount > unidadesDisponibles) {
            mostrarEstado("No hay más unidades disponibles para este producto.", true);
            return;
        }
    }

    /* Bajar la cantidad nunca borra el producto: el 1 es el piso;
       para sacarlo esta la papelera. */
    item.cantidad = Math.max(1, item.cantidad + amount);
    guardarCarrito(cart);
    actualizarFilaCarrito(item);
    updateSummary();
    actualizarContador(false);
}

function removeProduct(id) {
    const idProducto = Number(id);
    const itemElement = document.querySelector(`.cart-item[data-id="${idProducto}"]`);

    if (itemElement) {
        itemElement.style.opacity = "0";
        itemElement.style.transform = "translateX(30px) scale(.96)";
    }

    setTimeout(() => {
        cart = cart.filter(({ id: idItem }) => idItem !== idProducto);
        confirmarCarrito();
    }, 220);
}

/* Delegacion de clicks de todo el documento: cubre las tarjetas del
   carrito y las recomendaciones sin enganchar cada boton. */
document.addEventListener("click", event => {
    const { target } = event;

    /* La tarjeta no es un boton: el nombre lo es. */
    const tarjeta = target.closest(".recommendation-card");
    if (tarjeta && !target.closest(".recommendation-add")) {
        window.abrirModalProducto(Number(tarjeta.dataset.id), tarjeta);
        return;
    }

    const agregar = target.closest(".recommendation-add");
    if (agregar) {
        if (!agregarProductoAlCarrito(Number(agregar.dataset.id))) return;
        return;
    }

    const sumar = target.closest(".quantity-plus");
    if (sumar) {
        changeQuantity(sumar.dataset.id, 1);
        return;
    }

    const restar = target.closest(".quantity-minus");
    if (restar) {
        changeQuantity(restar.dataset.id, -1);
        return;
    }

    const quitar = target.closest(".remove-item");
    if (quitar) removeProduct(quitar.dataset.id);
});

const clearCartButton = document.getElementById("clearCart");
if (clearCartButton) {
    clearCartButton.addEventListener("click", () => {
        if (cart.length === 0) return;
        if (!confirm("¿Querés vaciar el carrito?")) return;

        cart = [];
        confirmarCarrito();
    });
}

/* --- Enlace de WhatsApp ------------------------------------ */

/* Arma el mensaje del pedido y devuelve el enlace wa.me. Fuente de
   los items: el estado global `cart` y, si quedo vacio, el carrito
   guardado en el navegador. Devuelve "" si no hay nada para pedir. */
function construirUrlWhatsapp(datos = {}) {
    const items = cart.length > 0 ? cart : obtenerCarrito();
    if (items.length === 0) return "";

    const { subtotal, shipping, total } = calcularTotales(items);

    const productosTexto = items
        .map(({ nombre, cantidad, precio }) => `• ${nombre} x${cantidad} — ${formatearPrecio(precio * cantidad)}`)
        .join("\n");

    const contactoTexto = [
        `Nombre: ${datos.nombre || ""}`,
        `Teléfono: ${datos.telefono || ""}`,
        datos.email ? `Correo: ${datos.email}` : "",
        datos.zona ? `Zona: ${datos.zona}` : "",
        datos.notas ? `Notas: ${datos.notas}` : "",
    ].filter(Boolean).join("\n");

    const envioTexto = shipping === null
        ? "A coordinar por WhatsApp"
        : shipping === 0 && subtotal > 0
            ? "Gratis"
            : formatearPrecio(shipping);
    const totalTexto = total === null
        ? `${formatearPrecio(subtotal)} + envío a coordinar`
        : formatearPrecio(total);

    const mensaje = `Hola ZAPI

Quiero realizar el siguiente pedido:

${productosTexto}

━━━━━━━━━━━━━━━━━━

Subtotal: ${formatearPrecio(subtotal)}
Envío: ${envioTexto}

TOTAL: ${totalTexto}

━━━━━━━━━━━━━━━━━━

Datos de contacto

${contactoTexto}

¿Podrían confirmarme la disponibilidad y coordinar la entrega?

Gracias.`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

/* Redireccion directa: window.open() puede devolver una ventana no
   nula aunque el navegador haya bloqueado el popup, y en ese caso el
   chat nunca se abria. Con location.href siempre carga. */
function redirigirAWhatsApp(datos) {
    const urlWhatsApp = construirUrlWhatsapp(datos);

    if (urlWhatsApp) window.location.href = urlWhatsApp;

    return urlWhatsApp;
}

function abrirWhatsappPedido(datos) {
    return redirigirAWhatsApp(datos);
}

/* Baja el stock mostrado por las cantidades que se acaban de pedir.
   Con backend, el servidor ya las descontó y el refresco siguiente
   confirma el valor real; sin backend, el descuento queda guardado en
   el navegador. */
function descontarStockDelPedido(items) {
    const descontar = window.descontarStockPedido;
    if (typeof descontar === "function") descontar(items);
}

function generarCodigoPedido() {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const azar = Math.random().toString(16).slice(2, 6).padEnd(4, "0").toUpperCase();

    return `Z-${fecha}-${azar}`;
}

/* Guarda el pedido en el navegador para que "Mis pedidos" lo muestre.
   Solo sin backend: con backend el pedido lo guarda el servidor y esa
   pagina lee del servidor, no de aca. */
function registrarPedidoLocal(datos) {
    const guardar = window.guardarPedidoLocal;
    if (typeof guardar !== "function") return;

    const fnHayApi = window.hayApiConfigurada;
    if (typeof fnHayApi === "function" && fnHayApi()) return;

    if (cart.length === 0) return;

    const { subtotal, total } = calcularTotales(cart);

    guardar({
        id: generarCodigoPedido(),
        creado: new Date().toISOString(),
        estado: "pendiente",
        total: total === null ? subtotal : total,
        envio_pendiente: total === null,
        zona: datos.zona || null,
        notas: datos.notas || null,
        items: cart.map(({ id, nombre, precio, cantidad }) => ({
            producto_id: Number(id),
            nombre,
            precio: Number(precio),
            cantidad: Number(cantidad),
        })),
    });
}

/* Fallback de emergencia: si la API no responde, se rearma el pedido
   desde el carrito (estado global o almacenamiento) y se va a
   WhatsApp sin mostrar carteles de error. */
function respaldoAWhatsApp(datos) {
    if (cart.length === 0) cart = obtenerCarrito();

    descontarStockDelPedido(
        cart.map(({ id, cantidad }) => ({ id: Number(id), cantidad: Number(cantidad) }))
    );

    registrarPedidoLocal(datos);

    return redirigirAWhatsApp(datos);
}

/* --- Formulario de checkout -------------------------------- */

const CAMPOS_PEDIDO = {
    nombre: { input: "pedNombre", error: "pedErrorNombre" },
    telefono: { input: "pedTelefono", error: "pedErrorTelefono" },
};

/* Misma limpieza que el servidor (utils/texto.js): un salto de linea
   en el nombre romperia el JSON. */
function limpiarValor(valor) {
    return String(valor || "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
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

    formulario.querySelectorAll(".campo-input")
        .forEach(input => input.classList.remove("campo-con-error"));

    formulario.querySelectorAll(".campo-error")
        .forEach(error => { error.textContent = ""; });
}

function mostrarEstado(mensaje, esError) {
    const estado = document.getElementById("pedEstado");
    if (!estado) return;

    estado.textContent = mensaje;
    estado.hidden = false;
    estado.classList.toggle("checkout-estado-error", Boolean(esError));
}

/* Ajusta el carrito a lo que el backend dice que hay y avisa. */
function aplicarFaltantesDeStock(cuerpo) {
    const avisos = (cuerpo.shortages || []).map(({ id, nombre, disponibles }) => {
        const item = cart.find(({ id: idItem }) => idItem === Number(id));
        if (!item) return "";

        if (disponibles === null || disponibles <= 0) {
            cart = cart.filter(({ id: idItem }) => idItem !== Number(id));
            return `Sacamos “${nombre}” porque no quedan unidades.`;
        }

        if (disponibles < item.cantidad) {
            item.cantidad = disponibles;
            return `Bajamos “${nombre}” a ${disponibles}.`;
        }

        return "";
    }).filter(Boolean).join(" ");

    confirmarCarrito();
    mostrarEstado(
        (cuerpo.error || "No hay stock suficiente") + " " + avisos +
        " Revisá las cantidades e intentá de nuevo.",
        true
    );
}

async function enviarPedido(evento) {
    evento.preventDefault();

    if (cart.length === 0) {
        mostrarEstado("Agregá al menos un producto al carrito.", true);
        return;
    }

    limpiarErrores();

    const leerCampo = id => limpiarValor(document.getElementById(id).value);
    const nombre = leerCampo("pedNombre");
    const telefono = leerCampo("pedTelefono");

    if (nombre.length < 2) {
        marcarCampo("nombre", "Escribí tu nombre");
        return;
    }

    if (telefono.replace(/\D/g, "").length < 6) {
        marcarCampo("telefono", "Falta un teléfono de contacto");
        return;
    }

    const datos = {
        nombre,
        telefono,
        email: leerCampo("pedEmail") || null,
        zona: leerCampo("pedZona") || null,
        notas: leerCampo("pedNotas") || null,
    };

    const boton = document.getElementById("whatsappButton");
    const contenidoBoton = boton ? boton.innerHTML : "";

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando pedido...";
    }

    const restaurarBoton = () => {
        if (!boton) return;
        boton.disabled = false;
        boton.innerHTML = contenidoBoton;
    };

    const items = cart.map(({ id, cantidad }) => ({ id: Number(id), cantidad: Number(cantidad) }));

    /* Sin backend configurado (hosting estatico): se arma el pedido y
       se abre WhatsApp, sin intentar la API. */
    const fnHayApi = window.hayApiConfigurada;
    const hayBackend = typeof fnHayApi !== "function" || fnHayApi();

    if (!hayBackend) {
        abrirWhatsappPedido(datos);
        descontarStockDelPedido(items);
        registrarPedidoLocal(datos);
        cart = [];
        confirmarCarrito();
        mostrarEstado("Pedido preparado: completá el envío en WhatsApp.", false);
        restaurarBoton();
        return;
    }

    try {
        const respuesta = await fetch(window.urlApi("/api/pedidos"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...datos, items }),
        });

        const estado = respuesta.status;
        const cuerpo = await respuesta.json().catch(() => ({}));

        if (estado === 201) {
            mostrarEstado(
                `Pedido ${cuerpo.id} confirmado por ${formatearPrecio(cuerpo.total)}. ` +
                "Te contactamos para coordinar la entrega.",
                false
            );

            descontarStockDelPedido(items);
            abrirWhatsappPedido(datos);
            cart = [];
            confirmarCarrito();

            /* Variable aparte: asignar directo al global confundiria al verificador de scripts. */
            const refrescarStock = window.actualizarStock;
            if (typeof refrescarStock === "function") refrescarStock();
            return;
        }

        if (estado === 409) {
            aplicarFaltantesDeStock(cuerpo);
            return;
        }

        if (estado === 400 && cuerpo.campo) {
            marcarCampo(cuerpo.campo, cuerpo.error || "Revisá este campo");
            mostrarEstado(cuerpo.error || "Revisá los datos del pedido.", true);
            return;
        }

        /* Cualquier otra respuesta no deja al cliente atrapado: mismo
           fallback de emergencia que el catch. */
        respaldoAWhatsApp(datos);
    } catch (error) {
        /* El backend no respondio (caido, CORS, red): se toma el
           carrito y se va a WhatsApp, sin cartel de error. */
        console.error("No se pudo enviar el pedido por la API:", error);
        respaldoAWhatsApp(datos);
    } finally {
        restaurarBoton();
    }
}

const whatsappButton = document.getElementById("whatsappButton");
if (whatsappButton) whatsappButton.addEventListener("click", enviarPedido);

function montarCheckout() {
    const raiz = document.getElementById("checkoutRoot");
    if (!raiz) return;

    raiz.innerHTML = `
        <form id="checkoutForm" class="checkout-form" novalidate>
            <h3>Datos de contacto</h3>

            <label class="campo-label" for="pedNombre">
                Nombre <span aria-hidden="true">*</span>
            </label>
            <input class="campo-input" id="pedNombre" name="nombre" type="text"
                maxlength="120" autocomplete="name" aria-describedby="pedErrorNombre">
            <span class="campo-error" id="pedErrorNombre"></span>

            <label class="campo-label" for="pedTelefono">
                Teléfono <span aria-hidden="true">*</span>
            </label>
            <input class="campo-input" id="pedTelefono" name="telefono" type="tel"
                inputmode="tel" maxlength="40" autocomplete="tel" aria-describedby="pedErrorTelefono">
            <span class="campo-error" id="pedErrorTelefono"></span>

            <label class="campo-label" for="pedEmail">Correo electrónico (opcional)</label>
            <input class="campo-input" id="pedEmail" name="email" type="email"
                inputmode="email" maxlength="160" autocomplete="email">

            <label class="campo-label" for="pedZona">Zona (opcional)</label>
            <input class="campo-input" id="pedZona" name="zona" type="text"
                maxlength="120" autocomplete="address-level2">

            <label class="campo-label" for="pedNotas">Notas (opcional)</label>
            <textarea class="campo-input campo-area" id="pedNotas" name="notas"
                rows="3" maxlength="500"></textarea>
        </form>

        <p class="checkout-estado" id="pedEstado" role="status" aria-live="polite" hidden></p>
    `;

    const formulario = raiz.querySelector("form");
    formulario.hidden = cart.length === 0;
    formulario.addEventListener("submit", enviarPedido);
}

/* --- Arranque ---------------------------------------------- */

document.addEventListener("DOMContentLoaded", montarCheckout);

suscribirAlCarrito(sincronizarCarrito);
alCargarElCatalogo(function () {
    sincronizarCarrito();
    /* El conteo inicial corre con el catalogo vacio (da 0):
       se recalcula al llegar para que los badges muestren el
       total real en vez de quedar congelados. */
    if (typeof actualizarContador === "function") {
        actualizarContador(false);
    }
});
