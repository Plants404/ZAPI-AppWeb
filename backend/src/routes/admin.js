'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Testimonio = require('../models/Testimonio');
const Stock = require('../models/Stock');
const { createRequireAdmin } = require('../middleware/requireAdmin');

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];

const { fieldError } = require('../utils/fieldError');

function createAdminRouter({ config, readLimiter, writeLimiter }) {
    const router = express.Router();
    const requireAdmin = createRequireAdmin(config);

    /* ---------- Dashboard ---------- */
    router.get('/dashboard', readLimiter, requireAdmin, async (request, response, next) => {
        try {
            const [totalPedidos, pedidosPendientes, totalUsuarios, totalAdmins, testimoniosPendientes, stockBajo] = await Promise.all([
                Order.countDocuments(),
                Order.countDocuments({ estado: 'pendiente' }),
                User.countDocuments(),
                User.countDocuments({ role: 'admin' }),
                Testimonio.countDocuments({ verificado: false, autorizado: false }),
                Stock.countDocuments({ unidades: { $lte: 5 } }),
            ]);

            const pedidosRecientes = await Order.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            return response.status(200).json({
                totalPedidos,
                pedidosPendientes,
                totalUsuarios,
                totalAdmins,
                testimoniosPendientes,
                stockBajo,
                pedidosRecientes: pedidosRecientes.map(p => ({
                    id: String(p._id),
                    nombre: p.contacto.nombre,
                    telefono: p.contacto.telefono,
                    total: p.total,
                    estado: p.estado,
                    creado: p.createdAt,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    /* ---------- Pedidos (todos, admin) ---------- */
    router.get('/pedidos', readLimiter, requireAdmin, async (request, response, next) => {
        try {
            const estado = request.query.estado;
            const filtro = estado && ESTADOS_VALIDOS.includes(estado) ? { estado } : {};

            const orders = await Order.find(filtro)
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            return response.status(200).json({
                pedidos: orders.map(p => ({
                    id: String(p._id),
                    userId: p.userId ? String(p.userId) : null,
                    nombre: p.contacto.nombre,
                    telefono: p.contacto.telefono,
                    email: p.contacto.email || '',
                    zona: p.zona,
                    total: p.total,
                    moneda: p.moneda,
                    estado: p.estado,
                    envioPendiente: p.envioPendiente,
                    creado: p.createdAt,
                    items: p.items,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/pedidos/:id/estado', writeLimiter, requireAdmin, async (request, response, next) => {
        if (!mongoose.isValidObjectId(request.params.id)) {
            return response.status(400).json({ error: 'ID de pedido inválido.', campo: 'id' });
        }

        const { estado } = request.body || {};
        if (typeof estado !== 'string' || !ESTADOS_VALIDOS.includes(estado)) {
            return fieldError(response, 'estado', `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}.`);
        }

        try {
            const order = await Order.findByIdAndUpdate(
                request.params.id,
                { $set: { estado } },
                { returnDocument: 'after', runValidators: true }
            );
            if (!order) return response.status(404).json({ error: 'Pedido no encontrado.' });

            return response.status(200).json({
                id: String(order._id),
                estado: order.estado,
            });
        } catch (error) {
            return next(error);
        }
    });

    /* ---------- Usuarios ---------- */
    router.get('/usuarios', readLimiter, requireAdmin, async (request, response, next) => {
        try {
            const usuarios = await User.find({}, 'nombre email role createdAt')
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            return response.status(200).json({
                usuarios: usuarios.map(u => ({
                    id: String(u._id),
                    nombre: u.nombre,
                    email: u.email,
                    role: u.role,
                    creado: u.createdAt,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/usuarios/:id/rol', writeLimiter, requireAdmin, async (request, response, next) => {
        if (!mongoose.isValidObjectId(request.params.id)) {
            return response.status(400).json({ error: 'ID de usuario inválido.', campo: 'id' });
        }

        const { role } = request.body || {};
        if (!['user', 'admin'].includes(role)) {
            return fieldError(response, 'role', 'Rol inválido. Use "user" o "admin".');
        }

        try {
            const user = await User.findByIdAndUpdate(
                request.params.id,
                { $set: { role } },
                { returnDocument: 'after', runValidators: true }
            );
            if (!user) return response.status(404).json({ error: 'Usuario no encontrado.' });

            return response.status(200).json({
                id: String(user._id),
                role: user.role,
            });
        } catch (error) {
            return next(error);
        }
    });

    /* ---------- Testimonios pendientes ---------- */
    router.get('/testimonios/pendientes', readLimiter, requireAdmin, async (request, response, next) => {
        try {
            const testimonios = await Testimonio.find({ verificado: false, autorizado: false })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            return response.status(200).json({
                testimonios: testimonios.map(t => ({
                    id: String(t._id),
                    autor: t.autor,
                    lugar: t.lugar,
                    texto: t.texto,
                    estrellas: t.estrellas,
                    creado: t.createdAt,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    /* ---------- Stock bajo ---------- */
    router.get('/stock/bajo', readLimiter, requireAdmin, async (request, response, next) => {
        try {
            const umbral = Number(request.query.umbral) || 5;
            const items = await Stock.find({ unidades: { $lte: umbral } })
                .sort({ unidades: 1 })
                .limit(100)
                .lean();

            return response.status(200).json({
                stockBajo: items.map(s => ({
                    productoId: s.productoId,
                    nombre: s.nombre,
                    unidades: s.unidades,
                    precioBase: s.precioBase,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createAdminRouter };
