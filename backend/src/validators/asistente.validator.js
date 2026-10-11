'use strict';
/* ==========================================================
   VALIDADOR: ASISTENTE
   ------------------------------------------------------------
   El mismo estilo que contacto.validator.js: limpia, valida y
   devuelve { datos } o { error, campo }. El nombre del campo es el
   que usa el front para marcar el input.

   El historial y el carrito que manda el navegador son contexto
   para el modelo, no verdad: se recortan en cantidad y se limpia
   cada texto. El servidor vuelve a mirar el carrito real cuando
   arma recomendaciones; lo de aca es solo pista.
   ========================================================== */

const { LARGO, MINIMOS } = require('../constants');
const { limpiarTexto } = require('../utils/texto');
const { TIPOS } = require('../models/evento.model');

const MAX_HISTORIAL = 20;
const MAX_CARRITO = 50;

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

    const historial = Array.isArray(cuerpo.historial)
        ? cuerpo.historial.slice(-MAX_HISTORIAL)
        : [];

    const carrito = Array.isArray(cuerpo.carrito)
        ? cuerpo.carrito.slice(0, MAX_CARRITO)
        : [];

    return {
        datos: {
            mensaje,
            historial,
            carrito,
            rutaActual: limpiarTexto(cuerpo.ruta, 200),
        },
    };
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
