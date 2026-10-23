'use strict';

const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createAuthenticate, cookieOptions } = require('../middleware/authenticate');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = '$2b$12$Lx4m.IEYSryqr24AhxIBcep/VlfhuI6HbvOFKmV.3R3tH7oV8x6Be';

function userResponse(user) {
    return {
        id: String(user._id),
        nombre: user.nombre,
        email: user.email,
        role: user.role,
    };
}

function signSession(user, config) {
    return jwt.sign(
        {},
        config.jwtSecret,
        {
            algorithm: 'HS256',
            subject: String(user._id),
            expiresIn: config.jwtExpiresIn,
            issuer: 'zapi-api',
            audience: 'zapi-web',
        }
    );
}

function createAuthRouter(config) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);

    router.post('/registro', async (request, response) => {
        /* Registro publico desactivado: el sitio opera en modo
           "solo administrador". Las cuentas de administrador se crean
           directamente en la base de datos (variable ADMIN_EMAIL /
           ADMIN_PASSWORD al iniciar). */
        return response.status(403).json({
            error: 'El registro de cuentas está desactivado. Este sitio solo admite acceso de administrador.',
        });
    });

    router.post('/login', async (request, response, next) => {
        try {
            const body = request.body || {};
            const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
            const clave = typeof body.clave === 'string' ? body.clave : '';

            if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || !clave || clave.length > 128) {
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

            response.cookie(config.cookieName, signSession(user, config), cookieOptions(config));
            return response.status(200).json({ usuario: userResponse(user) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/yo', authenticate, (request, response) => {
        return response.status(200).json({ usuario: userResponse(request.user) });
    });

    router.post('/logout', (request, response) => {
        response.clearCookie(config.cookieName, cookieOptions(config, false));
        return response.status(204).end();
    });

    return router;
}

module.exports = { createAuthRouter };
