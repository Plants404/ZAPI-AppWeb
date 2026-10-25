'use strict';
/* ==========================================================
   DONDE VIVE LA API
   ------------------------------------------------------------
   En produccion, el navegador usa el mismo origen del sitio Netlify
   para las rutas /api/*. En desarrollo, Live Server (5500) usa la API
   local (5501). Los overrides window.__ZAPI_API__ y el meta zapi-api
   pisan la deteccion automatica:

        <meta name="zapi-api" content="https://api.example.com">

   MODO SIN CUENTAS
   ----------------
   REQUIERE_CUENTA controla si el sitio exige iniciar sesion para usar
   funciones de cuenta (login, Mi cuenta, Mis pedidos, Cerrar sesion,
   dejar testimonios). Cuando esta en false, el sitio se comporta como
   si no existieran cuentas: cualquier visitante puede usar el carrito,
   ver Mis pedidos (historial local del dispositivo) y dejar testimonios
   sin iniciar sesion. Cuando esta en true, se restaura el comportamiento
   actual (se exige sesion en auth-ui.js y en el backend). No borra el
   codigo de autenticacion, los modelos de usuario ni las rutas
   /api/auth/*; solo las deja inactivas.
   ========================================================== */

const REQUIERE_CUENTA = false;

/* ------------------------------------------------------------
   CONFIGURACION DE LA API (un solo lugar)
   ------------------------------------------------------------
   La URL del backend sale, en este orden de prioridad:

     1. window.__ZAPI_API__  -> inyeccion en runtime. Sirve para
        un archivo public/js/env.js cargado antes que este (util
        cuando el hosting inyecta variables), o para pruebas.
     2. <meta name="zapi-api" content="https://...">  -> override
        por pagina.
     3. Deteccion por entorno:
          - localhost, 127.* o ::1: URL_API_LOCAL
          - cualquier otro host: rutas relativas /api/* del propio sitio.

   En produccion, Netlify dirige /api/* a Netlify Functions.
   ------------------------------------------------------------ */

/* En produccion se usan rutas relativas del mismo origen. */
const URL_API_PRODUCCION = "";

/* URL del backend local, para previsualizar en Show Preview / Live
   Server (5500) y conectar con npm run start:api (5501). Para apagar
   la conexión local, dejá este valor vacío. */
const URL_API_LOCAL = "http://localhost:5501";
const ENVIO_GRATIS_MINIMO = 2500;
window.ENVIO_GRATIS_MINIMO = ENVIO_GRATIS_MINIMO;

/* Puerto del backend en tu maquina (npm start, dev:memoria). Si la
   pagina la sirve ESE backend, la API es el mismo origen. Si la sirve
   otro server (Show Preview, Live Server), no hay backend salvo que
   definas URL_API_LOCAL. */
const PUERTO_BACKEND_LOCAL = "5501";
const PUERTO_NETLIFY_LOCAL = "8888";

function normalizarBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
}

/* ¿La pagina se esta abriendo desde un host local de desarrollo? */
function esHostLocal() {
    const host = window.location.hostname;
    if (host === "localhost") return true;
    if (host === "::1" || host === "[::1]") return true;
    if (host.indexOf("127.") === 0) return true;
    return false;
}

/* ¿La pagina la sirve el propio backend? Local y en su puerto. En ese
   caso la API vive en el mismo origen y no hace falta configurar nada.
   Si la sirve OTRO server local (Show Preview, Live Server), da false:
   el sitio entra en modo sin backend. */
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
        /* netlify dev sirve tambien las funciones bajo el mismo origen. */
        if (window.location.port === PUERTO_NETLIFY_LOCAL) return "";

        /* URL_API_LOCAL permite que Live Server (5500) use la API (5501). */
        const localFija = normalizarBase(URL_API_LOCAL);
        if (localFija) {
            try {
                return alinearHostLocalDeApi(new URL(localFija)).toString().replace(/\/+$/, "");
            } catch (error) {
                return localFija;
            }
        }

        /* Sin URL fija, la API local queda sin configurar. */
        return "";
    }

    return normalizarBase(URL_API_PRODUCCION);
}());

window.API_BASE = API_BASE;

/* ¿Hay un backend al que apuntar? Verdadero si se definio una URL
   (__ZAPI_API__, meta, URL_API_LOCAL o URL_API_PRODUCCION) o si la
   pagina la sirve el backend en el mismo origen. */
function hayApiConfigurada() {
    if (API_BASE !== "") return true;
    return backendMismoOrigen()
        || window.location.port === PUERTO_NETLIFY_LOCAL
        || !esHostLocal();
}

window.hayApiConfigurada = hayApiConfigurada;

function urlApi(ruta) {
    return API_BASE + (ruta.charAt(0) === "/" ? ruta : "/" + ruta);
}

window.urlApi = urlApi;

/* El sitio puede colgar de un subpath. urlDelSitio()
   resuelve las rutas absolutas internas desde la ubicacion de este
   script (public/js/) en vez de desde la raiz del domino, asi un
   redirect a /login.html funciona igual bajo /usuario/repo/. */
const raizDelSitio = (function () {
    const script = document.currentScript;

    if (script && script.src) return new URL("../..", script.src).href;

    return "";
}());

function urlDelSitio(ruta) {
    return raizDelSitio + String(ruta || "").replace(/^\/+/, "");
}

window.urlDelSitio = urlDelSitio;

/* ==========================================================
   PEDIDOS LOCALES (MODO ESTATICO)
   ------------------------------------------------------------
   Sin backend no hay base de datos: los pedidos se guardan en el
   navegador (localStorage) para que "Mis pedidos" los muestre y se
   puedan cancelar. Con backend manda el servidor y estas funciones
   no se usan. Cada pedido copia la forma que devuelve la API:
   { id, creado, estado, total, zona, notas, items[] }.
   ========================================================== */

const PEDIDOS_LOCAL_CLAVE = "zapiPedidosLocal";
const PEDIDOS_LOCAL_MAX = 50;

function leerPedidosLocales() {
    try {
        const crudo = JSON.parse(window.localStorage.getItem(PEDIDOS_LOCAL_CLAVE));
        return Array.isArray(crudo) ? crudo : [];
    } catch (error) {
        return [];
    }
}

function escribirPedidosLocales(pedidos) {
    try {
        window.localStorage.setItem(
            PEDIDOS_LOCAL_CLAVE,
            JSON.stringify(pedidos.slice(0, PEDIDOS_LOCAL_MAX))
        );
    } catch (error) {
    }
}

/* El mas nuevo va primero, como el historial del backend. */
function guardarPedidoLocal(pedido) {
    const pedidos = leerPedidosLocales();
    pedidos.unshift(pedido);
    escribirPedidosLocales(pedidos);
    return pedido;
}

function listarPedidosLocales() {
    return leerPedidosLocales();
}

/* Cancela el pedido marcandolo (no se borra, queda en el historial).
   Devuelve el pedido cancelado, o null si no existe. */
function cancelarPedidoLocal(id) {
    const pedidos = leerPedidosLocales();
    const pedido = pedidos.find(p => p && p.id === id);

    if (!pedido) return null;

    pedido.estado = "cancelado";
    escribirPedidosLocales(pedidos);

    return pedido;
}

window.leerPedidosLocales = leerPedidosLocales;
window.guardarPedidoLocal = guardarPedidoLocal;
window.listarPedidosLocales = listarPedidosLocales;
window.cancelarPedidoLocal = cancelarPedidoLocal;

window.REQUIERE_CUENTA = REQUIERE_CUENTA;