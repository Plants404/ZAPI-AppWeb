/* ==========================================================
   ZAPI BOT
   Asistente virtual del vivero.
   Responde preguntas frecuentes, promociona
   y ayuda a fidelizar la compra.
   ========================================================== */

const ZAPI_NOMBRE = "Brotecito";


/* ==========================================================
   BASE DE CONOCIMIENTO
   Palabras clave -> respuesta.
   ========================================================== */

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
        claves: ["aromatica", "aromáticas", "aromatica", "albahaca", "rucula", "rúcula", "romero", "menta", "huerta", "hortaliza", "verdura", "comestible", "cultivo", "siembra", "plantin"],
        respuesta:
            "Tenemos aromáticas y hortalizas de <strong>cultivo " +
            "agroecológico</strong> 🌿<br><br>" +
            "La albahaca rinde más de 8 semanas de cosecha continua y la " +
            "rúcula se puede resilembrar hasta 4 veces. Ideal para empezar " +
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
            "<strong>La albahaca y la rúcula son seguras</strong> para " +
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


/* ==========================================================
   PROMOCIONES Y FIDELIZACIÓN
   ========================================================== */

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


/* ==========================================================
   ATAJOS DEL MENÚ
   ========================================================== */

const ZAPI_MENU = [
    { etiqueta: "🚚 Envíos", clave: "envio" },
    { etiqueta: "💰 Promociones", clave: "promo" },
    { etiqueta: "🌟 Club ZAPI", clave: "club" },
    { etiqueta: "🌿 Cuidados", clave: "cuidado" },
    { etiqueta: "🛠️ Servicios", clave: "servicio" },
    { etiqueta: "🛒 Ver carrito", clave: "carrito" }
];


/* ==========================================================
   AYUDAS DE TEXTO
   ========================================================== */

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

    /* Prioridad: patrones más específicos primero.
       Si no, una sola coincidencia como "tienen"
       puede ganar sobre la FAQ realmente relevante. */

    const especificas = [
        ["cactus"], ["suculenta", "suculentas"],
        ["aromatica", "aromaticas", "albahaca", "rucula", "romero", "menta", "hortaliza", "verdura"],
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

    /* Saludo y agradecimiento */

    const social = ["gracias", "genial", "perfecto", "copado", "joya", "barbaro"];

    if (social.some(clave => limpio.includes(clave))) {
        return ZAPI_FAQ.find(faq => faq.claves.includes("gracias"));
    }

    /* Último recurso: coincidencia por cualquier clave */

    for (const faq of ZAPI_FAQ) {
        if (faq.claves.some(clave => limpio.includes(normalizar(clave)))) {
            return faq;
        }
    }

    return null;
}


/* ==========================================================
   CONSTRUCCIÓN DE RESPUESTAS
   ========================================================== */

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


/* ==========================================================
   RESPUESTA PRINCIPAL
   ========================================================== */

function generarRespuesta(texto) {

    const pregunta = normalizar(texto.trim());

    /* Atajos del menú */

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

    /* Salir y hablar con una persona */

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

    /* Código de descuento */

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

    /* Búsqueda por coincidencia */

    const faq = detectarIntencion(texto);

    if (faq) {
        return faq.respuesta;
    }

    /* Sin coincidencia: sugerimos opciones */

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


/* ==========================================================
   INTERFAZ
   ========================================================== */

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
                    En línea · responde al instante
                </span>
            </div>

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


/* ==========================================================
   MEDICIÓN DEL HEADER DEL SITIO
   El widget se posiciona fixed abajo a la derecha, así que
   su alto máximo depende de cuánto ocupa el header fijo o
   sticky de la página. En lugar de hardcodear un valor,
   medimos la barra más baja que esté anclada arriba y la
   publicamos en --site-header-h para que el CSS la descuente.
   ========================================================== */

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

            /* Si está oculto el rect viene en cero y
               ya se descarta en la comprobación de abajo */

            const caja = el.getBoundingClientRect();

            if (!caja.width || !caja.height) return;

            /* Solo barras ancladas al borde superior
               y anchas: excluye widgets flotantes */

            if (caja.top > 8 || caja.width < limite) return;

            max = Math.max(max, caja.bottom);

        });

        bot.style.setProperty("--site-header-h", `${Math.ceil(max)}px`);
    }

    function programar() {

        if (frame) return;

        frame = requestAnimationFrame(medir);
    }

    /* El header puede cambiar de alto: resize, rotación,
       wrap del nav en mobile, o carga tardía de fuentes */

    window.addEventListener("resize", programar);
    window.addEventListener("orientationchange", programar);

    if ("ResizeObserver" in window) {

        const observador = new ResizeObserver(programar);

        document.querySelectorAll(ZAPI_BARRAS_SUPERIORES)
            .forEach(el => observador.observe(el));

        /* El body también: si el contenido cambia,
           el header sticky puede recalcular su alto */

        observador.observe(document.body);
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(programar);
    }

    /* Primera medición y una pasada diferida: some
       scripts_positionan el header después del load */

    medir();
    window.addEventListener("load", programar);
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

    /* ------------------------- */

    function scrollAbajo() {
        messages.scrollTop = messages.scrollHeight;
    }
    /* El bot escribe marcado propio (<strong>, <br>), asi que
       sus respuestas pueden ir por innerHTML. Lo que escribe el
       visitante no: va como texto plano, porque al pasarlo por
       innerHTML un "<img onerror=...>" se ejecutaba. Por eso el
       parametro es explicito y no se deduce del tipo. */

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

    /* ------------------------- */

    function pintarChips() {

        chips.innerHTML = ZAPI_MENU.map(item =>
            `<button class="zapi-chip" type="button" data-clave="${item.clave}">
                ${item.etiqueta}
            </button>`
        ).join("");

    }

    /* ------------------------- */

    function responder(texto) {

        agregarMensaje(texto, "user", false);

        mostrarEscribiendo();

        setTimeout(() => {

            quitarEscribiendo();

            const faq = detectarIntencion(texto);

            agregarMensaje(generarRespuesta(texto), "bot");

            /* Si fue una despedida, sugerir compra */

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

            /* Actualizar contador si preguntó por el carrito */

            if (normalizar(texto).includes("carrito") ||
                normalizar(texto).includes("pedido")) {
                setTimeout(() => actualizarContador(), 100);
            }

        }, 700 + Math.random() * 600);
    }

    /* ------------------------- */

    function saludoInicial() {

        agregarMensaje(
            `¡Hola! 🌿 Soy <strong>${ZAPI_NOMBRE}</strong>, el asistente de ZAPI.<br><br>` +
            "Te puedo ayudar con envíos, promociones, cuidados de tus " +
            "plantas y servicios. ¿Qué necesitás?",
            "bot"
        );

        setTimeout(() => {
            agregarMensaje(
                "¿Empezamos por las <strong>promociones vigentes</strong>? 🎁",
                "bot"
            );
        }, 1100);
    }

    /* ------------------------- */

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

        /* Devuelve el foco al botón para no
           perder la navegación con teclado */

        toggle.focus();
    }

    /* ------------------------- */

    toggle.addEventListener("click", () => {
        abierto ? cerrar() : abrir();
    });

    close.addEventListener("click", cerrar);

    /* Cerrar el chat con la tecla Escape.
       El chat no se cierra si la ventana de producto está abierta:
       ese Escape es de la modal, no del chat. Se mira "cerrando"
       también porque la modal lo marca de forma síncrona al cerrarse,
       así el orden de los dos listeners da igual. */

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

        if (item) responder(item.etiqueta.replace(/^\S+\s/, ""));
    });

    /* ------------------------- */

    pintarChips();

    /* El panel se posiciona contra el alto real del
       header del sitio, así que se mide después de
       inyectar el widget en el DOM */

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
