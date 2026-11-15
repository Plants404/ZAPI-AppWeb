'use strict';

/* Autenticación con sesión en servidor (sin JWT).
   Contraseñas con scrypt, sal por usuario y timingSafeEqual.
   Sesiones guardadas en Mongo con índice TTL: 8 horas para admins. */

const { randomUUID, scryptSync, timingSafeEqual } = require('node:crypto');
const { HttpError } = require('./http-error.js');

const CLAVE_MINIMA = 12;
const SESION_ADMIN_HORAS = 8;
const COOKIE_NOMBRE = 'sessionId';

function cookieSegura() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL !== undefined;
}

function hashPassword(password) {
    const salt = randomUUID().replace(/-/g, '');
    const hash = scryptSync(password, Buffer.from(salt, 'hex'), 64);
    return { salt, hash: hash.toString('hex') };
}

function verificarPassword(password, salt, hash) {
    const intento = scryptSync(password, Buffer.from(salt, 'hex'), 64);
    const esperado = Buffer.from(hash, 'hex');
    if (intento.length !== esperado.length) return false;
    return timingSafeEqual(intento, esperado);
}

/* Lee sessionId de la cabecera Cookie (sin dependencia de cookie-parser). */
function sessionIdDeCookie(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/(?:^|;\s*)sessionId=([^;]+)/);
    return match ? match[1] : null;
}

/* Middleware: exige sesión válida y rol admin. */
function requerirAdmin(getDatabase) {
    return async function middleware(req, res, next) {
        const sessionId = sessionIdDeCookie(req);
        if (!sessionId) {
            throw new HttpError(401, 'Sesión requerida.');
        }

        const db = getDatabase();
        const sesion = await db.collection('sessions').findOne({ _id: sessionId });
        const ahora = new Date();
        if (!sesion || !sesion.expiresAt || sesion.expiresAt <= ahora) {
            throw new HttpError(401, 'Sesión inválida o expirada.');
        }
        if (sesion.rol !== 'admin') {
            throw new HttpError(403, 'Acceso solo para administradores.');
        }

        req.usuario = {
            id: sesion.userId,
            email: sesion.email,
            rol: sesion.rol,
            nombre: sesion.nombre
        };
        next();
    };
}

/* Middleware: exige sesión válida (cualquier rol autenticado). */
function requerirSesion(getDatabase) {
    return async function middleware(req, res, next) {
        const sessionId = sessionIdDeCookie(req);
        if (!sessionId) {
            throw new HttpError(401, 'Sesión requerida.');
        }

        const db = getDatabase();
        const sesion = await db.collection('sessions').findOne({ _id: sessionId });
        const ahora = new Date();
        if (!sesion || !sesion.expiresAt || sesion.expiresAt <= ahora) {
            throw new HttpError(401, 'Sesión inválida o expirada.');
        }

        req.usuario = {
            id: sesion.userId,
            email: sesion.email,
            rol: sesion.rol,
            nombre: sesion.nombre
        };
        next();
    };
}

function setCookieSesion(res, sessionId, maxAgeSegundos) {
    res.cookie(COOKIE_NOMBRE, sessionId, {
        httpOnly: true,
        secure: cookieSegura(),
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeSegundos * 1000
    });
}

function limpiarCookieSesion(res) {
    const atributos = [
        'HttpOnly',
        ...(cookieSegura() ? ['Secure'] : []),
        'SameSite=Lax',
        'Path=/',
        'Max-Age=0'
    ];
    res.setHeader('Set-Cookie', `${COOKIE_NOMBRE}=; ${atributos.join('; ')}`);
}

module.exports = {
    CLAVE_MINIMA,
    SESION_ADMIN_HORAS,
    COOKIE_NOMBRE,
    hashPassword,
    verificarPassword,
    sessionIdDeCookie,
    requerirAdmin,
    requerirSesion,
    setCookieSesion,
    limpiarCookieSesion
};
