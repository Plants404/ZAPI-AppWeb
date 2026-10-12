'use strict';
/* Sesion de una cuenta. Distinta del carrito anonimo: esta existe
   solo despues de un login y sirve para reconocer al usuario en
   cada peticion.

   El _id es un token opaco aleatorio que viaja en la cookie
   zapi_auth. No lleva firma HMAC porque no hace falta: el token no
   guarda datos (no hay nada que falsificar en el) y la sesion se
   valida contra esta coleccion. Si alguien inventa un token, no
   encuentra fila y queda afuera.

   TTL sobre "ultimo": una sesion sin usarse 7 dias se borra sola.
   Como cada peticion valida actualiza "ultimo", el reloj arranca
   de nuevo siempre. */

const mongoose = require('mongoose');

const { VIDA_SESION_USUARIO_S } = require('../constants');

const Schema = mongoose.Schema;

const esquemaSesion = new Schema({
    _id: { type: String, required: true },
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
    },
    creado: { type: Date, default: Date.now },
    ultimo: { type: Date, default: Date.now },
}, { versionKey: false });

esquemaSesion.index({ ultimo: 1 }, { expireAfterSeconds: VIDA_SESION_USUARIO_S });
esquemaSesion.index({ usuario: 1 });

module.exports = { Sesion: mongoose.model('Sesion', esquemaSesion) };
