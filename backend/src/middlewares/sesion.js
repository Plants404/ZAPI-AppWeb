'use strict';
/* ==========================================================
   SESION POR COOKIE FIRMADA
   ------------------------------------------------------------
   El carrito no exige login: un visitante puede cerrar un pedido
   sin cuenta. La sesion es un id aleatorio que viaja en una
   cookie HttpOnly con firma HMAC, para que el visitante no pueda
   elegir la sesion de otro (ni por que adivinarse) inventando un
   id y firmandolo.

   zapi_sesion = payload.firma
     payload = base64url({ v: 1, id })
     firma   = HMAC-SHA256(payload) con ZAPI_SESSION_SECRET

   El secreto sale del entorno; en desarrollo, si no esta, se
   genera uno efimero por proceso con un aviso. En produccion
   env.js no deja arrancar sin el: con un secreto por proceso,
   todas las sesiones moririan en el proximo reinicio.
   ========================================================== */

const crypto = require('crypto');

const config = require('../config/env');
const log = require('../utils/log');
const { VIDA_SESION_MS } = require('../constants');

const NOMBRE = 'zapi_sesion';

let secreto = config.sesionSecreto;
let avisado = false;

function obtenerSecreto() {
    if (secreto) return secreto;

    if (!avisado) {
        log.warn('ZAPI_SESSION_SECRET sin configurar: las sesiones no sobreviven un reinicio');
        avisado = true;
    }

    return crypto.randomBytes(32).toString('hex');
}

function firmar(id) {
    const payload = Buffer.from(JSON.stringify({ v: 1, id })).toString('base64url');
    const firma = crypto.createHmac('sha256', obtenerSecreto()).update(payload).digest('base64url');

    return `${payload}.${firma}`;
}

function verificar(valor) {
    if (typeof valor !== 'string' || !valor.includes('.')) return null;

    const [payload, firma] = valor.split('.');

    if (!payload || !firma) return null;

    const esperada = crypto.createHmac('sha256', obtenerSecreto()).update(payload).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;

    try {
        const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

        return datos && datos.v === 1 && typeof datos.id === 'string' ? datos.id : null;
    } catch {
        return null;
    }
}

function nuevaId() {
    return crypto.randomBytes(18).toString('base64url');
}

function parsearCookies(req) {
    const cabecera = req.headers.cookie || '';
    const cookies = {};

    for (const parte of cabecera.split(';')) {
        const igual = parte.indexOf('=');

        if (igual === -1) continue;

        const nombre = parte.slice(0, igual).trim();

        if (!nombre) continue;

        cookies[nombre] = decodeURIComponent(parte.slice(igual + 1).trim());
    }

    return cookies;
}

/* Parsea el id, lo firma para el camino de vuelta y lo deja en
   req.sesion. La cookie solo se escribe cuando no habia una
   valida: las lecturas de un carrito que ya tiene sesion no
   renuevan nada. */
function sesion(req, res, next) {
    const cookies = parsearCookies(req);
    let id = verificar(cookies[NOMBRE]);

    if (!id) {
        id = nuevaId();

        res.cookie(NOMBRE, firmar(id), {
            httpOnly: true,
            sameSite: 'lax',
            secure: config.esProduccion,
            path: '/',
            maxAge: VIDA_SESION_MS,
        });
    }

    req.sesion = id;

    next();
}

module.exports = { sesion, firmar, verificar, NOMBRE };