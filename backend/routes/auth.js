'use strict';

/* Rutas de sesión: registro, ingreso, salida y usuario actual. */

const { randomUUID } = require('node:crypto');
const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const {
    CLAVE_MINIMA,
    SESION_ADMIN_HORAS,
    hashPassword,
    verificarPassword,
    sessionIdDeCookie,
    setCookieSesion,
    limpiarCookieSesion
} = require('../lib/auth.js');
const { verificarLimite } = require('../lib/limiter.js');

const VALIDAR_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textoObligatorio(valor, campo, maximo) {
    if (typeof valor !== 'string') throw new HttpError(400, `El campo ${campo} no es válido.`);
    const limpio = valor.trim();
    if (!limpio || limpio.length > maximo) throw new HttpError(400, `El campo ${campo} no es válido.`);
    return limpio;
}

function crearRouter(getDatabase) {
    const router = express.Router();

    router.post('/login', async (req, res) => {
        const { email, clave } = req.body || {};
        if (typeof email !== 'string' || !VALIDAR_EMAIL.test(email.trim())
            || typeof clave !== 'string' || clave.length === 0) {
            throw new HttpError(401, 'Correo o contraseña incorrectos.');
        }

        const db = getDatabase();
        const correo = email.trim().toLowerCase();

        /* El límite por IP está en app.js. Este cuenta por correo, para frenar
           adivinanzas repartidas entre muchas IPs. */
        const { permitido, retryAfter } = await verificarLimite(db, 'login-correo', correo);
        if (!permitido) {
            res.set('Retry-After', String(retryAfter));
            throw new HttpError(429, 'Demasiadas solicitudes. Intentá de nuevo más tarde.');
        }

        const usuario = await db.collection('users').findOne({ email: correo });

        if (!usuario || !verificarPassword(clave, usuario.passwordSalt, usuario.passwordHash)) {
            throw new HttpError(401, 'Correo o contraseña incorrectos.');
        }

        const sessionId = randomUUID();
        const expiresAt = new Date(Date.now() + SESION_ADMIN_HORAS * 60 * 60 * 1000);
        await db.collection('sessions').insertOne({
            _id: sessionId,
            userId: usuario._id ? String(usuario._id) : usuario.id,
            email: usuario.email,
            rol: usuario.rol,
            nombre: usuario.nombre,
            expiresAt
        });

        setCookieSesion(res, sessionId, SESION_ADMIN_HORAS * 60 * 60);

        res.json({
            ok: true,
            rol: usuario.rol,
            nombre: usuario.nombre,
            email: usuario.email
        });
    });

    router.post('/registro', async (req, res) => {
        const { nombre, email, clave } = req.body || {};
        const nombreLimpio = textoObligatorio(nombre, 'nombre', 120);
        const emailLimpio = textoObligatorio(email, 'email', 160);
        if (!VALIDAR_EMAIL.test(emailLimpio)) {
            throw new HttpError(400, 'El correo electrónico no es válido.');
        }
        if (typeof clave !== 'string' || clave.length < CLAVE_MINIMA) {
            throw new HttpError(400, `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`);
        }

        const db = getDatabase();
        const existente = await db.collection('users').findOne({ email: emailLimpio.toLowerCase() });
        if (existente) {
            throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
        }

        const { salt, hash } = hashPassword(clave);
        await db.collection('users').insertOne({
            email: emailLimpio.toLowerCase(),
            passwordSalt: salt,
            passwordHash: hash,
            rol: 'cliente',
            nombre: nombreLimpio,
            createdAt: new Date()
        });

        res.status(201).json({ ok: true, rol: 'cliente' });
    });

    router.post('/logout', async (req, res) => {
        const sessionId = sessionIdDeCookie(req);
        if (sessionId) {
            const db = getDatabase();
            await db.collection('sessions').deleteOne({ _id: sessionId });
        }
        limpiarCookieSesion(res);
        res.json({ ok: true });
    });

    router.get('/yo', async (req, res) => {
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

        res.json({
            ok: true,
            rol: sesion.rol,
            nombre: sesion.nombre,
            email: sesion.email
        });
    });

    return router;
}

module.exports = { crearRouter };
