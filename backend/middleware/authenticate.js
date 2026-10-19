'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createAuthenticate(config, unauthorizedMessage) {
    return async function authenticate(request, response, next) {
        const token = request.cookies[config.cookieName];
        const errorMessage = unauthorizedMessage || 'Iniciá sesión para continuar.';

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
            if (!user) {
                response.clearCookie(config.cookieName, cookieOptions(config, false));
                return response.status(401).json({ error: unauthorizedMessage || 'La cuenta ya no está disponible.' });
            }

            request.auth = { sub: claims.sub };
            request.user = user;
            return next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                response.clearCookie(config.cookieName, cookieOptions(config, false));
                return response.status(401).json({
                    error: unauthorizedMessage || 'La sesión venció. Iniciá sesión nuevamente.',
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

module.exports = { createAuthenticate, cookieOptions };
