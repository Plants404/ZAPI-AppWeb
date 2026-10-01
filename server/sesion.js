'use strict';
/* Sesion del carrito, con cookie firmada.
   
   Por que hay sesion
   -----------------
   El carrito tiene que vivir en el servidor para que el stock que ve
   el comprador sea el mismo que el que se descuenta. El identificador
   de esa sesion viaja en una cookie y se valida con HMAC-SHA256.

   Por que HMAC y no solo un id al azar
   -------------------------------------
   Un id sin firmar se puede inventar: cualquiera que pruebe
   "zapi-1", "zapi-2" hasta dar con una sesion ajena podria ver y
   modificar el carrito de otra persona. Con el HMAC, el servidor
   firma el id y despues verifica que la firma siga siendo suya: si
   alguien edita el id, la firma deja de calzar y el servidor la
   rechaza.

   Por que httpOnly
   ----------------
   Con httpOnly, el JavaScript de la pagina no puede leer la cookie.
   Es la unica proteccion contra un XSS que se lleve la sesion, asi
   que va siempre. El SameSite=Lazy difunde el mismo criterio:
   manda la cookie solo en navegaciones del sitio, no en las peticiones
   que arma un tercero. Un sitio donde el carrito se llena con GET
   rompido no necesita mas.

   Por que no se regenera la sesion en cada request
   ----------------------------------------------
   En un login eso es lo correcto porque cambia el nivel de acceso.
   Acá no hay login ni roles: la sesion solo guarda un carrito, asi
   que regenerarla constantly dejaria al comprador con un carrito
   vacio en cada recarga, que es el bug clasico de "perdi mis
   productos". */

const crypto = require('crypto');

/* El secreto viene del entorno. Si no esta, se genera uno en memoria.
   Eso esta bien para desarrollo, pero en produccion reiniciar el
   proceso invalidaria todas las sesiones, asi que ahi es obligatorio
   definir ZAPI_SESSION_SECRET. Se avisa con una linea en la consola
   para que no se pase inadvertido. */
const secreto = process.env.ZAPI_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.ZAPI_SESSION_SECRET) {
    console.warn('[sesion] ZAPI_SESSION_SECRET no esta definido: se genera uno al azar en memoria.');
    console.warn('[sesion] En produccion hay que definirlo, o cada reinicio borra los carritos abiertos.');
}

const NOMBRE_COOKIE = 'zapi_sesion';
const DIAS_VIGENCIA = 30;

/* Firma el id. El id va dentro del valor firmado, no al lado: asi el
   navegador no puede cambiar uno sin que la firma deje de servir. */
function firmar(id) {
    const firma = crypto
        .createHmac('sha256', secreto)
        .update(id)
        .digest('base64url');

    return `${id}.${firma}`;
}

/* Devuelve el id si la firma calza, o null. */
function verificar(valor) {
    if (typeof valor !== 'string') return null;

    const corte = valor.lastIndexOf('.');

    if (corte < 1) return null;

    const id = valor.slice(0, corte);
    const firma = valor.slice(corte + 1);

    const esperada = crypto
        .createHmac('sha256', secreto)
        .update(id)
        .digest('base64url');

    /* Se comparan los buffers enteros con timingSafeEqual. La
       comparacion directa con === devuelve apenas encuentra el primer
       byte distinto, y esa diferencia de tiempo deja adivinar la firma
       a fuerza. timingSafeEqual tarda lo mismo exista o no la
       diferencia, asi que no se puede medir. */
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);

    if (a.length !== b.length) return null;

    return crypto.timingSafeEqual(a, b) ? id : null;
}

function nuevoId() {
    return crypto.randomBytes(18).toString('base64url');
}

/* Lee la sesion del pedido. Si no hay o la firma no calza, genera una
   nueva y la manda en la respuesta con Set-Cookie. */
function obtener(req, res) {
    let id = verificar(req.cookies?.[NOMBRE_COOKIE]);

    if (!id) {
        id = nuevoId();
        fijar(res, id);
    }

    return id;
}

function fijar(res, id) {
    res.cookie(NOMBRE_COOKIE, firmar(id), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: DIAS_VIGENCIA * 24 * 60 * 60 * 1000,
        path: '/'
    });
}

module.exports = { obtener, NOMBRE_COOKIE, firmar, verificar, nuevoId };
