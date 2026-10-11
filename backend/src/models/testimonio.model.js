'use strict';
/* ==========================================================
   MODELO: TESTIMONIO
   ------------------------------------------------------------
   Las opiniones que muestra el carrusel de la home. La forma
   calca la que ya usa public/js/testimonios.js (autor, lugar,
   texto, estrellas, fecha), para que conectar el endpoint no
   obligue a redibujar nada.

   Todavia no hay una fuente real (el fetch a Google Places no
   puede hacerse desde el navegador: la clave quedaria en el
   HTML). La coleccion existe para cuando se cargue a mano o a
   traves de un endpoint propio; hasta entonces la API devuelve
   una lista vacia y el front sigue con su respaldo.
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
