'use strict';
/* ==========================================================
   AUTENTICACION DE CUENTA
   ------------------------------------------------------------
   Reconoce al usuario a partir de la cookie zapi_auth. El valor
   de la cookie es un token opaco que se busca en la coleccion de
   sesiones (services/sesiones.service.js); no lleva firma porque
   no lleva datos que falsificar.

   Dos formas de usarlo:
     - exigirSesion: corta con 401 si no hay cuenta. Es para lo
       que exige estar adentro (cerrar un pedido).
     - opcional: deja pasar siempre. Si hay cuenta, deja
       req.usuario; si no, queda en null. Es para /api/auth/yo, que
       tiene que poder responder "no hay sesion" sin ser un error.

   El login sigue funcionando aunque el carrito siga siendo
   anonimo: son dos cookies distintas y no se pisan.
   ========================================================== */

const { parsearCookies } = require('./sesion');
const sesiones = require('../services/sesiones.service');

const NOMBRE_SESION = 'zapi_auth';

/* El token de la cookie, o null. Solo se mira esta cookie. */
function leerToken(req) {
    const valor = parsearCookies(req)[NOMBRE_SESION];

    return typeof valor === 'string' && valor ? valor : null;
}

/* Deja req.usuario si la cookie tiene una sesion valida. */
async function resolver(req) {
    const token = leerToken(req);

    if (!token) return null;

    const usuario = await sesiones.usuarioDe(token);

    if (usuario) {
        req.sesionUsuario = token;
        req.usuario = usuario;
        await sesiones.tocar(token);
    }

    return usuario || null;
}

async function opcional(req, res, next) {
    try {
        await resolver(req);

        next();
    } catch (error) {
        next(error);
    }
}

async function exigirSesion(req, res, next) {
    try {
        const usuario = await resolver(req);

        if (!usuario) {
            return res.status(401).json({
                error: 'Iniciá sesión para continuar',
                codigo: 'sin-sesion',
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { NOMBRE_SESION, leerToken, exigirSesion, opcional };
