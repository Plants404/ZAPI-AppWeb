'use strict';
/* ==========================================================
   SERVICIO: SESIONES DE USUARIO
   ------------------------------------------------------------
   Abrir, resolver y cerrar la sesion de una cuenta. El token es
   aleatorio y opaco (no lleva datos), asi que no se firma: se
   guarda en la coleccion de sesiones y se busca ahi. Inventar un
   token solo sirve para no encontrar nada.

   Cerrar sesion borra la fila, y con eso el token deja de valer
   al instante. Un carrito anonimo no se puede "cerrar" asi, pero
   una cuenta si.
   ========================================================== */

const crypto = require('crypto');

const { Sesion } = require('../models/sesion.model');

/* 32 bytes en base64url: 43 caracteres, sin comillas ni signos que
   haya que codificar para la cookie. */
function nuevoToken() {
    return crypto.randomBytes(32).toString('base64url');
}

async function abrir(usuarioId) {
    const token = nuevoToken();

    await Sesion.create({ _id: token, usuario: usuarioId });

    return token;
}

/* Devuelve el usuario de la sesion, o null si el token no existe.
   Del usuario solo se traen email y nombre: el hash y el salt no
   tienen por que salir de la base en cada peticion. */
async function usuarioDe(token) {
    if (!token || typeof token !== 'string') return null;

    const sesion = await Sesion.findById(token)
        .select('usuario ultimo')
        .populate('usuario', 'email nombre')
        .lean();

    return sesion && sesion.usuario ? sesion.usuario : null;
}

/* Corre el reloj del TTL: cada lectura valida cuenta como uso. */
function tocar(token) {
    return Sesion.updateOne({ _id: token }, { $set: { ultimo: new Date() } });
}

function cerrar(token) {
    if (!token || typeof token !== 'string') return Promise.resolve();

    return Sesion.deleteOne({ _id: token });
}

module.exports = { abrir, usuarioDe, tocar, cerrar };
