'use strict';
/* ==========================================================
   ACCESO AL BACKEND
   ----------------------------------------------------------
   hayBackend() tiene una sola implementacion: verdadero cuando
   hay una API configurada a la que apuntar. Antes estaba
   repetida en auth-ui.js y pedidos.js, y ademas escrita en
   linea dentro de carrito.js, contacto.js, testimonios.js,
   testimonio-form.js, zapi-bot.js y login.js.

   urlApi() y hayApiConfigurada() siguen en config.js: ahi se
   calcula API_BASE, que es lo que las dos necesitan.

   Extiende el window.ZAPI que crea core/utils.js, que va
   cargado antes.
   ========================================================== */

(function (ZAPI) {

    function hayBackend() {
        const fn = window.hayApiConfigurada;
        return typeof fn !== "function" || fn();
    }

    ZAPI.hayBackend = hayBackend;

})(window.ZAPI);
