'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

function cookieOptions(config, conExpiracion = true) {
    return {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        path: '/',
        ...(conExpiracion ? { maxAge: config.cookieMaxAgeMs } : {}),
    };
}

function firmarSesion(user, config) {
    return jwt.sign(
        { role: user.role },
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

async function usuarioDesdeCookie(request, config) {
    const token = request.cookies ? request.cookies[config.cookieName] : null;

    if (!token) return null;

    let payload;

    try {
        payload = jwt.verify(token, config.jwtSecret, {
            algorithms: ['HS256'],
            issuer: 'zapi-api',
            audience: 'zapi-web',
        });
    } catch {
        return null;
    }

    if (!payload || typeof payload.sub !== 'string') return null;

    const user = await User.findById(payload.sub)
        .select('nombre email telefono role activo createdAt')
        .lean();

    if (!user || !user.activo) return null;

    return user;
}

function createAuthenticate(config) {
    return async function authenticate(request, response, next) {
        try {
            const user = await usuarioDesdeCookie(request, config);

            if (!user) {
                return response.status(401).json({ error: 'Iniciá sesión para continuar.' });
            }

            request.user = user;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

function createAuthenticateOpcional(config) {
    return async function authenticateOpcional(request, response, next) {
        try {
            request.user = await usuarioDesdeCookie(request, config);
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

function requireRole(...roles) {
    return function autorizarRol(request, response, next) {
        if (!request.user) {
            return response.status(401).json({ error: 'Iniciá sesión para continuar.' });
        }

        if (!roles.includes(request.user.role)) {
            return response.status(403).json({ error: 'No tenés permiso para acceder a este recurso.' });
        }

        return next();
    };
}

const requireAdmin = requireRole('superadmin');
const requireCliente = requireRole('cliente');

module.exports = {
    cookieOptions,
    createAuthenticate,
    createAuthenticateOpcional,
    firmarSesion,
    requireAdmin,
    requireCliente,
    requireRole,
};
