'use strict';
/* ==========================================================
   MODELO: TESTIMONIO
   ------------------------------------------------------------
   Las opiniones que muestra el carrusel de la home. La forma
   calca la que ya usa public/js/testimonios.js (autor, lugar,
   texto, estrellas, fecha, producto_id), para que conectar el
   endpoint no obligue a redibujar nada.

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
        texto: { type: String, required: true, trim: true, maxlength: 600 },
        estrellas: { type: Number, required: true, min: 0, max: 5 },
        fecha: { type: Date, required: true },

        /* La cuenta que escribio la opinion, cuando la cargo una
           persona logueada (POST /api/testimonios). Las sembradas
           desde datos/testimonios.js no tienen cuenta: quedan en
           null. */
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },

        /* Opcional: el id del producto del catalogo al que se
           refiere la opinion (el mismo numero de datos/catalogo.js).
           El carrusel lo usa para mostrar la etiqueta "Sobre:
           <nombre>" que abre la ficha. Sin producto queda en null y
           no se dibuja etiqueta. */
        producto_id: { type: Number, default: null, min: 1 },

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
