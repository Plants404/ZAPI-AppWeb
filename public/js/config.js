'use strict';
/* ==========================================================
   DONDE VIVE LA API
   ------------------------------------------------------------
   El sitio se abre de dos maneras, y la API cambia de direccion
   segun donde este:

     * Local:    la pagina llega de tu maquina. Si la sirve el backend
                 en el puerto configurado, la API usa el mismo origen.
     * Producci: GitHub Pages solo aloja estaticos; la API esta en el
                 backend desplegado (Render/Railway), en la URL de
                 abajo.

   urlApi() decide sola con la direccion de la pagina:

     * local (localhost, *.localhost, 127.*, ::1, 0.0.0.0):
         - si la sirve el propio backend (PUERTO_BACKEND_LOCAL)
                                       -> mismo origen, con backend
         - si la sirve otro server local (Show Preview, Live Server)
                                       -> URL_API_LOCAL o sin backend
     * cualquier otro host (tu hosting)          -> URL_API_PRODUCCION

   Un meta en el HTML pisa la decision para una pagina aparte:

       <meta name="zapi-api" content="https://zapi-api.onrender.com">
   ========================================================== */

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
          - local (localhost, *.localhost, 127.*, ::1, 0.0.0.0): hay
            backend solo si la pagina la sirve el propio backend
            (PUERTO_BACKEND_LOCAL); entonces la API es el mismo
            origen. Si la sirve otro server local (Show Preview, Live
            Server), el sitio queda SIN backend.
          - cualquier otro host: URL_API_PRODUCCION
            (pegar aca la URL del backend desplegado).

   Si en produccion URL_API_PRODUCCION queda vacia, las funciones que
   requieren el backend permanecen deshabilitadas y muestran un error
   explicito. No se usan credenciales ni sesiones locales en el cliente.
   ------------------------------------------------------------ */

/* URL del backend en produccion (Render/Railway). Debe configurarse
   antes de publicar las funciones que requieren autenticacion. */
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

function normalizarBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
}

/* ¿La pagina se esta abriendo desde la maquina de desarrollo? Cubre
   localhost y sus subdominios, todo el rango 127.0.0.0/8, ::1 y
   0.0.0.0, sin mirar el puerto (Live Preview usa puertos variables). */
function esHostLocal() {
    const host = window.location.hostname;
    if (!host) return true; // file:// o preview embebido sin host
    if (host === "localhost" || host.endsWith(".localhost")) return true;
    if (host === "::1" || host === "[::1]") return true;
    if (host === "0.0.0.0") return true;
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

    /* URL_API_LOCAL fija a mano el backend local: sirve para
       previsualizar (Show Preview, Live Server) contra un backend que
       corre en otro puerto. Pisa a la deteccion. */
    const localFija = normalizarBase(URL_API_LOCAL);
    if (localFija) {
        try {
            return alinearHostLocalDeApi(new URL(localFija)).toString().replace(/\/+$/, "");
        } catch (error) {
            return localFija;
        }
    }

    /* Local sin URL fija: la API es el mismo origen solo si la sirve
       el backend; si la sirve un server estatico, no hay API (''). */
    if (esHostLocal()) return "";

    return normalizarBase(URL_API_PRODUCCION);
}());

window.API_BASE = API_BASE;

/* ¿Hay un backend al que apuntar? Verdadero si se definio una URL
   (__ZAPI_API__, meta, URL_API_LOCAL o URL_API_PRODUCCION) o si la
   pagina la sirve el backend en el mismo origen. */
function hayApiConfigurada() {
    if (API_BASE !== "") return true;
    return backendMismoOrigen();
}

window.hayApiConfigurada = hayApiConfigurada;

function urlApi(ruta) {
    return API_BASE + (ruta.charAt(0) === "/" ? ruta : "/" + ruta);
}

window.urlApi = urlApi;

/* El sitio puede cuelgar de un subpath (GitHub Pages). urlDelSitio()
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