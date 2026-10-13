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
     * cualquier otro host (github.io)   -> URL_API_PRODUCCION

   Un meta en el HTML pisa la decision para una pagina aparte:

       <meta name="zapi-api" content="https://zapi-api.onrender.com">
   ========================================================== */

/* URL del backend en produccion. Cambiar aca cuando este desplegado
   (Render o Railway). */
const URL_API_PRODUCCION = "https://tu-api.onrender.com";

/* URL del backend local, solo si la pagina llega de otro lado que no
   sea el propio backend (por ejemplo Live Server en el puerto 5500 o
   5501 y el backend en 5501). Con '' se usa el mismo origen. */
const URL_API_LOCAL = "";

const API_BASE = (function () {
    const meta = document.querySelector('meta[name="zapi-api"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, "");

    const host = window.location.hostname;

    const esLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (esLocal) return URL_API_LOCAL.replace(/\/+$/, "");

    return URL_API_PRODUCCION;
}());

window.API_BASE = API_BASE;

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