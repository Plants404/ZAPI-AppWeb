'use strict';
/* ==========================================================
   VALIDADOR: TESTIMONIO
   ------------------------------------------------------------
   Las mismas reglas que public/js/testimonio-form.js, a
   proposito: el navegador valida para dar una respuesta rapida
   y el servidor valida aparte porque es la unica validacion que
   no se puede esquivar (el formulario se puede mandar con curl).

   La opinion la escribe una persona con sesion: el autor arranca
   del nombre de la cuenta, pero se acepta tal cual llega (con un
   piso y un techo de largo). El lugar es opcional.

   El nombre de cada error ("autor", "texto", "estrellas"...) es
   el del atributo name del formulario, que es lo que el front
   usa para marcar ese campo.
   ========================================================== */

const { LARGO, MINIMOS } = require('../constants');
const { limpiarTexto } = require('../utils/texto');

/* La calificacion se guarda como un entero de 1 a 5 estrellas.
   Un valor que no sea numero (o venga en texto, como "cinco") no
   llega al piso y se rechaza. */
function aEstrellas(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero)) return NaN;

    return numero;
}

function validarTestimonio(cuerpo = {}) {
    const datos = {
        autor: limpiarTexto(cuerpo.autor, LARGO.nombre),
        lugar: limpiarTexto(cuerpo.lugar, LARGO.testimonioLugar),
        texto: limpiarTexto(cuerpo.texto, LARGO.testimonioTexto),
        estrellas: aEstrellas(cuerpo.estrellas),
    };

    if (datos.autor.length < MINIMOS.nombre) {
        return { error: 'Escribí tu nombre', campo: 'autor' };
    }

    if (datos.texto.length < MINIMOS.testimonioTexto) {
        return {
            error: 'Contanos un poco más sobre tu experiencia',
            campo: 'texto',
        };
    }

    if (!Number.isInteger(datos.estrellas) ||
        datos.estrellas < 1 || datos.estrellas > 5) {
        return {
            error: 'Elegí una calificación de 1 a 5 estrellas',
            campo: 'estrellas',
        };
    }

    return { datos };
}

module.exports = { validarTestimonio };
