/* Respuestas fijas del asistente "Brotecito": preguntas frecuentes por palabras clave.
   Las respuestas son texto con HTML propio (no viene del visitante), por eso se pueden mostrar con formato. */
import { NEGOCIO, formatearPrecio } from './negocio.js'

export const ZAPI_NOMBRE = 'Brotecito'

const ZAPI_FAQ = [

    {
        claves: ["horario", "horarios", "abren", "cierran", "atencion", "atención", "cuando", "dias", "días"],
        respuesta:
            "La dirección publicada de ZAPI está en Montevideo. 🌿<br><br>" +
            "Escribinos por WhatsApp para confirmar los horarios de atención."
    },
    {
        claves: ["envio", "envíos", "enviar", "delivery", "entrega", "entregar", "reparto", "llegan", "llega", "domicilio", "transportista"],
        respuesta:
            `El envío es gratis en compras desde <strong>${formatearPrecio(NEGOCIO.envioGratis)}</strong>. 📦<br><br>` +
            "Para compras menores, el costo se coordina por WhatsApp. " +
            "Consultanos también la disponibilidad y el plazo para tu zona."
    },
    {
        claves: ["precio", "precios", "cuanto", "cuesta", "valor", "cuánto", "caro", "barato", "descuento", "oferta", "promo", "promocion", "promoción", "rebaja", "sale"],
        respuesta:
            "Podés consultar los precios actuales en el catálogo. 💰<br><br>" +
            "Para confirmar promociones o descuentos vigentes, escribinos por WhatsApp."
    },
    {
        claves: ["stock", "disponible", "disponibilidad", "existe", "hay", "tienen"],
        respuesta:
            "La disponibilidad debe confirmarse al armar el pedido. 🌱<br><br>" +
            "Lo más seguro es <strong>armar tu carrito</strong> y enviarlo " +
            "por WhatsApp para que el equipo confirme la disponibilidad."
    },
    {
        claves: ["cuidado", "cuidados", "regar", "riego", "agua", "luz", "sol", "cultivar", "como crece", "mantener", "sustrato", "fertilizar", "plaga", "amarillo", "amarillenta", "seca", "caen", "hojas", "marchita", "murio", "se muere"],
        respuesta:
            "Los cuidados dependen de cada especie. 🌿<br><br>" +
            "Decime qué planta tenés y te ayudo a encontrar información " +
            "general; para recomendaciones específicas, consultá su ficha."
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
            "El pedido se coordina por WhatsApp. Escribinos para confirmar " +
            "los medios de pago y las opciones de facturación disponibles."
    },
    {
        claves: ["punto", "puntos", "club", "fidelidad", "recompensa", "acumular", "acumulo", "acumula", "beneficio", "vip", "miembro", "socio"],
        respuesta:
            "No tengo información confirmada sobre un programa de puntos " +
            "vigente. Consultá al equipo por WhatsApp."
    },
    {
        claves: ["pedido", "mi pedido", "estado", "seguimiento", "rastreo", "llegó", "llego", "recibí", "recibí"],
        respuesta:
            "Para consultar el estado de tu pedido, escribinos por " +
            "<strong>WhatsApp</strong> con tu nombre y los datos del pedido. " +
            "El equipo te responderá cuando reciba la consulta. 📲<br><br>" +
            "Si tu pedido ya está en el carrito, podés enviarlo " +
            "directamente desde la página del carrito."
    },
    {
        claves: ["cactus", "suculenta", "suculentas"],
        respuesta:
            "Podés consultar los productos disponibles y sus cuidados " +
            "en el catálogo. Las necesidades varían según la especie."
    },
    {
        claves: ["aromatica", "aromáticas", "aromatica", "albahaca", "ruda", "romero", "menta", "huerta", "hortaliza", "verdura", "comestible", "cultivo", "siembra", "plantin"],
        respuesta:
            "Tenemos aromáticas y hortalizas de <strong>cultivo " +
            "agroecológico</strong> 🌿<br><br>" +
            "Revisá la descripción de cada producto y consultanos sus " +
            "cuidados antes de consumir una planta."
    },
    {
        claves: ["recomienda", "recomendacion", "recomendación", "sugerencia", "sugerencias", "que me recomendas", "cual compro", "qué me compr", "ayuda", "no sé", "no se"],
        respuesta:
            "Con gusto te ayudo a elegir. 🌿<br><br>" +
            "Contame:<br>" +
            "<ul>" +
            "<li>¿Lo querés para interior o exterior?</li>" +
            "<li>¿Tenés mucha luz o poca?</li>" +
            "<li>¿Qué tipo de espacio querés armar?</li>" +
            "<li>¿Cuánto regás?</li>" +
            "</ul>" +
            "Con eso puedo ayudarte a comparar opciones del catálogo."
    },
    {
        claves: ["mascota", "gato", "perro", "animal", "toxica", "tóxica", "venenosa", "seguro", "niños", "niño", "bebe", "bebé"],
        respuesta:
            "Buena pregunta. 🌿<br><br>" +
            "La seguridad depende de la especie y de la exposición. No " +
            "puedo confirmar que una planta sea segura para mascotas o niños; " +
            "consultá a un veterinario o profesional de salud."
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


/* Sugerencias rapidas. Las que tienen `pregunta` se le hacen a la IA (con las
   respuestas fijas como respaldo); las demas usan respuestas fijas al instante. */
export const ZAPI_MENU = [
    { etiqueta: "Plantas de interior", icono: "potted_plant", clave: "interior",
        pregunta: "¿Qué plantas de interior tienen? Recomendame las más fáciles de cuidar." },
    { etiqueta: "Recomendame una planta", icono: "auto_awesome", clave: "recomendar",
        pregunta: "Quiero que me recomiendes una planta. ¿Qué necesitás saber de mi espacio?" },
    { etiqueta: "Cuidados", icono: "eco", clave: "cuidado" },
    { etiqueta: "Envíos", icono: "local_shipping", clave: "envio" },
    { etiqueta: "Servicios", icono: "home_repair_service", clave: "servicio" }
];


const ZAPI_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(ZAPI_DIACRITICOS, "")
        .trim();
}

export function detectarIntencion(texto) {

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
    return (
        "No tengo promociones confirmadas para mostrar ahora. " +
        "Consultá al equipo por WhatsApp antes de realizar tu pedido."
    );
}

function respuestaClub() {
    return "No tengo información confirmada sobre un programa de puntos vigente. Consultá al equipo por WhatsApp.";
}

function respuestaCarrito(carrito) {


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

    let extra = "";

    if (subtotal < NEGOCIO.envioGratis) {
        const faltaParaEnvioGratis = NEGOCIO.envioGratis - subtotal;
        extra =
            `<br><br>💡 Te faltan <strong>${formatearPrecio(faltaParaEnvioGratis)}</strong> ` +
            "para alcanzar el envío gratis. El costo para pedidos menores se coordina por WhatsApp.";
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


export function generarRespuesta(texto, carrito = []) {

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
        return respuestaCarrito(carrito);
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

    if (pregunta.includes("codigo") ||
        pregunta.includes("código") || pregunta.includes("cupon") ||
        pregunta.includes("cupón")) {
        return respuestaPromociones();
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
        "<li>Beneficios y promociones</li>" +
        "</ul>" +
        "Si preferís hablar con una persona, escribinos por WhatsApp " +
        "al <strong>098 268 560</strong>. 🌿"
    );
}


