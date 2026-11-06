'use strict';

const bcrypt = require('bcryptjs');
const express = require('express');
const User = require('../models/User');
const {
    cookieOptions,
    createAuthenticate,
    firmarSesion,
} = require('../middleware/autenticacion');
const {
    EMAIL_PATTERN,
    normalizarEmail,
    texto,
    validarTelefono,
} = require('../utils/validacion');

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = '$2b$12$Lx4m.IEYSryqr24AhxIBcep/VlfhuI6HbvOFKmV.3R3tH7oV8x6Be';
const CLAVE_CLIENTE_MIN = 8;
const CLAVE_MAX = 128;

function usuarioRespuesta(user) {
    return {
        id: String(user._id),
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono || '',
        role: user.role,
        creado: user.createdAt,
    };
}

function crearCookieSesion(response, user, config) {
    response.cookie(config.cookieName, firmarSesion(user, config), cookieOptions(config));
}

function createAuthRouter(config) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);

    router.post('/registro', async (request, response, next) => {
        if (!config.registroPublico) {
            return response.status(403).json({ error: 'El registro público está desactivado.' });
        }

        try {
            const body = request.body || {};
            const nombre = texto(body.nombre);
            const email = normalizarEmail(body.email);
            const clave = typeof body.clave === 'string' ? body.clave : '';
            const telefono = texto(body.telefono);

            if (nombre.length < 2 || nombre.length > 100) {
                return response.status(400).json({
                    error: 'El nombre debe tener entre 2 y 100 caracteres.',
                    campo: 'nombre',
                });
            }

            if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
                return response.status(400).json({ error: 'Ingresá un correo válido.', campo: 'email' });
            }

            if (telefono && !validarTelefono(telefono)) {
                return response.status(400).json({ error: 'Ingresá un teléfono válido.', campo: 'telefono' });
            }

            if (clave.length < CLAVE_CLIENTE_MIN || clave.length > CLAVE_MAX) {
                return response.status(400).json({
                    error: `La contraseña debe tener entre ${CLAVE_CLIENTE_MIN} y ${CLAVE_MAX} caracteres.`,
                    campo: 'clave',
                });
            }

            if (await User.exists({ email })) {
                return response.status(409).json({
                    error: 'Ya existe una cuenta con ese correo.',
                    campo: 'email',
                });
            }

            const passwordHash = await bcrypt.hash(clave, BCRYPT_ROUNDS);
            const user = await User.create({
                nombre,
                email,
                telefono: telefono || undefined,
                passwordHash,
                role: 'cliente',
            });

            crearCookieSesion(response, user, config);
            return response.status(201).json({ usuario: usuarioRespuesta(user) });
        } catch (error) {
            if (error && error.code === 11000) {
                return response.status(409).json({
                    error: 'Ya existe una cuenta con ese correo.',
                    campo: 'email',
                });
            }

            return next(error);
        }
    });

    router.post('/login', async (request, response, next) => {
        try {
            const body = request.body || {};
            const email = normalizarEmail(body.email);
            const clave = typeof body.clave === 'string' ? body.clave : '';

            if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)
                || !clave || clave.length > CLAVE_MAX) {
                return response.status(400).json({ error: 'Correo o contraseña incorrectos.' });
            }

            const user = await User.findOne({ email }).select('+passwordHash');
            const passwordMatches = await bcrypt.compare(
                clave,
                user ? user.passwordHash : DUMMY_PASSWORD_HASH
            );

            if (!user || !passwordMatches) {
                return response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
            }

            if (!user.activo) {
                return response.status(403).json({
                    error: 'La cuenta está bloqueada. Escribinos por WhatsApp para coordinar.',
                });
            }

            crearCookieSesion(response, user, config);
            return response.status(200).json({ usuario: usuarioRespuesta(user) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/yo', authenticate, (request, response) => {
        return response.status(200).json({ usuario: usuarioRespuesta(request.user) });
    });

    router.post('/logout', (request, response) => {
        response.clearCookie(config.cookieName, cookieOptions(config, false));
        return response.status(204).end();
    });

    return router;
}

module.exports = { createAuthRouter, usuarioRespuesta };
