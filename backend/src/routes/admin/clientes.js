'use strict';

const express = require('express');
const Orden = require('../../models/Orden');
const User = require('../../models/User');
const { registrarAuditoria } = require('../../utils/auditoria');
const { ordenAdmin } = require('../../utils/ordenes');
const {
    esIdMongo,
    escaparRegex,
    paginacion,
    texto,
} = require('../../utils/validacion');

function createClientesRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const match = { role: 'cliente' };

            if (request.query.activo === '1' || request.query.activo === 'true') match.activo = true;
            if (request.query.activo === '0' || request.query.activo === 'false') match.activo = false;

            const busqueda = texto(request.query.q);

            if (busqueda) {
                const patron = new RegExp(escaparRegex(busqueda), 'i');
                match.$or = [{ nombre: patron }, { email: patron }, { telefono: patron }];
            }

            const [clientes, total] = await Promise.all([
                User.aggregate([
                    { $match: match },
                    {
                        $lookup: {
                            from: 'ordenes',
                            localField: '_id',
                            foreignField: 'cliente',
                            as: 'ordenes',
                        },
                    },
                    {
                        $addFields: {
                            pedidos: { $size: '$ordenes' },
                            totalGastado: {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: '$ordenes',
                                                as: 'orden',
                                                cond: { $ne: ['$$orden.estado', 'cancelado'] },
                                            },
                                        },
                                        as: 'orden',
                                        in: '$$orden.total',
                                    },
                                },
                            },
                        },
                    },
                    { $project: { passwordHash: 0, ordenes: 0 } },
                    { $sort: { createdAt: -1 } },
                    { $skip: salto },
                    { $limit: limite },
                ]),
                User.countDocuments(match),
            ]);

            return response.status(200).json({
                clientes: clientes.map(cliente => ({
                    id: String(cliente._id),
                    nombre: cliente.nombre,
                    email: cliente.email,
                    telefono: cliente.telefono || '',
                    activo: cliente.activo,
                    creado: cliente.createdAt,
                    pedidos: cliente.pedidos,
                    totalGastado: Math.round(cliente.totalGastado * 100) / 100,
                })),
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
                return response.status(404).json({ error: 'Cliente no encontrado.' });
            }

            const cliente = await User.findOne({ _id: request.params.id, role: 'cliente' })
                .select('nombre email telefono activo createdAt')
                .lean();

            if (!cliente) return response.status(404).json({ error: 'Cliente no encontrado.' });

            const ordenes = await Orden.find({ cliente: cliente._id })
                .sort({ createdAt: -1 })
                .limit(80)
                .lean();

            return response.status(200).json({
                cliente: {
                    id: String(cliente._id),
                    nombre: cliente.nombre,
                    email: cliente.email,
                    telefono: cliente.telefono || '',
                    activo: cliente.activo,
                    creado: cliente.createdAt,
                },
                ordenes: ordenes.map(ordenAdmin),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Cliente no encontrado.' });
            }

            if (typeof (request.body || {}).activo !== 'boolean') {
                return response.status(400).json({ error: 'Indicá si la cuenta queda activa o bloqueada.', campo: 'activo' });
            }

            const cliente = await User.findOneAndUpdate(
                { _id: request.params.id, role: 'cliente' },
                { $set: { activo: request.body.activo } },
                { returnDocument: 'after', runValidators: true }
            ).select('nombre email telefono activo createdAt').lean();

            if (!cliente) return response.status(404).json({ error: 'Cliente no encontrado.' });

            await registrarAuditoria({
                actor: request.user,
                accion: request.body.activo ? 'desbloquear' : 'bloquear',
                entidad: 'cliente',
                entidadId: cliente._id,
                detalle: { email: cliente.email },
            });

            return response.status(200).json({
                cliente: {
                    id: String(cliente._id),
                    nombre: cliente.nombre,
                    email: cliente.email,
                    telefono: cliente.telefono || '',
                    activo: cliente.activo,
                    creado: cliente.createdAt,
                },
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createClientesRouter };
