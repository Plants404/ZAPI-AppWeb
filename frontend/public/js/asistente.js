'use strict';

/* Asistente breve del sitio. No es un chatbot conectado a ningún
   servicio: responde las dudas frecuentes con enlaces al catálogo, a
   Mis pedidos y a WhatsApp. */

const botonAsistente = document.getElementById("asistenteBoton");
const panelAsistente = document.getElementById("asistentePanel");
const cerrarAsistente = document.getElementById("asistenteCerrar");
const mensajesAsistente = document.getElementById("asistenteMensajes");
const formularioAsistente = document.getElementById("asistenteForm");
const entradaAsistente = document.getElementById("asistenteEntrada");

const RESPUESTAS_ASISTENTE = [
    {
        claves: ["envio", "envío", "envios", "envíos", "entrega", "delivery", "llega"],
        respuesta: "El envío es gratis desde <strong>" + formatearPrecio(NEGOCIO.envioGratis) +
            "</strong>. Para pedidos menores coordinamos el costo por WhatsApp."
    },
    {
        claves: ["precio", "precios", "cuanto", "cuánto", "cuesta", "valor", "stock", "disponible"],
        respuesta: "Los precios y el stock están publicados en el catálogo. " +
            'Podés verlos en <a href="./catalogo.html">Catálogo</a>.'
    },
    {
        claves: ["pedido", "pedidos", "carrito", "comprar", "compré", "compre"],
        respuesta: 'Armá tu carrito y enviá el pedido. Queda guardado en ' +
            '<a href="./pedidos.html">Mis pedidos</a> para ver tu historial.'
    },
    {
        claves: ["cuidado", "cuidados", "riego", "regar", "luz", "planta", "plantas"],
        respuesta: "Cada ficha de producto incluye sus cuidados básicos. " +
            'Si tenés una duda puntual, <a href="https://wa.me/' + NEGOCIO.whatsapp + '" target="_blank" rel="noopener">escribinos por WhatsApp</a>.'
    },
    {
        claves: ["servicio", "servicios", "jardin", "jardín", "huerta", "proyecto", "presupuesto"],
        respuesta: 'Ofrecemos asesoramiento, diseño, mantenimiento y proyectos verdes. ' +
            'Mirá <a href="./servicios.html">Servicios</a> o <a href="./contacto.html">pedí un presupuesto</a>.'
    },
    {
        claves: ["contacto", "whatsapp", "telefono", "teléfono", "persona", "humano", "horario"],
        respuesta: 'Podés escribirnos al <strong>' + CONFIG.negocio.whatsappVisible + '</strong> o desde ' +
            '<a href="./contacto.html">Contacto</a>.'
    },
    {
        claves: ["opinion", "opinión", "testimonio", "reseña", "estrellas"],
        respuesta: 'En la portada podés dejar tu opinión con el botón "Dejar mi opinión". ' +
            "Las revisamos antes de publicarlas."
    }
];

const ATAJOS_ASISTENTE = ["Envíos", "Cuidados", "Mi pedido", "Servicios", "Hablar con una persona"];

let conversacionIniciada = false;

function agregarMensajeAsistente(texto, autor) {
    if (!mensajesAsistente) return;

    const burbuja = document.createElement("div");
    burbuja.className = "asistente-mensaje asistente-mensaje-" + autor;

    if (autor === "bot") burbuja.innerHTML = texto;
    else burbuja.textContent = texto;

    mensajesAsistente.appendChild(burbuja);
    mensajesAsistente.scrollTop = mensajesAsistente.scrollHeight;
}

function agregarAtajosAsistente() {
    if (!mensajesAsistente) return;

    const grupo = document.createElement("div");
    grupo.className = "asistente-atajos";

    ATAJOS_ASISTENTE.forEach(texto => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.textContent = texto;
        boton.addEventListener("click", () => responderAsistente(texto));
        grupo.appendChild(boton);
    });

    mensajesAsistente.appendChild(grupo);
    mensajesAsistente.scrollTop = mensajesAsistente.scrollHeight;
}

function respuestaAsistente(texto) {
    const limpio = normalizarTexto(texto);

    const encontrada = RESPUESTAS_ASISTENTE.find(respuesta =>
        respuesta.claves.some(clave => limpio.includes(normalizarTexto(clave)))
    );

    if (encontrada) return encontrada.respuesta;

    return "No tengo esa respuesta a mano. Podés ver el " +
        '<a href="./catalogo.html">catálogo</a>, revisar ' +
        '<a href="./servicios.html">servicios</a> o ' +
        '<a href="https://wa.me/' + NEGOCIO.whatsapp + '" target="_blank" rel="noopener">hablar con el equipo por WhatsApp</a>.';
}

function responderAsistente(texto) {
    if (!texto.trim()) return;

    agregarMensajeAsistente(texto, "usuario");
    agregarMensajeAsistente(respuestaAsistente(texto), "bot");
}

function iniciarConversacion() {
    if (conversacionIniciada) return;

    conversacionIniciada = true;
    agregarMensajeAsistente(
        "¡Hola! 🌿 Soy el asistente de ZAPI. Puedo ayudarte con envíos, cuidados, pedidos y servicios.",
        "bot"
    );
    agregarAtajosAsistente();
}

function abrirAsistente() {
    if (!panelAsistente || !botonAsistente) return;

    iniciarConversacion();
    panelAsistente.hidden = false;
    botonAsistente.setAttribute("aria-expanded", "true");

    if (entradaAsistente) entradaAsistente.focus();
}

function cerrarPanelAsistente() {
    if (!panelAsistente || !botonAsistente) return;

    panelAsistente.hidden = true;
    botonAsistente.setAttribute("aria-expanded", "false");
    botonAsistente.focus();
}

if (botonAsistente && panelAsistente) {
    botonAsistente.addEventListener("click", () => {
        if (panelAsistente.hidden) abrirAsistente();
        else cerrarPanelAsistente();
    });

    if (cerrarAsistente) cerrarAsistente.addEventListener("click", cerrarPanelAsistente);

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape" || panelAsistente.hidden) return;
        if (document.querySelector("dialog[open]")) return;

        cerrarPanelAsistente();
    });

    if (formularioAsistente && entradaAsistente) {
        formularioAsistente.addEventListener("submit", evento => {
            evento.preventDefault();

            const texto = entradaAsistente.value.trim();

            if (!texto) return;

            entradaAsistente.value = "";
            responderAsistente(texto);
        });
    }
}
