'use strict';
/* ==========================================================
   CONSTANTES DEL BACKEND
   ------------------------------------------------------------
   Lo que usan a la vez el validador, el modelo y los limites,
   escrito una sola vez para que no se puedan desincronizar.
   Los largos tienen que coincidir con los maxlength del
   formulario de contacto (index.html) y con las reglas de
   public/js/contacto.js: el servidor valida lo mismo que el
   navegador, porque el formulario se puede mandar con curl.
   ========================================================== */

const LARGO = {
    nombre: 120,
    correo: 160,
    telefono: 40,
    consulta: 2000,
    sitioWeb: 100,

    /* Pedidos. La zona y las notas son opcionales, pero el largo
       maximo igual se pisa para que nadie llene la base. */
    zona: 120,
    notas: 500,
};

/* Pisos minimos. La consulta pide 10 caracteres y el telefono se
   cuenta por digitos, no por largo: en Uruguay se escribe con +,
   guiones y espacios. */
const MINIMOS = {
    nombre: 2,
    telefonoDigitos: 6,
    consulta: 10,
};

/* Lo bastante estricto para agarrar el "@" que falta y el ".com"
   que no esta, sin rechazar direcciones raras que si funcionan. */
const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/* Limite del cuerpo de las peticiones. 16 kB alcanza para el
   formulario de contacto y para un JSON de API normal, y frena a
   quien intente mandar un cuerpo enorme. */
const LIMITE_CUERPO = '16kb';

/* Carrito y pedidos. */
const LIMITE_CANTIDAD = 99;
const VIDA_SESION_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = {
    LARGO, MINIMOS, CORREO, LIMITE_CUERPO,
    LIMITE_CANTIDAD, VIDA_SESION_MS,
};
