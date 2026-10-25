'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* Middleware de administrador: exige sesion valida y role === 'admin'.
   Se usa para proteger rutas de gestion de productos, pedidos, stock y
   usuarios. No elimina ni modifica el middleware de autenticacion
   estricto existente. */
function createRequireAdmin(config, unauthorizedMessage) {
    return async function requireAdmin(request, response, next) {
        const token = request.cookies[config.cookieName];
        const errorMessage = unauthorizedMessage || 'Se requiere sesion de administrador.';

        if (!token) {
            return response.status(401).json({ error: errorMessage });
        }

        try {
            const claims = jwt.verify(token, config.jwtSecret, {
                algorithms: ['HS256'],
                issuer: 'zapi-api',
                audience: 'zapi-web',
            });

            const user = await User.findById(claims.sub);
            if (!user || user.role !== 'admin') {
                response.clearCookie(config.cookieName, cookieOptions(config, false));
                return response.status(403).json({ error: 'No tenés permiso de administrador.' });
            }

            request.auth = { sub: claims.sub };
            request.user = user;
            return next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                response.clearCookie(config.cookieName, cookieOptions(config, false));
                return response.status(401).json({
                    error: 'La sesión venció. Iniciá sesión nuevamente.',
                });
            }

            return next(error);
        }
    };
}

function cookieOptions(config, includeMaxAge = true) {
    const options = {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        path: '/api',
    };

    if (includeMaxAge) options.maxAge = config.cookieMaxAgeMs;
    return options;
}

module.exports = { createRequireAdmin, cookieOptions };
