'use strict';

const express = require('express');
const Orden = require('../../models/Orden');
const User = require('../../models/User');
const { registrarAuditoria } = require('../../utils/auditoria');
const { cancelarOrden, crearOrden, METODOS_PAGO, ordenAdmin } = require('../../utils/ordenes');
const {
    esIdMongo,
    paginacion,
    parseFecha,
    texto,
    validarTelefono,
} = require('../../utils/validacion');

function fechaDelDia(valor) {
    const fecha = parseFecha(valor);
    const inicio = fecha || new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
}

function createVentasRouter(config) {
    const router = express.Router();

    router.get('/cierre', async (request, response, next) => {
        try {
            const { inicio, fin } = fechaDelDia(request.query.fecha);
            const filas = await Orden.aggregate([
                { $match: { canal: 'presencial', createdAt: { $gte: inicio, $lte: fin } } },
                {
                    $group: {
                        _id: { metodoPago: '$metodoPago', estado: '$estado' },
                        total: { $sum: '$total' },
                        ventas: { $sum: 1 },
                    },
                },
                { $sort: { '_id.metodoPago': 1 } },
            ]);

            const metodos = {};

            for (const metodo of METODOS_PAGO.filter(valor => valor !== 'online')) {
                metodos[metodo] = { metodo, total: 0, ventas: 0, anulado: 0, ventasAnuladas: 0 };
            }

            for (const fila of filas) {
                const metodo = metodos[fila._id.metodoPago];
                if (!metodo) continue;

                if (fila._id.estado === 'cancelado') {
                    metodo.anulado = Math.round(fila.total * 100) / 100;
                    metodo.ventasAnuladas = fila.ventas;
                } else {
                    metodo.total = Math.round(fila.total * 100) / 100;
                    metodo.ventas = fila.ventas;
                }
            }

            const lista = Object.values(metodos);
            const total = Math.round(lista.reduce((suma, metodo) => suma + metodo.total, 0) * 100) / 100;

            return response.status(200).json({
                fecha: inicio.toISOString().slice(0, 10),
                metodos: lista,
                total,
            });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const { inicio, fin } = fechaDelDia(request.query.fecha);
            const filtro = {
                canal: 'presencial',
                createdAt: { $gte: inicio, $lte: fin },
            };

            if (['cancelado', 'entregado'].includes(request.query.estado)) {
                filtro.estado = request.query.estado;
            }

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

    router.post('/', async (request, response, next) => {
        try {
            const body = request.body || {};
            const metodoPago = texto(body.metodoPago);
            const descuento = Number(body.descuento) || 0;
            const notas = texto(body.notas) || null;
            const clienteId = body.clienteId ? texto(body.clienteId) : null;

            if (!METODOS_PAGO.includes(metodoPago) || metodoPago === 'online') {
                return response.status(400).json({ error: 'Elegí un método de pago válido.', campo: 'metodoPago' });
            }

            if (!Number.isFinite(descuento) || descuento < 0) {
                return response.status(400).json({ error: 'El descuento no es válido.', campo: 'descuento' });
            }

            if (!Array.isArray(body.items) || body.items.length > config.maxItemsPorPedido) {
                return response.status(400).json({ error: 'El ticket no tiene productos válidos.', campo: 'items' });
            }

            let cliente = null;

            if (clienteId) {
                if (!esIdMongo(clienteId)) {
                    return response.status(400).json({ error: 'El cliente indicado no es válido.', campo: 'clienteId' });
                }

                cliente = await User.findOne({ _id: clienteId, role: 'cliente', activo: true })
                    .select('nombre email telefono')
                    .lean();

                if (!cliente) {
                    return response.status(404).json({ error: 'Cliente no encontrado.' });
                }
            }

            const nombre = texto(body.nombre) || (cliente ? cliente.nombre : 'Venta presencial');
            const telefono = texto(body.telefono) || (cliente ? cliente.telefono : '') || '';

            if (telefono && !validarTelefono(telefono)) {
                return response.status(400).json({ error: 'El teléfono no es válido.', campo: 'telefono' });
            }

            const orden = await crearOrden({
                canal: 'presencial',
                items: body.items,
                contacto: {
                    nombre: nombre.slice(0, 120),
                    telefono,
                    ...(cliente && cliente.email ? { email: cliente.email } : {}),
                },
                cliente,
                creadoPor: request.user,
                metodoPago,
                descuento,
                notas,
                envioGratis: config.envioGratis,
                usuario: request.user,
            });

            await registrarAuditoria({
                actor: request.user,
                accion: 'crear',
                entidad: 'venta',
                entidadId: orden._id,
                detalle: { codigo: orden.codigo, total: orden.total, metodoPago },
            });

            return response.status(201).json({ venta: ordenAdmin(orden) });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id/anular', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Venta no encontrada.' });
            }

            const motivo = texto(request.body && request.body.motivo);

            if (motivo.length < 3 || motivo.length > 300) {
                return response.status(400).json({
                    error: 'Indicá un motivo de anulación de entre 3 y 300 caracteres.',
                    campo: 'motivo',
                });
            }

            const existente = await Orden.findById(request.params.id).select('canal').lean();

            if (!existente) {
                return response.status(404).json({ error: 'Venta no encontrada.' });
            }

            if (existente.canal !== 'presencial') {
                return response.status(400).json({ error: 'La orden no es una venta presencial.' });
            }

            const orden = await cancelarOrden(request.params.id, {
                motivo,
                usuario: request.user,
                canal: 'presencial',
            });

            await registrarAuditoria({
                actor: request.user,
                accion: 'anular',
                entidad: 'venta',
                entidadId: orden._id,
                detalle: { codigo: orden.codigo, motivo },
            });

            return response.status(200).json({ venta: ordenAdmin(orden) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createVentasRouter };
