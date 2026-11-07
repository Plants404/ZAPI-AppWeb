'use strict';

/* Utilidades compartidas por todos los scripts clásicos del sitio. */

const IMAGEN_FALLBACK = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">' +
    '<rect width="120" height="150" fill="#f7f4ec"/>' +
    '<path d="M60 96V58" stroke="#4a7c59" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M60 74c-16 0-24-10-24-24 14-2 24 6 24 24Z" fill="#4a7c59"/>' +
    '<path d="M60 84c16 0 24-10 24-24-14-2-24 6-24 24Z" fill="#2f5c3c"/>' +
    '<path d="M36 116h48" stroke="#2f5c3c" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>'
);

const URL_EMAILJS = "https://api.emailjs.com/api/v1.0/email/send";

let avisoReloj = null;
let capasConScrollBloqueado = 0;

function raizDelSitio() {
    return document.body && document.body.dataset.raiz ? document.body.dataset.raiz : ".";
}

function rutaConRaiz(ruta) {
    return raizDelSitio() + "/" + String(ruta || "").replace(/^\/+/, "");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caracter]));
}

function formatearFecha(iso) {
    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) return "";

    const dia = new Intl.DateTimeFormat("es-UY", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(fecha);
    const hora = new Intl.DateTimeFormat("es-UY", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(fecha);

    return dia + " · " + hora;
}

function normalizarTexto(texto) {
    return String(texto ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function limpiarValor(valor) {
    return String(valor ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function validarCorreo(valor) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(valor).trim());
}

function validarTelefono(valor) {
    return String(valor).replace(/\D/g, "").length >= 6;
}

function bloquearScroll(activo) {
    capasConScrollBloqueado = Math.max(0, capasConScrollBloqueado + (activo ? 1 : -1));
    document.body.classList.toggle("sin-scroll", capasConScrollBloqueado > 0);
}

function marcarErrorCampo(inputId, errorId, mensaje) {
    const input = document.getElementById(inputId);
    const error = errorId ? document.getElementById(errorId) : null;

    if (error) error.textContent = mensaje || "";

    if (!input) return;

    input.classList.toggle("campo-con-error", Boolean(mensaje));

    if (mensaje) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
}

function limpiarErrores(formulario) {
    if (!formulario) return;

    formulario.querySelectorAll(".campo-con-error").forEach(campo => {
        campo.classList.remove("campo-con-error");
        campo.removeAttribute("aria-invalid");
    });
    formulario.querySelectorAll(".campo-error").forEach(error => {
        error.textContent = "";
    });
}

function mostrarEstadoFormulario(elemento, mensaje, tipo) {
    if (!elemento) return;

    elemento.textContent = mensaje || "";
    elemento.hidden = !mensaje;
    elemento.classList.toggle("estado-error", tipo === "error");
    elemento.classList.toggle("estado-ok", tipo === "ok");
}

function cerrarAviso() {
    const aviso = document.getElementById("avisoFlotante");

    if (avisoReloj) {
        window.clearTimeout(avisoReloj);
        avisoReloj = null;
    }

    if (aviso) aviso.hidden = true;
}

function mostrarAviso(titulo, mensaje) {
    const aviso = document.getElementById("avisoFlotante");
    const tituloElemento = document.getElementById("avisoFlotanteTitulo");
    const mensajeElemento = document.getElementById("avisoFlotanteMensaje");

    if (!aviso || !tituloElemento || !mensajeElemento) return;

    if (avisoReloj) window.clearTimeout(avisoReloj);

    tituloElemento.textContent = titulo;
    mensajeElemento.textContent = mensaje;
    aviso.hidden = false;

    avisoReloj = window.setTimeout(cerrarAviso, 5000);
}

function abrirWhatsApp(mensaje, nuevaPestana = false) {
    const url = "https://wa.me/" + NEGOCIO.whatsapp + "?text=" + encodeURIComponent(mensaje);

    if (nuevaPestana) {
        const ventana = window.open(url, "_blank", "noopener");
        if (ventana) return url;
    }

    window.location.href = url;
    return url;
}

function correoConfigurado(plantilla) {
    const configuracion = NEGOCIO.emailjs;

    return Boolean(configuracion.servicio && configuracion.clavePublica && plantilla)
        && !String(configuracion.servicio).startsWith("PEGAR_")
        && !String(configuracion.clavePublica).startsWith("PEGAR_")
        && !String(plantilla).startsWith("PEGAR_");
}

async function enviarCorreoEmailJS(plantilla, parametros) {
    if (!correoConfigurado(plantilla)) {
        throw new Error("EmailJS sin configurar");
    }

    const respuesta = await fetch(URL_EMAILJS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            service_id: NEGOCIO.emailjs.servicio,
            template_id: plantilla,
            user_id: NEGOCIO.emailjs.clavePublica,
            template_params: parametros
        })
    });

    if (!respuesta.ok) throw new Error("No se pudo enviar el correo");

    return true;
}

function actualizarTextosDeEnvio() {
    document.querySelectorAll("[data-envio-gratis]").forEach(elemento => {
        elemento.textContent = formatearPrecio(NEGOCIO.envioGratis);
    });

    const barra = document.getElementById("shippingProgress");

    if (barra) barra.setAttribute("aria-valuemax", String(NEGOCIO.envioGratis));
}

document.addEventListener("error", evento => {
    const imagen = evento.target;

    if (!(imagen instanceof HTMLImageElement)) return;
    if (imagen.dataset.fallbackAplicado === "si") return;

    imagen.dataset.fallbackAplicado = "si";
    imagen.src = IMAGEN_FALLBACK;

    if (!imagen.alt) imagen.alt = "Imagen no disponible";
}, true);

document.addEventListener("DOMContentLoaded", () => {
    const cerrar = document.getElementById("avisoFlotanteCerrar");

    if (cerrar) cerrar.addEventListener("click", cerrarAviso);

    actualizarTextosDeEnvio();
});
