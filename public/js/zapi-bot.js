const ZAPI_NOMBRE = "Brotecito";

const ZAPI_API = window.urlApi("/api/asistente");
const ZAPI_HISTORIAL_MAX = 12;
const ZAPI_ESPERA_MS = 25000;

let zapiAsistenteActivo = false;
let zapiHistorial = [];


const ZAPI_FAQ = [

    {
        claves: ["horario", "horarios", "abren", "cierran", "atencion", "atención", "cuando", "dias", "días"],
        respuesta:
            "Atendemos de <strong>lunes a viernes de 9 a 18 hs</strong> y " +
            "<strong>sábados de 9 a 13 hs</strong>. 🌿<br><br>" +
            "El vivero queda en Canelones y también coordinamos entregas " +
            "a todo el país. Si escribinos fuera de horario, te contestamos " +
            "lo antes posible por WhatsApp."
    },
    {
        claves: ["envio", "envíos", "enviar", "delivery", "entrega", "entregar", "reparto", "llegan", "llega", "domicilio", "transportista"],
        respuesta:
            "Sí, hacemos <strong>envíos a todo el Uruguay</strong>. 📦<br><br>" +
            "<ul>" +
            "<li>Montevideo: entregas en 24 hs</li>" +
            "<li>Interior: 48 a 72 hs</li>" +
            "<li>Retiro en vivero: sin costo</li>" +
            "</ul>" +
            "El costo se calcula según la cantidad y el destino. " +
            "Lo coordinamos contigo al confirmar el pedido."
    },
    {
        claves: ["precio", "precios", "cuanto", "cuesta", "valor", "cuánto", "caro", "barato", "descuento", "oferta", "promo", "promocion", "promoción", "rebaja", "sale"],
        respuesta:
            "Todos nuestros productos tienen <strong>precios fijos</strong> " +
            "y los podés ver directamente en el catálogo. 💰<br><br>" +
            "Además, con el <strong>Club ZAPI</strong> acumulás puntos por " +
            "cada compra y los usás como descuento en tu próximo pedido. " +
            "¿Querés que te muestre las promociones vigentes?"
    },
    {
        claves: ["stock", "disponible", "disponibilidad", "existe", "hay", "tienen"],
        respuesta:
            "El stock cambia seguido, sobre todo en temporada. 🌱<br><br>" +
            "Lo más seguro es <strong>armar tu carrito</strong> y enviarlo " +
            "por WhatsApp: te confirmamos disponibilidad al instante y te " +
            "reservamos todo lo que pediste."
    },
    {
        claves: ["cuidado", "cuidados", "regar", "riego", "agua", "luz", "sol", "cultivar", "como crece", "mantener", "sustrato", "fertilizar", "plaga", "amarillo", "amarillenta", "seca", "caen", "hojas", "marchita", "murio", "se muere"],
        respuesta:
            "Cada compra incluye una <strong>guía de cuidados digital</strong> 📖<br><br>" +
            " Tips generales:<br>" +
            "<ul>" +
            "<li>Revisá la humedad del sustrato antes de regar</li>" +
            "<li>Ubicá según la necesidad de luz de la especie</li>" +
            "<li>Las suculentas y cactus necesitan poca agua</li>" +
            "<li>Las aromáticas agradan el sol directo</li>" +
            "</ul>" +
            "Decime qué planta tenés y te doy indicaciones puntuales."
    },
    {
        claves: ["servicio", "servicios", "asesoria", "asesoramiento", "consultoria", "jardin", "jardín", "huerta", "diseno", "diseño", "mantenimiento", "empresa", "corporativo", "capacitacion", "capacitación", "taller", "proyecto"],
        respuesta:
            "Ofrecemos <strong>servicios agroecológicos</strong> para casas, " +
            "empresas e instituciones: 🌿<br><br>" +
            "<ul>" +
            "<li>Asesoramiento personalizado</li>" +
            "<li>Diseño de jardines y huertas familiares</li>" +
            "<li>Selección de especies</li>" +
            "<li>Mantenimiento de espacios verdes</li>" +
            "<li>Proyectos para empresas</li>" +
            "<li>Capacitaciones y talleres</li>" +
            "</ul>" +
            "¿Querés un presupuesto para tu proyecto?"
    },
    {
        claves: ["pago", "pagar", "forma", "tarjeta", "credito", "crédito", "debito", "débito", "transferencia", "efectivo", "factura", "facturar"],
        respuesta:
            "Aceptamos:<br><br>" +
            "<ul>" +
            "<li>Efectivo</li>" +
            "<li>Transferencia bancaria</li>" +
            "<li>Tarjetas de crédito y débito</li>" +
            "</ul>" +
            "Emitimos factura electrónica sin costo adicional. 🧾"
    },
    {
        claves: ["punto", "puntos", "club", "fidelidad", "recompensa", "acumular", "acumulo", "acumula", "beneficio", "vip", "miembro", "socio"],
        respuesta:
            "¡Somos el <strong>Club ZAPI</strong>! 🌟<br><br>" +
            "Por cada $1.000 que gastás sumás <strong>100 puntos</strong>. " +
            "Con 500 puntos te llevás un <strong>10% de descuento</strong>, " +
            "y con 1.500 puntos, un <strong>15%</strong> en tu próxima compra.<br><br>" +
            "Los puntos no vencen y se acumulan con cada pedido. " +
            "¿Querés consultar tus puntos?"
    },
    {
        claves: ["pedido", "mi pedido", "estado", "seguimiento", "rastreo", "llegó", "llego", "recibí", "recibí"],
        respuesta:
            "Para consultar el estado de tu pedido, escribinos por " +
            "<strong>WhatsApp</strong> con tu nombre y te lo verificamos al " +
            "instante. 📲<br><br>" +
            "Si tu pedido ya está en el carrito, podés enviarlo " +
            "directamente desde la página del carrito."
    },
    {
        claves: ["cactus", "suculenta", "suculentas"],
        respuesta:
            "Las suculentas y cactus son de los más elegidos. 🌵<br><br>" +
            "Vienen en maceta cerámica, necesitan muy poco riego y son " +
            "perfectos para interiores luminosos. En el catálogo tenés el " +
            "<strong>pack mix</strong>, que sale hasta un 30% más barato " +
            "que comprarlas por separado."
    },
    {
        claves: ["aromatica", "aromáticas", "aromatica", "albahaca", "ruda", "romero", "menta", "huerta", "hortaliza", "verdura", "comestible", "cultivo", "siembra", "plantin"],
        respuesta:
            "Tenemos aromáticas y hortalizas de <strong>cultivo " +
            "agroecológico</strong> 🌿<br><br>" +
            "La albahaca rinde más de 8 semanas de cosecha continua y la " +
            "ruda se puede resilembrar hasta 4 veces. Ideal para empezar " +
            "tu huerta en casa o balcón."
    },
    {
        claves: ["recomienda", "recomendacion", "recomendación", "sugerencia", "sugerencias", "que me recomendas", "cual compro", "qué me compr", "ayuda", "no sé", "no se"],
        respuesta:
            "Con gusto te ayudo a elegir. 🌿<br><br>" +
            "Contame:<br>" +
            "<ul>" +
            "<li>¿Lo querés para interior o exterior?</li>" +
            "<li>¿Tenés mucha luz o poca?</li>" +
            "<li>¿Lo querés lindo o comestible?</li>" +
            "<li>¿Cuánto regás?</li>" +
            "</ul>" +
            "Con eso te digo exactamente qué planta te conviene."
    },
    {
        claves: ["mascota", "gato", "perro", "animal", "toxica", "tóxica", "venenosa", "seguro", "niños", "niño", "bebe", "bebé"],
        respuesta:
            "Buena pregunta. 🌿<br><br>" +
            "<strong>La albahaca y la ruda son seguras</strong> para " +
            "mascotas y niños, pero algunas suculentas <strong>no son " +
            "tóxicas para gatos ni perros</strong>.<br><br>" +
            "Decime cuáles tenés en casa y te confirmo antes de comprar."
    },
    {
        claves: ["gracias", "genial", "perfecto", "buenisimo", "barbaro", "barbaro", "copado", "joya"],
        respuesta:
            "¡De nada! 🌿 Si necesitás algo más, escribime por acá o por " +
            "WhatsApp al <strong>098 268 560</strong>. ¡Que tengas una " +
            "gran semana!",
        despedida: true
    }

];


const ZAPI_PROMOS = {

    primera: {
        titulo: "🎁 10% en tu primera compra",
        detalle:
            "Mostrame este código al confirmar tu pedido y te lo aplicamos " +
            "directo. <strong>Válido en toda la web.</strong>",
        codigo: "ZAPI10"
    },

    envio: {
        titulo: "🚚 Envío gratis",
        detalle:
            "En compras superiores a <strong>$2.500</strong> el envío a " +
            "Montevideo y áreas metropolitanas no tiene costo.",
        codigo: null
    },

    club: {
        titulo: "🌟 Club ZAPI: 15% en tu próxima compra",
        detalle:
            "Con 1.500 puntos acumulados te corresponde un 15% de " +
            "descuento. Los puntos se acreditan al confirmar cada pedido " +
            "y <strong>no vencen</strong>.",
        codigo: null
    },

    combo: {
        titulo: "🌵 Pack Suculentas: 30% OFF",
        detalle:
            "El <strong>pack mix de 6 suculentas</strong> tiene el mejor " +
            "precio por unidad de todo el catálogo. Limitado a stock.",
        codigo: null
    },

    referred: {
        titulo: "🤝 Traé un amigo y ganá",
        detalle:
            "Si tu amigo se registra con tu recomendación, ambos reciben " +
            "<strong>$200 de descuento</strong> en su primer pedido.",
        codigo: null
    }

};


const ZAPI_MENU = [
    { etiqueta: "Cuidados", icono: "eco", clave: "cuidado" },
    { etiqueta: "Envíos", icono: "local_shipping", clave: "envio" },
    { etiqueta: "Club ZAPI · beneficios", icono: "star", clave: "club" },
    { etiqueta: "Servicios", icono: "home_repair_service", clave: "servicio" },
    { etiqueta: "Promociones", icono: "local_offer", clave: "promo" }
];


const ZAPI_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(ZAPI_DIACRITICOS, "")
        .trim();
}

function detectarIntencion(texto) {

    const limpio = normalizar(texto);

    const especificas = [
        ["cactus"], ["suculenta", "suculentas"],
        ["aromatica", "aromaticas", "albahaca", "ruda", "romero", "menta", "hortaliza", "verdura"],
        ["club", "punto", "puntos", "fidelidad", "vip", "acumular"],
        ["envio", "envios", "delivery", "entrega", "entregar", "reparto", "llega", "llegan"],
        ["mascota", "gato", "perro", "animal", "toxica", "niños", "bebe"],
        ["pago", "pagar", "tarjeta", "credito", "debito", "transferencia", "efectivo", "factura"],
        ["horario", "horarios", "abren", "cierran", "atencion", "dias"],
        ["servicio", "asesoria", "jardin", "huerta", "diseno", "mantenimiento", "capacitacion", "taller"],
        ["cuidado", "regar", "riego", "agua", "luz", "sustrato", "fertilizar"],
        ["recomienda", "recomendacion", "sugerencia", "ayuda"],
        ["pedido", "seguimiento", "rastreo", "estado"]
    ];

    for (const grupo of especificas) {
        if (grupo.some(clave => limpio.includes(normalizar(clave)))) {
            const encontrada = ZAPI_FAQ.find(
                faq => faq.claves.includes(grupo[0])
            );
            if (encontrada) return encontrada;
        }
    }

    const social = ["gracias", "genial", "perfecto", "copado", "joya", "barbaro"];

    if (social.some(clave => limpio.includes(clave))) {
        return ZAPI_FAQ.find(faq => faq.claves.includes("gracias"));
    }

    for (const faq of ZAPI_FAQ) {
        if (faq.claves.some(clave => limpio.includes(normalizar(clave)))) {
            return faq;
        }
    }

    return null;
}


function respuestaPromociones() {

    const p = ZAPI_PROMOS;

    return (
        "Estas son las <strong>promociones vigentes</strong> ahora: 🎁<br><br>" +

        `<strong>${p.primera.titulo}</strong><br>${p.primera.detalle}<br>` +
        `Código: <strong>${p.primera.codigo}</strong><br><br>` +

        `<strong>${p.envio.titulo}</strong><br>${p.envio.detalle}<br><br>` +

        `<strong>${p.combo.titulo}</strong><br>${p.combo.detalle}<br><br>` +

        `<strong>${p.referred.titulo}</strong><br>${p.referred.detalle}<br><br>` +

        `¿Querés que te ayude a armar el pedido con alguna de estas?`
    );
}

function respuestaClub() {

    const c = ZAPI_PROMOS.club;

    return (
        `¡Bienvenido al <strong>Club ZAPI</strong>! 🌟<br><br>` +

        "<strong>Cómo funciona:</strong><br>" +
        "<ul>" +
        "<li>Por cada $1.000 de compra sumás 100 puntos</li>" +
        "<li>500 puntos = 10% de descuento</li>" +
        "<li>1.000 puntos = 12% de descuento</li>" +
        "<li>1.500 puntos = 15% de descuento</li>" +
        "</ul>" +

        `<strong>Ventajas extra:</strong><br>${c.detalle}<br><br>` +

        "Los puntos se acreditan al confirmar el pedido, nunca vencen y " +
        "se pueden usar en compras online o en el vivero.<br><br>" +

        "¿Querés que te recomiende un producto para empezar a sumar puntos?"
    );
}

function respuestaCarrito() {

    const carrito = obtenerCarrito();

    if (carrito.length === 0) {

        return (
            "Tu carrito está vacío por ahora. 🛒<br><br>" +
            "Te llevo al catálogo para que elijas tus plantas. " +
            "Si querés, también puedo <strong>recomendarte</strong> " +
            "según cómo tengas el espacio: decime si es interior o " +
            "exterior y cuánta luz tenés. 🌿"
        );

    }

    const unidades = carrito.reduce((suma, i) => suma + i.cantidad, 0);

    const subtotal = carrito.reduce(
        (suma, i) => suma + (i.precio * i.cantidad), 0
    );

    const faltaParaEnvioGratis = 2500 - subtotal;

    let extra = "";

    if (faltaParaEnvioGratis > 0) {
        extra =
            `<br><br>💡 Te faltan <strong>${formatearPrecio(faltaParaEnvioGratis)}</strong> ` +
            "para tener <strong>envío gratis</strong>.";
    } else {
        extra = "<br><br>🎉 ¡Tu pedido ya califica para <strong>envío gratis</strong>!";
    }

    return (
        `Tenés <strong>${unidades} producto${unidades > 1 ? "s" : ""}</strong> ` +
        `en el carrito por <strong>${formatearPrecio(subtotal)}</strong>. 🛒${extra}<br><br>` +
        "Cuando quieras, <strong>envialo por WhatsApp</strong> desde la " +
        "página del carrito y te confirmamos la disponibilidad al toque."
    );
}

function respuestaServicios() {

    return (
        "Estos son nuestros <strong>servicios</strong>: 🛠️<br><br>" +
        "<ul>" +
        "<li>Asesoramiento personalizado</li>" +
        "<li>Diseño de jardines y huertas familiares</li>" +
        "<li>Selección de especies según tu espacio</li>" +
        "<li>Mantenimiento de espacios verdes</li>" +
        "<li>Proyectos para empresas e instituciones</li>" +
        "<li>Capacitaciones y talleres</li>" +
        "</ul>" +
        "Trabajamos con <strong>enfoque agroecológico</strong>: sin " +
        "plaguicidas, con especies adaptadas al clima y con " +
        "prácticas sostenibles en el tiempo.<br><br>" +
        "¿Querés un presupuesto? Contame las medidas de tu espacio y te " +
        "orientamos sin cargo."
    );
}


function generarRespuesta(texto) {

    const pregunta = normalizar(texto.trim());

    if (pregunta.includes("envio") || pregunta.includes("envío") ||
        pregunta.includes("envios") || pregunta.includes("envíos")) {
        return ZAPI_FAQ.find(f => f.claves.includes("envio")).respuesta;
    }

    if (pregunta.includes("promo") || pregunta.includes("oferta") ||
        pregunta.includes("descuento") || pregunta.includes("rebaja")) {
        return respuestaPromociones();
    }

    if (pregunta.includes("club") || pregunta.includes("punto") ||
        pregunta.includes("puntos") || pregunta.includes("fidelidad")) {
        return respuestaClub();
    }

    if (pregunta.includes("carrito") || pregunta.includes("pedido")) {
        return respuestaCarrito();
    }

    if (pregunta.includes("servicio")) {
        return respuestaServicios();
    }

    if (pregunta.includes("humano") || pregunta.includes("persona") ||
        pregunta.includes("asesor") || pregunta.includes("whatsapp") ||
        pregunta.includes("telefono") || pregunta.includes("teléfono") ||
        pregunta.includes("llamar")) {

        return (
            "¡Dale, te paso con el equipo! 🌿<br><br>" +
            "Escribinos por WhatsApp al <strong>098 268 560</strong> " +
            "y te contestamos enseguida. 📲"
        );
    }

    const codigo = ZAPI_PROMOS.primera.codigo.toLowerCase();

    if (pregunta.includes(codigo) || pregunta.includes("codigo") ||
        pregunta.includes("código") || pregunta.includes("cupon") ||
        pregunta.includes("cupón")) {

        return (
            `Tu código es <strong>${ZAPI_PROMOS.primera.codigo}</strong> 🎁<br><br>` +
            "Agrégalo al confirmar el pedido por WhatsApp y te aplicamos " +
            "el 10% de descuento en tu primera compra."
        );
    }

    const faq = detectarIntencion(texto);

    if (faq) {
        return faq.respuesta;
    }

    return (
        "Mmm, no encontré eso en mi base. 🤔<br><br>" +
        "Probá preguntarme por:<br>" +
        "<ul>" +
        "<li>Envíos y entregas</li>" +
        "<li>Promociones y descuentos</li>" +
        "<li>Cuidados de tus plantas</li>" +
        "<li>Servicios para tu proyecto</li>" +
        "<li>Club ZAPI y puntos</li>" +
        "</ul>" +
        "Si preferís hablar con una persona, escribinos por WhatsApp " +
        "al <strong>098 268 560</strong>. 🌿"
    );
}


const ZAPI_BOT_HTML = `
    <button
        class="zapi-toggle"
        id="zapiToggle"
        type="button"
        aria-label="Abrir chat con ${ZAPI_NOMBRE}"
        aria-expanded="false">

        <span class="material-symbols-outlined zapi-chat-icon">forum</span>
        <span class="material-symbols-outlined zapi-close">close</span>

        <span class="zapi-badge" id="zapiBadge">1</span>

    </button>

    <section
        class="zapi-panel"
        id="zapiPanel"
        role="dialog"
        aria-label="Chat con ${ZAPI_NOMBRE}"
        aria-modal="false">

        <header class="zapi-header">

            <div class="zapi-avatar">
                <svg
                    class="zapi-sprout"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false">
                    <path
                        class="zapi-sprout-stem"
                        d="M12 19v-7.5"></path>
                    <path
                        class="zapi-sprout-leaf"
                        d="M12 11.5c0-3.3-2.5-5.5-6-5.5 0 3.3 2.5 5.5 6 5.5z"></path>
                    <path
                        class="zapi-sprout-leaf"
                        d="M12 11.5c0-3.3 2.5-5.5 6-5.5 0 3.3-2.5 5.5-6 5.5z"></path>
                </svg>
            </div>

            <div class="zapi-header-text">
                <h4>${ZAPI_NOMBRE}</h4>
                <span class="zapi-status">
                    <span class="material-symbols-outlined zapi-status-dot">circle</span>
                    Asistente virtual de ZAPI
                </span>
            </div>

            <!-- La acción "ver carrito" se mudó de los atajos a
                 acá, para que la fila de botones sea solo de
                 temas. aria-label porque el ícono solo no dice
                 nada por sí mismo. -->
            <a
                class="zapi-header-accion"
                href="carrito.html"
                aria-label="Ver el carrito">

                <span class="material-symbols-outlined">shopping_cart</span>

            </a>

            <button
                class="zapi-header-close"
                id="zapiClose"
                type="button"
                aria-label="Cerrar chat">

                <span class="material-symbols-outlined">close</span>

            </button>

        </header>

        <div
            class="zapi-messages"
            id="zapiMessages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversación con ${ZAPI_NOMBRE}"
            tabindex="0">
        </div>

        <div class="zapi-chips" id="zapiChips"></div>

        <!-- El bot resuelve lo que puede, pero siempre tiene que
             quedar una salida a una persona. Va siempre visible,
             arriba del campo, para no depender de acertar la
             pregunta. -->
        <div class="zapi-humano">
            <span>¿Preferís hablar con una persona?</span>
            <a
                class="zapi-humano-link"
                href="https://wa.me/098268560?text=Hola%20ZAPI%2C%20necesito%20ayuda%20con%20un%20pedido"
                target="_blank"
                rel="noopener">
                <span class="material-symbols-outlined" aria-hidden="true">support_agent</span>
                Hablar con el equipo
            </a>
        </div>

        <form class="zapi-input-area" id="zapiForm">

            <input
                type="text"
                id="zapiInput"
                placeholder="Escribí tu consulta..."
                autocomplete="off"
                aria-label="Escribir mensaje">

            <button class="zapi-send" type="submit" aria-label="Enviar mensaje">
                <span class="material-symbols-outlined">send</span>
            </button>

        </form>

    </section>
`;


const ZAPI_BARRAS_SUPERIORES =
    "header, .cart-header, .topbar, .top-bar, .barra-superior";

function initZapiHeaderMeasure() {

    const bot = document.getElementById("zapiBot");

    if (!bot) return;

    let frame = null;

    function medir() {

        frame = null;

        const limite = window.innerWidth * 0.6;
        let max = 0;

        document.querySelectorAll(ZAPI_BARRAS_SUPERIORES).forEach(el => {

            const posicion = getComputedStyle(el).position;

            if (posicion !== "fixed" && posicion !== "sticky") return;

            const caja = el.getBoundingClientRect();

            if (!caja.width || !caja.height) return;

            if (caja.top > 8 || caja.width < limite) return;

            max = Math.max(max, caja.bottom);

        });

        bot.style.setProperty("--site-header-h", `${Math.ceil(max)}px`);
    }

    function programar() {

        if (frame) return;

        frame = requestAnimationFrame(medir);
    }

    window.addEventListener("resize", programar);
    window.addEventListener("orientationchange", programar);

    if ("ResizeObserver" in window) {

        const observador = new ResizeObserver(programar);

        document.querySelectorAll(ZAPI_BARRAS_SUPERIORES)
            .forEach(el => observador.observe(el));

        observador.observe(document.body);
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(programar);
    }

    medir();
    window.addEventListener("load", programar);
}

function zapiEsperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function zapiTrack(tipo, datos = {}) {
    try {
        fetch(`${ZAPI_API}/tracking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo, ...datos }),
            keepalive: true,
        }).catch(() => {});
    } catch {
    }
}

window.zapiTrack = zapiTrack;

function zapiSlugProducto() {
    const coincidencia = (window.location.pathname || "")
        .match(/\/productos\/([^/]+)\.html$/i);

    return coincidencia ? coincidencia[1] : "";
}

async function zapiCargarConfig() {
    try {
        const respuesta = await fetch(`${ZAPI_API}/config`);

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        zapiAsistenteActivo = Boolean(datos && datos.asistente);

        const enlace = datos && datos.negocio && datos.negocio.contacto
            && datos.negocio.contacto.whatsappUrl;

        if (enlace) {
            const humano = document.querySelector(".zapi-humano-link");

            if (humano) humano.setAttribute("href", enlace);
        }
    } catch {
        zapiAsistenteActivo = false;
    }
}

async function zapiConsultar(texto) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ZAPI_ESPERA_MS);

    try {
        const respuesta = await fetch(`${ZAPI_API}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: texto }),
            signal: control.signal,
        });

        if (!respuesta.ok) return null;

        return await respuesta.json();
    } catch {
        return null;
    } finally {
        clearTimeout(reloj);
    }
}

function initZapiBot() {

    if (document.getElementById("zapiBot")) return;

    const contenedor = document.createElement("div");

    contenedor.className = "zapi-bot";
    contenedor.id = "zapiBot";
    contenedor.innerHTML = ZAPI_BOT_HTML;

    document.body.appendChild(contenedor);

    const panel = document.getElementById("zapiPanel");
    const toggle = document.getElementById("zapiToggle");
    const close = document.getElementById("zapiClose");
    const messages = document.getElementById("zapiMessages");
    const chips = document.getElementById("zapiChips");
    const form = document.getElementById("zapiForm");
    const input = document.getElementById("zapiInput");
    const badge = document.getElementById("zapiBadge");

    let abierto = false;
    let iniciado = false;

    const ZAPI_MARGEN_ABAJO = 80;
    let seguirAbajo = true;

    function estaAbajo() {
        return messages.scrollHeight
            - messages.scrollTop
            - messages.clientHeight <= ZAPI_MARGEN_ABAJO;
    }

    function scrollAbajo(forzar = false) {
        if (!forzar && !seguirAbajo) return;

        messages.scrollTop = messages.scrollHeight;
    }

    messages.addEventListener("scroll", () => {
        seguirAbajo = estaAbajo();
    }, { passive: true });
    /* Las respuestas del bot van por innerHTML; lo del visitante, como texto plano (XSS). */
    function agregarMensaje(texto, tipo, esHTML = true) {

        const div = document.createElement("div");

        div.className = `zapi-msg ${tipo}`;

        if (esHTML) {
            div.innerHTML = texto;
        } else {
            div.textContent = texto;
        }

        messages.appendChild(div);

        scrollAbajo();

        return div;

    }

    function mostrarEscribiendo() {

        const typing = document.createElement("div");

        typing.className = "zapi-typing";
        typing.id = "zapiTyping";
        typing.innerHTML = "<span></span><span></span><span></span>";

        messages.appendChild(typing);
        scrollAbajo();
    }

    function quitarEscribiendo() {
        const typing = document.getElementById("zapiTyping");
        if (typing) typing.remove();
    }

    function pintarChips() {

        chips.innerHTML = ZAPI_MENU.map(item =>
            `<button class="zapi-chip" type="button" data-clave="${escaparHTML(item.clave)}">
                <span class="material-symbols-outlined zapi-chip-icono" aria-hidden="true">${escaparHTML(item.icono)}</span>
                ${escaparHTML(item.etiqueta)}
            </button>`
        ).join("");

    }

    /* Tarjetas de productos sugeridos por el asistente: se escapa todo por las dudas. */
    function pintarRecomendaciones(recomendaciones) {

        if (!Array.isArray(recomendaciones) || !recomendaciones.length) return;

        const contenedor = document.createElement("div");

        contenedor.className = "zapi-recos";

        recomendaciones.slice(0, 3).forEach(producto => {

            const tarjeta = document.createElement("div");

            tarjeta.className = "zapi-reco";

            const imagen = producto.imagen
                ? `<img src="${escaparHTML(producto.imagen)}" alt="" loading="lazy">`
                : "";

            tarjeta.innerHTML =
                imagen +
                `<div class="zapi-reco-info">
                    <a class="zapi-reco-nombre" href="${escaparHTML(producto.url)}">${escaparHTML(producto.nombre)}</a>
                    ${(typeof formatearPrecio === "function" && producto.precio !== null && producto.precio !== undefined)
                        ? `<span class="zapi-reco-precio">${escaparHTML(formatearPrecio(producto.precio))}</span>`
                        : ""}
                </div>
                <button type="button" class="zapi-reco-agregar" data-id="${escaparHTML(producto.id)}">Agregar</button>`;

            contenedor.appendChild(tarjeta);

        });

        messages.appendChild(contenedor);

        contenedor.querySelectorAll("img").forEach(img => {
            const ajustar = () => scrollAbajo();

            if (img.complete) {
                ajustar();
            } else {
                img.addEventListener("load", ajustar, { once: true });
            }
        });

        scrollAbajo();
    }

    async function responder(texto) {

        agregarMensaje(texto, "user", false);

        zapiHistorial.push({ rol: "user", texto });

        if (zapiHistorial.length > ZAPI_HISTORIAL_MAX) {
            zapiHistorial = zapiHistorial.slice(-ZAPI_HISTORIAL_MAX);
        }

        zapiTrack("mensaje_chat", { detalle: texto.slice(0, 120) });

        mostrarEscribiendo();

        let salida = null;

        if (zapiAsistenteActivo) {
            salida = await zapiConsultar(texto);
        } else {
            await zapiEsperar(400 + Math.random() * 400);
        }

        quitarEscribiendo();

        const preguntaCarrito = normalizar(texto).includes("carrito")
            || normalizar(texto).includes("pedido");

        if (salida && typeof salida.respuesta === "string" && salida.respuesta.trim()) {

            agregarMensaje(salida.respuesta, "bot");

            zapiHistorial.push({ rol: "bot", texto: salida.respuesta });

            if (zapiHistorial.length > ZAPI_HISTORIAL_MAX) {
                zapiHistorial = zapiHistorial.slice(-ZAPI_HISTORIAL_MAX);
            }

            pintarRecomendaciones(salida.recomendaciones);

            if (preguntaCarrito) setTimeout(() => actualizarContador(), 100);

            return;
        }

        const faq = detectarIntencion(texto);

        agregarMensaje(generarRespuesta(texto), "bot");

        if (faq && faq.despedida) {
            setTimeout(() => {
                agregarMensaje(
                    "Por cierto, si querés sumar puntos al Club ZAPI, " +
                    "hoy tenés <strong>envío gratis</strong> en compras " +
                    "mayores a $2.500. 🚚 ¿Te ayudo a armar el pedido?",
                    "bot"
                );
            }, 900);
        }

        if (preguntaCarrito) {
            setTimeout(() => actualizarContador(), 100);
        }
    }

    function saludoInicial() {

        agregarMensaje(
            `¡Hola! 🌿 Soy <strong>${ZAPI_NOMBRE}</strong>, el asistente de ZAPI. ` +
            "¿En qué te ayudo hoy?",
            "bot"
        );

    }

    function abrir() {

        abierto = true;

        panel.classList.add("open");
        contenedor.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", `Cerrar chat con ${ZAPI_NOMBRE}`);

        if (!iniciado) {
            iniciado = true;
            saludoInicial();
        }

        scrollAbajo(true);

        setTimeout(() => input.focus(), 300);
    }

    function cerrar() {

        abierto = false;

        panel.classList.remove("open");
        contenedor.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `Abrir chat con ${ZAPI_NOMBRE}`);

        badge.textContent = "";
        badge.style.display = "none";

        toggle.focus();
    }

    toggle.addEventListener("click", () => {
        abierto ? cerrar() : abrir();
    });

    close.addEventListener("click", cerrar);

    /* El Escape no cierra el chat si la ventana de producto está abierta: ese Escape es de la modal. */
    document.addEventListener("keydown", (event) => {

        if (event.key !== "Escape" || !abierto) return;

        const modal = document.getElementById("modalProducto");

        if (modal && (modal.classList.contains("abierto") ||
                      modal.classList.contains("cerrando"))) return;

        cerrar();

    });

    form.addEventListener("submit", function (event) {

        event.preventDefault();

        const texto = input.value.trim();

        if (!texto) return;

        input.value = "";

        if (!abierto) abrir();

        responder(texto);
    });

    chips.addEventListener("click", function (event) {

        const chip = event.target.closest(".zapi-chip");

        if (!chip) return;

        const clave = chip.dataset.clave;

        const item = ZAPI_MENU.find(m => m.clave === clave);

        if (item) responder(item.etiqueta);
    });

    pintarChips();

    messages.addEventListener("click", event => {

        const boton = event.target.closest(".zapi-reco-agregar");

        if (!boton) return;

        try {
            if (typeof agregarProductoAlCarrito === "function") {
                agregarProductoAlCarrito(Number(boton.dataset.id));
                boton.textContent = "Agregado";
                boton.disabled = true;
                zapiTrack("agregar_carrito", { productoId: Number(boton.dataset.id) });
            }
        } catch {
        }

    });

    zapiCargarConfig();

    const slugActual = zapiSlugProducto();

    if (slugActual) {
        zapiTrack("ver_producto", {
            detalle: slugActual,
            pagina: window.location.pathname,
        });
    }

    initZapiHeaderMeasure();

    setTimeout(() => {
        badge.style.display = "grid";
    }, 3000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initZapiBot);
} else {
    initZapiBot();
}
