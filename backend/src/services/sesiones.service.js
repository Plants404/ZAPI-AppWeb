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
const { INTERVALO_TOCAR_SESION_MS } = require('../constants');

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

/* Devuelve la sesion ({ usuario, ultimo }), o null si el token no
   existe. Del usuario solo se traen email y nombre: el hash y el
   salt no tienen por que salir de la base en cada peticion. El
   ultimo uso se devuelve para poder throttlear tocar(). */
async function usuarioDe(token) {
    if (!token || typeof token !== 'string') return null;

    const sesion = await Sesion.findById(token)
        .select('usuario ultimo')
        .populate('usuario', 'email nombre')
        .lean();

    if (!sesion || !sesion.usuario) return null;

    return { usuario: sesion.usuario, ultimo: sesion.ultimo };
}

/* Corre el reloj del TTL: cada lectura valida cuenta como uso. Como
   escribir en cada peticion es caro para una sesion activa, solo se
   actualiza si el ultimo uso fue hace mas de una hora: el TTL de 7
   dias sigue corriendo porque la escritura ocurre mucho antes de que
   venza, y se ahorra una escritura por peticion. */
function tocar(token, ultimo) {
    if (!token || typeof token !== 'string') return Promise.resolve();

    const visto = ultimo ? new Date(ultimo).getTime() : 0;

    if (Date.now() - visto < INTERVALO_TOCAR_SESION_MS) return Promise.resolve();

    return Sesion.updateOne({ _id: token }, { $set: { ultimo: new Date() } });
}

function cerrar(token) {
    if (!token || typeof token !== 'string') return Promise.resolve();

    return Sesion.deleteOne({ _id: token });
}

module.exports = { abrir, usuarioDe, tocar, cerrar };
