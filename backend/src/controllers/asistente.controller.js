'use strict';
/* ==========================================================
   CONTROLADOR: ASISTENTE
   ------------------------------------------------------------
   Traduce HTTP y delega. Tres endpoints:
     GET  /api/asistente/config    identidad, contacto, promociones
     POST /api/asistente/chat      un mensaje y su respuesta
     POST /api/asistente/tracking  un evento de navegacion

   El chat lleva la sesion (para leer los intereses del visitante
   y no pedir login) y el limite de chat, que va aparte del de
   escritura porque mueve mas.
   ========================================================== */

const { responder, configPublica, registrarActividad } = require('../services/asistente.service');
const { validarMensaje, validarEvento } = require('../validators/asistente.validator');

function cuerpoSeguro(req) {
    return req.body && typeof req.body === 'object' ? req.body : {};
}

async function config(req, res, next) {
    try {
        res.json(configPublica());
    } catch (error) {
        next(error);
    }
}

async function chat(req, res, next) {
    try {
        const resultado = validarMensaje(cuerpoSeguro(req));

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error,
                campo: resultado.campo,
            });
        }

        const salida = await responder({
            sesion: req.sesion,
            mensaje: resultado.datos.mensaje,
        });

        res.json(salida);
    } catch (error) {
        next(error);
    }
}

async function evento(req, res, next) {
    try {
        const resultado = validarEvento(cuerpoSeguro(req));

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error,
                campo: resultado.campo,
            });
        }

        await registrarActividad({ sesion: req.sesion, ...resultado.datos });

        res.status(201).json({ ok: true });
    } catch (error) {
        next(error);
    }
}

module.exports = { config, chat, evento };
