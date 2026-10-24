'use strict';
/* ==========================================================
   HELPERS COMPARTIDOS
   ----------------------------------------------------------
   window.ZAPI es el namespace del sitio. Aca viven los helpers
   que mas de un script necesita, en una sola implementacion:

     * escaparHTML     - el escapado de todo lo que entra a
                         innerHTML. Estaba copiado en productos.js
                         y en pedidos.js.
     * formatearPrecio - pesos uruguayos, sin centavos. Estaba
                         copiado en productos.js y en pedidos.js.
     * formatearFecha  - fecha y hora para el historial de pedidos.

   Este es el unico archivo que CREA window.ZAPI; core/api.js
   extiende el mismo objeto. Por eso los dos se cargan juntos y
   utils.js va primero, despues de config.js.
   ========================================================== */

window.ZAPI = window.ZAPI || {};

(function (ZAPI) {

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[caracter]));
    }

    function formatearPrecio(valor) {
        return new Intl.NumberFormat("es-UY", {
            style: "currency",
            currency: "UYU",
            maximumFractionDigits: 0
        }).format(Number(valor) || 0);
    }

    function formatearFecha(iso) {
        const fecha = new Date(iso);

        if (Number.isNaN(fecha.getTime())) return "";

        return new Intl.DateTimeFormat("es-UY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(fecha);
    }

    ZAPI.escaparHTML = escaparHTML;
    ZAPI.formatearPrecio = formatearPrecio;
    ZAPI.formatearFecha = formatearFecha;

})(window.ZAPI);
