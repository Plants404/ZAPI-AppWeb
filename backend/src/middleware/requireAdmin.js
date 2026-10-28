'use strict';

const { createAuthenticate, cookieOptions } = require('./authenticate');

/* Middleware de administrador: exige sesion valida y role === 'admin'.
   Reutiliza la autenticacion JWT existente y solo agrega la verificacion
   de rol, evitando duplicar la logica de tokens. */
function createRequireAdmin(config, unauthorizedMessage) {
    const authenticate = createAuthenticate(config, unauthorizedMessage);

    return function requireAdmin(request, response, next) {
        authenticate(request, response, error => {
            if (error) return next(error);
            if (response.headersSent) return;

            if (!request.user || request.user.role !== 'admin') {
                response.clearCookie(config.cookieName, cookieOptions(config, false));
                return response.status(403).json({ error: 'No tenés permiso de administrador.' });
            }

            return next();
        });
    };
}

module.exports = { createRequireAdmin, cookieOptions };