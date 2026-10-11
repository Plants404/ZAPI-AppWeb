'use strict';
/* ==========================================================
   VALIDADOR: ASISTENTE
   ------------------------------------------------------------
   El mismo estilo que contacto.validator.js: limpia, valida y
   devuelve { datos } o { error, campo }. El nombre del campo es el
   que usa el front para marcar el input.

   El mensaje se limpia y se recorta antes de usarlo. Nada mas:
   los intereses salen del tracking por sesion, no de lo que mande
   el navegador.
   ========================================================== */

const { LARGO, MINIMOS } = require('../constants');
const { limpiarTexto } = require('../utils/texto');
const { TIPOS } = require('../models/evento.model');

function aEntero(valor) {
    if (valor === null || valor === undefined || valor === '') return null;

    const numero = Number(valor);

    return Number.isInteger(numero) ? numero : null;
}

function validarMensaje(cuerpo = {}) {
    const mensaje = limpiarTexto(cuerpo.mensaje, LARGO.mensajeChat);

    if (mensaje.length < MINIMOS.mensajeChat) {
        return { error: 'Escribí tu consulta', campo: 'mensaje' };
    }

    return { datos: { mensaje } };
}

function validarEvento(cuerpo = {}) {
    const tipo = limpiarTexto(cuerpo.tipo, 40);

    if (!TIPOS.includes(tipo)) {
        return { error: 'Evento desconocido', campo: 'tipo' };
    }

    return {
        datos: {
            tipo,
            productoId: aEntero(cuerpo.productoId),
            categoria: limpiarTexto(cuerpo.categoria, 120),
            pagina: limpiarTexto(cuerpo.pagina, 200),
            detalle: limpiarTexto(cuerpo.detalle, LARGO.eventoDetalle),
        },
    };
}

module.exports = { validarMensaje, validarEvento };
