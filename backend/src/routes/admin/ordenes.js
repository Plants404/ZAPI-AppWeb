'use strict';

const express = require('express');
const Orden = require('../../models/Orden');
const { registrarAuditoria } = require('../../utils/auditoria');
const { cancelarOrden, ESTADOS, ordenAdmin } = require('../../utils/ordenes');
const {
    escaparRegex,
    esIdMongo,
    paginacion,
    parseFecha,
    texto,
} = require('../../utils/validacion');

function filtrosOrdenes(query) {
    const filtro = {};

    if (ESTADOS.includes(query.estado)) filtro.estado = query.estado;
    if (['online', 'presencial'].includes(query.canal)) filtro.canal = query.canal;

    const desde = parseFecha(query.desde);
    const hasta = parseFecha(query.hasta, true);

    if (desde || hasta) {
        filtro.createdAt = {};
        if (desde) filtro.createdAt.$gte = desde;
        if (hasta) filtro.createdAt.$lte = hasta;
    }

    const busqueda = texto(query.q);

    if (busqueda) {
        const patron = new RegExp(escaparRegex(busqueda), 'i');
        filtro.$or = [
            { codigo: patron },
            { 'contacto.nombre': patron },
            { 'contacto.email': patron },
            { 'contacto.telefono': patron },
        ];
    }

    return filtro;
}

function createOrdenesRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const filtro = filtrosOrdenes(request.query);

            const [ordenes, total] = await Promise.all([
                Orden.find(filtro)
                    .populate('cliente', 'nombre email')
                    .populate('creadoPor', 'nombre email')
                    .sort({ createdAt: -1 })
                    .skip(salto)
                    .limit(limite)
                    .lean(),
                Orden.countDocuments(filtro),
            ]);

            return response.status(200).json({
                ordenes: ordenes.map(ordenAdmin),
                total,
                pagina,
                paginas: Math.max(1, Math.ceil(total / limite)),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/:id', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Orden no encontrada.' });
            }

            const orden = await Orden.findById(request.params.id)
                .populate('cliente', 'nombre email telefono')
                .populate('creadoPor', 'nombre email')
                .lean();

            if (!orden) return response.status(404).json({ error: 'Orden no encontrada.' });

            return response.status(200).json({ orden: ordenAdmin(orden) });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Orden no encontrada.' });
            }

            const body = request.body || {};
            const estado = body.estado === undefined ? null : texto(body.estado);
            const notasInternas = body.notasInternas === undefined ? undefined : texto(body.notasInternas);

            if (estado !== null && !ESTADOS.includes(estado)) {
                return response.status(400).json({ error: 'El estado indicado no es válido.', campo: 'estado' });
            }

            if (notasInternas !== undefined && notasInternas.length > 2000) {
                return response.status(400).json({
                    error: 'Las notas internas no pueden superar 2000 caracteres.',
                    campo: 'notasInternas',
                });
            }

            if (estado === 'cancelado') {
                const motivo = texto(body.motivoCancelacion) || 'Cancelada desde el panel';
                const orden = await cancelarOrden(request.params.id, {
                    motivo: motivo.slice(0, 300),
                    usuario: request.user,
                });

                await registrarAuditoria({
                    actor: request.user,
                    accion: 'cancelar',
                    entidad: 'orden',
                    entidadId: orden._id,
                    detalle: { codigo: orden.codigo, motivo },
                });

                return response.status(200).json({ orden: ordenAdmin(orden) });
            }

            const cambios = {};

            if (estado !== null) cambios.estado = estado;
            if (notasInternas !== undefined) cambios.notasInternas = notasInternas || null;

            if (!Object.keys(cambios).length) {
                return response.status(400).json({ error: 'No hay cambios para guardar.' });
            }

            const orden = await Orden.findOneAndUpdate(
                { _id: request.params.id, estado: { $ne: 'cancelado' } },
                { $set: cambios },
                { returnDocument: 'after', runValidators: true }
            )
                .populate('cliente', 'nombre email')
                .populate('creadoPor', 'nombre email')
                .lean();

            if (!orden) {
                return response.status(409).json({ error: 'La orden no existe o está cancelada.' });
            }

            await registrarAuditoria({
                actor: request.user,
                accion: 'actualizar',
                entidad: 'orden',
                entidadId: orden._id,
                detalle: { codigo: orden.codigo, cambios },
            });

            return response.status(200).json({ orden: ordenAdmin(orden) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createOrdenesRouter, filtrosOrdenes };
