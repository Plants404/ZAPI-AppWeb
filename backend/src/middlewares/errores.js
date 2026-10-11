'use strict';
/* ==========================================================
   MANEJO DE ERRORES
   ------------------------------------------------------------
   404 de API aparte de 404 de pagina: una ruta /api que no
   existe tiene que contestar JSON. Si cayera en el 404 de
   paginas devolveria index.html, y el fetch solo recibiria un
   error de sintaxis.

   El manejador central distingue los dos errores que produce
   express.json() antes de que corra ningun controlador (cuerpo
   mal formado y cuerpo demasiado grande) del resto. Al visitante
   se le da un mensaje generico; la traza queda en el servidor:
   en produccion nunca sale al cliente.
   ========================================================== */

const log = require('../utils/log');
const config = require('../config/env');

function noEncontradoApi(req, res) {
    res.status(404).json({ error: 'Ruta de API inexistente' });
}

function manejadorErrores(error, req, res, next) {
    /* Si ya se empezo a responder no se puede cambiar el estado:
       se delega al manejador por defecto de Express. */
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'El cuerpo de la petición no es JSON válido',
        });
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'El cuerpo de la petición es demasiado grande',
        });
    }

    /* No se registra el cuerpo: llevaria datos de clientes a los
       logs. Si el stack no se incluye en el log es porque
       config.esProduccion lo decide mas abajo. */
    log.error('error no controlado', {
        metodo: req.method,
        ruta: req.originalUrl,
        mensaje: error.message,
        stack: config.esProduccion ? undefined : error.stack,
    });

    res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { noEncontradoApi, manejadorErrores };
