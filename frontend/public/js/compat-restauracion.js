'use strict';
/* ============================================================
   compat-restauracion.js
   ------------------------------------------------------------
   Shim de compatibilidad para restaurar el login animado y el
   chatbot de ZAPI sin editar el config.js actual (que ya no
   existe en el sitio estático).

   Define solo cuando faltan:
     - window.urlApi, window.hayApiConfigurada, window.urlDelSitio
       (copiados exactamente del config.js de la línea base,
        commit 47ef5ac, previo a la refactor que los elimino).
     - window.ENVIO_GRATIS_MINIMO = 2500.
   Y, solo si el sitio actual no las provee ya:
     - window.formatearPrecio  (Intl.NumberFormat('es-UY'), pesos sin decimales)
     - window.escaparHTML
     - window.obtenerCarrito   (localStorage clave 'zapiCart')
   ============================================================ */

/* ---- Configuración de la API (idéntica a config.js, línea base 47ef5ac) ---- */

const URL_API_PRODUCCION = "";
const URL_API_LOCAL = "http://localhost:5501";
const PUERTO_BACKEND_LOCAL = "5501";
const PUERTO_NETLIFY_LOCAL = "8888";

const ENVIO_GRATIS_MINIMO = 2500;
if (typeof window.ENVIO_GRATIS_MINIMO === "undefined") {
    window.ENVIO_GRATIS_MINIMO = ENVIO_GRATIS_MINIMO;
}

function normalizarBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
}

function esHostLocal() {
    const host = window.location.hostname;
    if (host === "localhost") return true;
    if (host === "::1" || host === "[::1]") return true;
    if (host.indexOf("127.") === 0) return true;
    return false;
}

function backendMismoOrigen() {
    return esHostLocal() && window.location.port === PUERTO_BACKEND_LOCAL;
}

function alinearHostLocalDeApi(url) {
    if (!esHostLocal()) return url;

    const hostnamePagina = window.location.hostname.replace(/^\[|\]$/g, "");
    const hostnameApi = url.hostname.replace(/^\[|\]$/g, "");
    const apiUsaLoopback = hostnameApi === "localhost" || hostnameApi === "127.0.0.1";
    const paginaUsaLoopback = hostnamePagina === "localhost"
        || hostnamePagina === "::1"
        || hostnamePagina.indexOf("127.") === 0;

    if (!apiUsaLoopback || !paginaUsaLoopback) return url;

    url.hostname = hostnamePagina.indexOf(":") !== -1
        ? "[" + hostnamePagina + "]"
        : hostnamePagina;

    return url;
}

const API_BASE = (function () {
    const inyectada = window.__ZAPI_API__;
    if (typeof inyectada === "string" && inyectada.trim()) {
        return normalizarBase(inyectada);
    }

    const meta = document.querySelector('meta[name="zapi-api"]');
    if (meta && meta.content && meta.content.trim()) {
        return normalizarBase(meta.content);
    }

    if (esHostLocal()) {
        if (window.location.port === PUERTO_NETLIFY_LOCAL) return "";

        const localFija = normalizarBase(URL_API_LOCAL);
        if (localFija) {
            try {
                return alinearHostLocalDeApi(new URL(localFija)).toString().replace(/\/+$/, "");
            } catch (error) {
                return localFija;
            }
        }

        return "";
    }

    return normalizarBase(URL_API_PRODUCCION);
}());

/* ---- Funciones globales que exigía login.js (antes en config.js) ---- */

function hayApiConfigurada() {
    if (API_BASE !== "") return true;
    return backendMismoOrigen()
        || window.location.port === PUERTO_NETLIFY_LOCAL
        || !esHostLocal();
}

function urlApi(ruta) {
    return API_BASE + (ruta.charAt(0) === "/" ? ruta : "/" + ruta);
}

const raizDelSitioRestauracion = (function () {
    const script = document.currentScript;

    if (script && script.src) return new URL("../..", script.src).href;

    return "";
}());

function urlDelSitio(ruta) {
    return raizDelSitioRestauracion + String(ruta || "").replace(/^\/+/, "");
}

if (typeof window.urlApi === "undefined") {
    window.urlApi = urlApi;
}
if (typeof window.hayApiConfigurada === "undefined") {
    window.hayApiConfigurada = hayApiConfigurada;
}
if (typeof window.urlDelSitio === "undefined") {
    window.urlDelSitio = urlDelSitio;
}

/* ---- Globales que exige zapi-bot.js, solo cuando falten ---- */

if (typeof window.formatearPrecio === "undefined") {
    window.formatearPrecio = function (valor) {
        return new Intl.NumberFormat("es-UY", {
            style: "currency",
            currency: "UYU",
            maximumFractionDigits: 0
        }).format(Number(valor) || 0);
    };
}

if (typeof window.escaparHTML === "undefined") {
    window.escaparHTML = function (valor) {
        return String(valor ?? "").replace(/[&<>"']/g, function (caracter) {
            return ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[caracter]);
        });
    };
}

if (typeof window.obtenerCarrito === "undefined") {
    window.obtenerCarrito = function () {
        try {
            const crudo = JSON.parse(window.localStorage.getItem("zapiCart"));
            return Array.isArray(crudo) ? crudo : [];
        } catch (error) {
            return [];
        }
    };
}
