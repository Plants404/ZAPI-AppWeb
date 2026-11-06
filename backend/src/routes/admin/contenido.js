'use strict';

const express = require('express');
const Contenido = require('../../models/Contenido');
const { SECCIONES } = require('../../data/contenido');
const { registrarAuditoria } = require('../../utils/auditoria');
const { contenidoCompleto, normalizarSeccion } = require('../../utils/contenido');
const { texto } = require('../../utils/validacion');

function createContenidoRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const secciones = await Contenido.find().lean();
            return response.status(200).json({ contenido: contenidoCompleto(secciones) });
        } catch (error) {
            return next(error);
        }
    });

    router.put('/:clave', async (request, response, next) => {
        try {
            const clave = texto(request.params.clave);

            if (!SECCIONES.includes(clave)) {
                return response.status(404).json({ error: 'Sección de contenido no encontrada.' });
            }

            const valor = normalizarSeccion(clave, request.body || {});
            const seccion = await Contenido.findOneAndUpdate(
                { clave },
                { $set: { valor, actualizadoPor: request.user._id } },
                { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
            ).lean();

            await registrarAuditoria({
                actor: request.user,
                accion: 'actualizar',
                entidad: 'contenido',
                entidadId: clave,
                detalle: { seccion: clave },
            });

            return response.status(200).json({ clave, valor: seccion.valor });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createContenidoRouter };
