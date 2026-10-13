'use strict';
/* Configuracion de la API. Por defecto el sitio llama a su mismo
   origen (/api/...), que es como funciona cuando el backend sirve el
   sitio. Para GitHub Pages + una API en otro dominio, se declara el
   origen con un meta en las paginas:

      <meta name="zapi-api" content="https://zapi-api.onrender.com">

   Este script se carga primero en todas las paginas y expone
   window.urlApi(ruta), que arma la URL lista para fetch: con o sin el
   meta, los scripts no necesitan saber donde vive la API. Sin el meta,
   las llamadas quedan en el mismo origen y el sitio se degrada igual
   (el catalogo y las opiniones caen a sus fallbacks estaticos). */

const API_BASE = (function () {
    const meta = document.querySelector('meta[name="zapi-api"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, "");
    return "";
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