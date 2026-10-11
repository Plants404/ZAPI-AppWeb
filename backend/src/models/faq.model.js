'use strict';
/* ==========================================================
   MODELO: FAQ
   ------------------------------------------------------------
   La memoria del asistente. Cada pregunta que el modelo responde
   queda guardada (clave normalizada + tokens) para que la proxima
   vez que alguien pregunte algo parecido no haya que gastar una
   llamada nueva: se recupera la respuesta y solo se sube la
   frecuencia.

   No hay embeddings: DeepSeek no expone un endpoint de ese tipo.
   El parecido se resuelve con un prefiltro lexico (tokens) en
   faq.service.js y, cuando hay una candidata, una verificacion
   corta contra el modelo. Queda documentado como limitacion: no
   es busqueda vectorial.

   "revisar" arranca en true: las respuestas que inventa el modelo
   se guardan pero marcadas, para que alguien las apruebe antes de
   tomarlas como oficiales.
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
