'use strict';
/* ==========================================================
   MODELO: MENSAJE
   ------------------------------------------------------------
   Las consultas del formulario de contacto. Es la unica
   coleccion que el backend nuevo escribe hoy.

   El estado arranca en "nuevo" y se mueve a mano desde la
   administracion (cuando exista): guardar con estado es lo que
   deja distinguir lo pendiente de lo ya visto sin tener que
   leer toda la bandeja.
   ========================================================== */

const mongoose = require('mongoose');
const { LARGO } = require('../constants');

const ESTADOS = ['nuevo', 'leido', 'respondido', 'descartado'];

const esquema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, maxlength: LARGO.nombre },
        correo: { type: String, required: true, trim: true, maxlength: LARGO.correo },
        telefono: { type: String, required: true, trim: true, maxlength: LARGO.telefono },
        consulta: { type: String, required: true, trim: true, maxlength: LARGO.consulta },
        estado: { type: String, enum: ESTADOS, default: 'nuevo' },
    },
    {
        /* creado / actualizado en vez de createdAt / updatedAt:
           el resto del proyecto escribe en espanol. */
        timestamps: { createdAt: 'creado', updatedAt: 'actualizado' },
        versionKey: false,
    }
);

/* La administracion lista por estado y ordena por fecha: el
   indice compuesto es el que evita recorrer toda la coleccion
   a medida que se acumulan consultas. */
esquema.index({ estado: 1, creado: -1 });

const Mensaje = mongoose.model('Mensaje', esquema);

module.exports = { Mensaje, ESTADOS };
