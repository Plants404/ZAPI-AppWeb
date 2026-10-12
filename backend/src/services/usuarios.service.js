'use strict';
/* ==========================================================
   SERVICIO: USUARIOS
   ------------------------------------------------------------
   Alta y verificacion de cuentas. La contrasena se guarda como
   su derivacion con scrypt (una funcion pensada para ser lenta y
   cara de revertir) y un salt aleatorio por usuario.

   scrypt es nativo de Node: no agrega dependencias. El resultado
   se guarda en hexadecimal y el salt aparte; para verificar se
   vuelve a derivar lo que llego con el mismo salt y se comparan
   las dos cadenas con timingSafeEqual, que tarda lo mismo sin
   importar cuantas letras coincidan (comparar con === filtraria
   por tiempo cuanto acerto el atacante).

   El servicio no valida formato: eso es del controlador, que es
   quien traduce errores a HTTP. Aca solo se devuelve el resultado
   (creado, duplicado) y el usuario ya verificado.
   ========================================================== */

const crypto = require('crypto');
const { promisify } = require('util');

const { Usuario } = require('../models/usuario.model');

const scrypt = promisify(crypto.scrypt);

/* Largo de la clave derivada, en bytes. */
const LARGO_CLAVE = 64;

/* Costo de scrypt. Son los valores por defecto de Node, escritos
   explicitos para que un cambio de version no mueva la seguridad
   sin que nadie lo note. */
const COSTO = { N: 16384, r: 8, p: 1 };

async function derivar(clave, salt) {
    const buf = await scrypt(clave, salt, LARGO_CLAVE, COSTO);

    return buf.toString('hex');
}

/* Compara dos hashes hex sin filtrar por tiempo. Si los largos no
   coinciden (un hash guardado a mano, corrupto) devuelve false:
   timingSafeEqual tira si los buffers no miden lo mismo. */
function coincide(a, b) {
    const ba = Buffer.from(String(a), 'hex');
    const bb = Buffer.from(String(b), 'hex');

    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/* { email, nombre, clave } con el formato ya validado.
   Devuelve { tipo: 'ok', usuario } o { tipo: 'duplicado' }. */
async function crear({ email, nombre, clave }) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await derivar(clave, salt);

    try {
        const usuario = await Usuario.create({ email, nombre, hash, salt });

        return { tipo: 'ok', usuario };
    } catch (error) {
        /* 11000 es la clave duplicada de Mongo: el indice unico del
           correo ya lo tenia. Se devuelve como resultado y no como
           excepcion, porque no es un error del servidor. */
        if (error && error.code === 11000) return { tipo: 'duplicado' };

        throw error;
    }
}

/* Devuelve el usuario si el correo y la clave son correctos, o
   null si no. El mensaje hacia afuera es el mismo para correo
   inexistente y clave equivocada: no hay que darle a nadie una
   forma de averiguar que correos estan registrados. */
async function verificar(email, clave) {
    const usuario = await Usuario.findOne({ email }).lean();

    if (!usuario) return null;

    const hash = await derivar(clave, usuario.salt);

    return coincide(hash, usuario.hash) ? usuario : null;
}

/* Lo que se le puede devolver al navegador: nunca el hash ni el
   salt. */
function publico(usuario) {
    return {
        id: String(usuario._id),
        email: usuario.email,
        nombre: usuario.nombre,
    };
}

module.exports = { crear, verificar, publico };
