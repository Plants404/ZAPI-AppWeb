'use strict';
/* ==========================================================
   MODELO: TESTIMONIO
   ------------------------------------------------------------
   Las opiniones que muestra el carrusel de la home. La forma
   calca la que ya usa public/js/testimonios.js (autor, lugar,
   texto, estrellas, fecha), para que conectar el endpoint no
   obligue a redibujar nada.

   Todavia hay una fuente a mano: datos/testimonios.js -> JSON ->
   siembra (ver testimonios.service.js). La coleccion sigue abierta
   a que lleguen opiniones de una fuente real (o escritas a mano);
   las de la fuente se marcan publicado: true al sembrar, y una
   opinion cargada para revisar sale con publicado false hasta que
   alguien la apruebe.
   ========================================================== */

const mongoose = require('mongoose');

const esquema = new mongoose.Schema(
    {
        autor: { type: String, required: true, trim: true, maxlength: 120 },
        lugar: { type: String, trim: true, maxlength: 120, default: '' },
        texto: { type: String, required: true, trim: true, maxlength: 1200 },
        estrellas: { type: Number, required: true, min: 0, max: 5 },
        fecha: { type: Date, required: true },

        /* Se listan solo las publicadas: asi una opinion cargada
           para revisar no sale en la home antes de aprobarla. */
        publicado: { type: Boolean, default: true },
    },
    { versionKey: false }
);

/* La home pide las publicadas, las mas nuevas primero. */
esquema.index({ publicado: 1, fecha: -1 });

const Testimonio = mongoose.model('Testimonio', esquema);

module.exports = { Testimonio };
