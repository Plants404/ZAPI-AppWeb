'use strict';

const express = require('express');
const Auditoria = require('../../models/Auditoria');
const {
    escaparRegex,
    paginacion,
    parseFecha,
    texto,
} = require('../../utils/validacion');

function createAuditoriaRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const filtro = {};
            const entidad = texto(request.query.entidad);
            const accion = texto(request.query.accion);

            if (entidad) filtro.entidad = entidad;
            if (accion) filtro.accion = accion;

            const desde = parseFecha(request.query.desde);
            const hasta = parseFecha(request.query.hasta, true);

            if (desde || hasta) {
                filtro.createdAt = {};
                if (desde) filtro.createdAt.$gte = desde;
                if (hasta) filtro.createdAt.$lte = hasta;
            }

            const busqueda = texto(request.query.q);

            if (busqueda) {
                const patron = new RegExp(escaparRegex(busqueda), 'i');
                filtro.$or = [{ actorEmail: patron }, { entidadId: patron }, { accion: patron }];
            }

            const [registros, total, entidades] = await Promise.all([
                Auditoria.find(filtro)
                    .populate('actor', 'nombre email')
                    .sort({ createdAt: -1 })
                    .skip(salto)
                    .limit(limite)
                    .lean(),
                Auditoria.countDocuments(filtro),
                Auditoria.distinct('entidad'),
            ]);

            return response.status(200).json({
                registros: registros.map(registro => ({
                    id: String(registro._id),
                    actor: registro.actor
                        ? { nombre: registro.actor.nombre, email: registro.actor.email }
                        : { nombre: 'Sistema', email: registro.actorEmail },
                    accion: registro.accion,
                    entidad: registro.entidad,
                    entidadId: registro.entidadId,
                    detalle: registro.detalle,
                    fecha: registro.createdAt,
                })),
                entidades: entidades.sort((a, b) => a.localeCompare(b, 'es')),
                total,
                pagina,
                paginas: Math.max(1, Math.ceil(total / limite)),
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createAuditoriaRouter };
