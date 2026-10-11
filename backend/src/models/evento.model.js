'use strict';
/* ==========================================================
   MODELO: EVENTO DE NAVEGACION
   ------------------------------------------------------------
   El asistente recomienda mejor si sabe que estuvo mirando la
   persona. Cada evento es una accion del front (ver un producto,
   agregarlo al carrito, abrir una categoria, mandar un pedido,
   hablar con el bot): el servicio de recomendaciones los resume
   en "intereses" que despues viajan como contexto al modelo.

   Es un registro append-only y de bajo valor: no guarda datos
   personales, solo el id de sesion anonimo del carrito. Se puede
   purgar por antiguedad sin romper nada.
   ========================================================== */

const mongoose = require('mongoose');

const TIPOS = [
    'ver_producto',
    'agregar_carrito',
    'sacar_carrito',
    'ver_categoria',
    'buscar',
    'enviar_pedido',
    'mensaje_chat',
    'otro',
];

const esquema = new mongoose.Schema(
    {
        /* Id de sesion anonimo (el mismo de la cookie del carrito).
           Si no hay, queda vacio: no se inventa identidad. */
        sesion: { type: String, trim: true, default: '' },

        tipo: { type: String, required: true, enum: TIPOS },

        productoId: { type: Number, default: null },
        categoria: { type: String, trim: true, maxlength: 120, default: '' },
        pagina: { type: String, trim: true, maxlength: 200, default: '' },
        detalle: { type: String, trim: true, maxlength: 200, default: '' },

        creado: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

/* El resumen de intereses busca la actividad reciente de una
   sesion, asi que ese es el indice que importa. */
esquema.index({ sesion: 1, creado: -1 });

const Evento = mongoose.model('Evento', esquema);

module.exports = { Evento, TIPOS };
