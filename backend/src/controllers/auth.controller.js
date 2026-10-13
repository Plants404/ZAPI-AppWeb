'use strict';
/* ==========================================================
   CONTROLADOR: CUENTAS
   ------------------------------------------------------------
   POST /api/auth/registro  { nombre, email, clave }
   POST /api/auth/login     { email, clave }
   POST /api/auth/logout
   GET  /api/auth/yo

   El controlador valida formato y traduce a HTTP; el alta y la
   verificacion las hace services/usuarios.service.js y el ciclo
   de la sesion, services/sesiones.service.js.

   La cookie de sesion es HttpOnly (el JS del sitio no la lee),
   SameSite=Lax (no viaja desde otro sitio) y Secure en produccion
   (solo por HTTPS). Se borra al cerrar sesion.
   ========================================================== */

const config = require('../config/env');
const { limpiarTexto } = require('../utils/texto');
const { CORREO, LARGO, MINIMOS, VIDA_SESION_USUARIO_S } = require('../constants');
const usuarios = require('../services/usuarios.service');
const sesiones = require('../services/sesiones.service');
const { NOMBRE_SESION, leerToken } = require('../middlewares/auth');

async function abrirSesion(res, usuario) {
    const token = await sesiones.abrir(usuario._id);

    res.cookie(NOMBRE_SESION, token, {
        httpOnly: true,
        /* El frontend puede vivir en otro origen (GitHub Pages) y
           llamar a esta API con fetch + credentials: para que la
           cookie viaje cross-site hacen falta SameSite=None y Secure,
           que solo aplican en produccion (Secure viene de esProduccion). */
        sameSite: config.esProduccion ? 'none' : 'lax',
        secure: config.esProduccion,
        path: '/',
        maxAge: VIDA_SESION_USUARIO_S * 1000,
    });
}

async function registro(req, res, next) {
    try {
        const email = limpiarTexto(req.body && req.body.email, LARGO.correo).toLowerCase();
        const nombre = limpiarTexto(req.body && req.body.nombre, LARGO.nombre);
        const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';

        if (!CORREO.test(email)) {
            return res.status(400).json({ error: 'Revisá el correo', campo: 'email' });
        }

        if (nombre.length < MINIMOS.nombre) {
            return res.status(400).json({ error: 'Escribí tu nombre', campo: 'nombre' });
        }

        if (clave.length < MINIMOS.clave) {
            return res.status(400).json({
                error: `La contraseña necesita al menos ${MINIMOS.clave} caracteres`,
                campo: 'clave',
            });
        }

        if (clave.length > LARGO.clave) {
            return res.status(400).json({ error: 'La contraseña es demasiado larga', campo: 'clave' });
        }

        const resultado = await usuarios.crear({ email, nombre, clave });

        if (resultado.tipo === 'duplicado') {
            return res.status(409).json({
                error: 'Ya existe una cuenta con ese correo',
                campo: 'email',
            });
        }

        await abrirSesion(res, resultado.usuario);

        res.status(201).json({ usuario: usuarios.publico(resultado.usuario) });
    } catch (error) {
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const email = limpiarTexto(req.body && req.body.email, LARGO.correo).toLowerCase();
        const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';

        const usuario = await usuarios.verificar(email, clave);

        if (!usuario) {
            /* Mismo mensaje para correo inexistente y clave
               equivocada: no hay que revelar que correos estan
               registrados. */
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        await abrirSesion(res, usuario);

        res.json({ usuario: usuarios.publico(usuario) });
    } catch (error) {
        next(error);
    }
}

async function logout(req, res, next) {
    try {
        await sesiones.cerrar(leerToken(req));

        res.clearCookie(NOMBRE_SESION, { path: '/' });

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
}

/* Lo usa el front al cargar para saber si hay cuenta. Responde 200
   siempre: "no hay sesion" no es un error, es una respuesta. */
function yo(req, res) {
    res.json({ usuario: req.usuario ? usuarios.publico(req.usuario) : null });
}

module.exports = { registro, login, logout, yo };
