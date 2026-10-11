'use strict';
/* ==========================================================
   TEXTO DEL CLIENTE
   ------------------------------------------------------------
   Todo lo que entra por la API se trata como sospechoso. Estas
   funciones son el unico lugar donde se limpia: se le sacan los
   caracteres de control y se recortan los espacios de los bordes.
   El recorte de largo evita que alguien mande un nombre de cien
   mil caracteres y llene la base.
   ========================================================== */

/* Un \u0000-\u001F metido en un campo puede partir un log o una
   cabecera. Se descarta. Tambien el \u007F (DEL). */
function limpiarTexto(valor, maximo = 500) {
    if (typeof valor !== 'string') return '';

    return valor
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, maximo);
}

/* El telefono se cuenta por digitos, no por largo: "+598 9 123
   4567" tiene mas caracteres que "09 123 456" y es un numero
   mejor. Un valor que no sea texto o numero devuelve "", que
   nunca llega al minimo y por lo tanto se rechaza. */
function soloDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

module.exports = { limpiarTexto, soloDigitos };
