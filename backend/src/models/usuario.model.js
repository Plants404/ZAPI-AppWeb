'use strict';
/* Cuenta de una persona. El correo va en minusculas y es unico: es
   el identificador con el que se ingresa.

   La contrasena NUNCA se guarda: se guarda su derivacion con
   scrypt y el salt con el que se calculo. Verificar es volver a
   derivar lo que llega con el mismo salt y comparar. El algoritmo
   vive en services/usuarios.service.js, no en el modelo, para que
   el modelo no sepa de criptografia.

   "clave" no esta en el esquema a proposito: si no hay campo, no
   hay forma de guardarla por accidente. */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const esquemaUsuario = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    nombre: { type: String, required: true },
    hash: { type: String, required: true },
    salt: { type: String, required: true },
    creado: { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = { Usuario: mongoose.model('Usuario', esquemaUsuario) };
