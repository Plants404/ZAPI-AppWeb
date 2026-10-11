'use strict';
/* ==========================================================
   NUMERO DEL CLIENTE
   ------------------------------------------------------------
   Cantidades e ids que llegan por la API. En ambos casos lo que
   no es un entero positivo acotado devuelve null y el controlador
   responde 400: nunca se deja llegar un NaN ni un negativo a la
   base ni un $inc.
   ========================================================== */

const { LIMITE_CANTIDAD } = require('../constants');

/* Cantidad de un producto en el carrito: entero de 1 a 99.
   String("5") entra, porque los formularios mandan texto; el 5.7
   no, porque no se puede pedir media mata. */
function cantidadSegura(valor) {
    const numero = Number(valor);

    return Number.isInteger(numero) && numero >= 1 && numero <= LIMITE_CANTIDAD
        ? numero
        : null;
}

/* Id de producto: entero mayor que 0. Las URLs de la API llevan
   numeros ("/api/carrito/3"); un id inventado da false antes de
   tocar la base. */
function idNumerico(valor) {
    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = { cantidadSegura, idNumerico };