'use strict';
/* ==========================================================
   DONDE VIVE LA API
   ------------------------------------------------------------
   El sitio se abre de dos maneras, y la API cambia de direccion
   segun donde este:

     * Local:    la pagina llega de tu maquina. En el caso normal la
                 sirve el propio backend (npm start, dev:memoria), asi
                 que la API esta en el mismo origen y no hace falta
                 nada mas.
     * Producci: GitHub Pages solo aloja estaticos; la API esta en el
                 backend desplegado (Render/Railway), en la URL de
                 abajo.

   urlApi() decide sola con la direccion de la pagina:

     * http://localhost:* o 127.0.0.1:*  -> mismo origen (o URL_API_LOCAL)
     * cualquier otro host (tu hosting)  -> URL_API_PRODUCCION

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
          - local (localhost/127.0.0.1/::1): URL_API_LOCAL
            ('' = mismo origen, lo normal con npm start).
          - cualquier otro host: URL_API_PRODUCCION
            (pegar aca la URL del backend desplegado).

   Si en produccion URL_API_PRODUCCION queda vacia, el sitio NO
   rompe: hayApiConfigurada() devuelve false y las partes que
   dependen del backend (login, pedidos) usan su modo sin backend
   (login fijo / WhatsApp). Asi la web funciona en cualquier
   hosting estatico aunque todavia no este la API.
   ------------------------------------------------------------ */

/* URL del backend en produccion (Render/Railway). Ejemplo:
   "https://zapi-api.onrender.com". Vacio = sin backend. */
const URL_API_PRODUCCION = "";

/* URL del backend local, solo si la pagina llega de otro lado que no
   sea el propio backend (por ejemplo Live Server en el puerto 5500 o
   5501 y el backend en 5501). Con '' se usa el mismo origen. */
const URL_API_LOCAL = "";

function normalizarBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
}

function esHostLocal() {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
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

    if (esHostLocal()) return normalizarBase(URL_API_LOCAL);

    return normalizarBase(URL_API_PRODUCCION);
}());

window.API_BASE = API_BASE;

/* ¿Hay un backend configurado al que apuntar? En local siempre se
   asume el mismo origen. En produccion, verdadero solo si se definio
   una URL (meta, __ZAPI_API__ o URL_API_PRODUCCION). */
function hayApiConfigurada() {
    if (esHostLocal()) return true;
    return API_BASE !== "";
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
   ACCESO SIN BACKEND (MODO ESTATICO)
   ------------------------------------------------------------
   GitHub Pages no ejecuta servidores: cuando la API no responde,
   el login valida contra este usuario fijo y guarda la sesion en
   el navegador (localStorage). La clave queda visible en el codigo:
   es solo para publicar una demo estatica. Con el backend al
   alcance, el login pasa por /api/auth/login y esta ruta no se usa.
   ========================================================== */

const USUARIO_FIJO = {
    email: "admi@zapi.com",
    clave: "admi2026",
    nombre: "Administrador"
};

window.USUARIO_FIJO = USUARIO_FIJO;

const SESION_LOCAL_CLAVE = "zapiSesionLocal";

function guardarSesionLocal(usuario) {
    try {
        window.localStorage.setItem(SESION_LOCAL_CLAVE, JSON.stringify({
            v: 1,
            nombre: usuario.nombre,
            email: usuario.email
        }));
    } catch (error) {
    }
}

function leerSesionLocal() {
    try {
        const crudo = window.localStorage.getItem(SESION_LOCAL_CLAVE);

        if (!crudo) return null;

        const datos = JSON.parse(crudo);

        return datos && datos.v === 1 && typeof datos.nombre === "string"
            ? { nombre: datos.nombre, email: datos.email || "" }
            : null;
    } catch (error) {
        return null;
    }
}

function cerrarSesionLocal() {
    try {
        window.localStorage.removeItem(SESION_LOCAL_CLAVE);
    } catch (error) {
    }
}

window.guardarSesionLocal = guardarSesionLocal;
window.leerSesionLocal = leerSesionLocal;
window.cerrarSesionLocal = cerrarSesionLocal;