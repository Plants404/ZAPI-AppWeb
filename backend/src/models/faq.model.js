'use strict';
/* ==========================================================
   MODELO: FAQ
   ------------------------------------------------------------
   La memoria del asistente. Cada pregunta que responde el
   asistente queda guardada (clave normalizada + tokens) para que
   la proxima vez que alguien pregunte algo parecido no haya que
   armar la respuesta de nuevo: se recupera la guardada y solo se
   sube la frecuencia.

   No hay embeddings: el parecido se resuelve con un prefiltro
   lexico (tokens) en faq.service.js y la decision de reutilizar la
   toma asistente.service.js. Queda documentado como limitacion: no
   es busqueda vectorial.

   "revisar" queda en false: las respuestas salen de reglas
   curadas, asi que no necesitan aprobacion. El campo se mantiene
   por si mas adelante hace falta marcar alguna para revisar.
   ========================================================== */

const mongoose = require('mongoose');

const esquema = new mongoose.Schema(
    {
        /* Pregunta normalizada (minusculas, sin acentos ni signos):
           es la clave de reutilizacion exacta. */
        clave: { type: String, required: true, unique: true, trim: true },

        pregunta: { type: String, required: true, trim: true, maxlength: 600 },
        respuesta: { type: String, required: true, trim: true, maxlength: 4000 },

        /* Tokens normalizados de la pregunta, para el prefiltro. */
        tokens: { type: [String], default: [] },

        intencion: { type: String, trim: true, default: 'otro' },
        frecuencia: { type: Number, default: 1, min: 0 },

        generado: { type: Boolean, default: true },
        revisar: { type: Boolean, default: true },
        activo: { type: Boolean, default: true },
    },
    { versionKey: false, timestamps: true }
);

/* Para listar las mas usadas primero cuando haya que revisarlas. */
esquema.index({ activo: 1, frecuencia: -1 });

const Faq = mongoose.model('Faq', esquema);

module.exports = { Faq };
