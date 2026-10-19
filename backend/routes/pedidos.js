'use strict';

const express = require('express');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const { createAuthenticate } = require('../middleware/authenticate');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FREE_SHIPPING_THRESHOLD = 2500;

function fieldError(response, campo, error) {
    return response.status(400).json({ error, campo });
}

function orderItemsFromBody(items, catalog) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
        return { error: { campo: 'items', mensaje: 'El pedido debe incluir entre 1 y 100 productos.' } };
    }

    const orderItems = [];
    const requested = new Map();
    const shortages = [];

    for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)
            || typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id < 1
            || typeof item.cantidad !== 'number' || !Number.isSafeInteger(item.cantidad)
            || item.cantidad < 1) {
            return { error: { campo: 'items', mensaje: 'Cada producto debe tener un ID y una cantidad entera válida.' } };
        }

        const product = catalog.get(item.id);
        if (!product) {
            shortages.push({ id: item.id, nombre: 'Producto desconocido', disponibles: null });
            continue;
        }

        requested.set(item.id, (requested.get(item.id) || 0) + item.cantidad);
        orderItems.push({
            productoId: product.id,
            nombre: product.nombre,
            cantidad: item.cantidad,
            precio: product.precioBase,
        });
    }

    return { orderItems, requested, shortages };
}

function createOrdersRouter({ config, readLimiter, writeLimiter, productos }) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);
    const catalog = new Map(productos.map(producto => [producto.id, producto]));

    async function rollbackStock(decrements) {
        for (const decrement of [...decrements].reverse()) {
            const result = await Stock.updateOne(
                { productoId: decrement.productoId },
                { $inc: { unidades: decrement.cantidad } }
            );
            if (result.matchedCount !== 1) {
                throw new Error(`No se pudo restaurar el stock del producto ${decrement.productoId}.`);
            }
            decrements.pop();
        }
    }

    async function shortagesFor(requested, forcedIds = []) {
        const rows = await Stock.find({ productoId: { $in: [...requested.keys()] } })
            .select('productoId unidades -_id')
            .lean();
        const availableById = new Map(rows.map(row => [row.productoId, row.unidades]));
        const shortages = [];

        for (const [id, cantidad] of requested) {
            const disponibles = availableById.has(id) ? availableById.get(id) : null;
            if (disponibles === null || disponibles < cantidad || forcedIds.includes(id)) {
                shortages.push({
                    id,
                    nombre: catalog.get(id)?.nombre || 'Producto desconocido',
                    disponibles,
                });
            }
        }

        return shortages;
    }

    router.post('/', writeLimiter, authenticate, async (request, response, next) => {
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
            ? request.body
            : {};
        const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
        const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : '';
        const email = body.email === null || body.email === undefined
            ? ''
            : typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
        const zona = body.zona === null || body.zona === undefined
            ? null
            : typeof body.zona === 'string' ? body.zona.trim() : undefined;
        const notas = body.notas === null || body.notas === undefined
            ? null
            : typeof body.notas === 'string' ? body.notas.trim() : undefined;

        if (nombre.length < 2 || nombre.length > 120) {
            return fieldError(response, 'nombre', 'El nombre debe tener entre 2 y 120 caracteres.');
        }

        if (!/^[+0-9\s().-]+$/.test(telefono)
            || telefono.replace(/\D/g, '').length < 6
            || telefono.length > 40) {
            return fieldError(response, 'telefono', 'Ingresá un teléfono válido con al menos 6 dígitos.');
        }

        if (email === null || (email && (email.length > 254 || !EMAIL_PATTERN.test(email)))) {
            return fieldError(response, 'email', 'Ingresá un correo válido.');
        }

        if (zona === undefined || (typeof zona === 'string' && zona.length > 200)) {
            return fieldError(response, 'zona', 'La zona no puede superar los 200 caracteres.');
        }

        if (notas === undefined || (typeof notas === 'string' && notas.length > 2000)) {
            return fieldError(response, 'notas', 'Las notas no pueden superar los 2000 caracteres.');
        }

        const parsed = orderItemsFromBody(body.items, catalog);
        if (parsed.error) return fieldError(response, parsed.error.campo, parsed.error.mensaje);
        if (parsed.shortages.length) {
            return response.status(409).json({ error: 'No hay stock suficiente para algunos productos.', shortages: parsed.shortages });
        }

        const { orderItems, requested } = parsed;
        const initialShortages = await shortagesFor(requested);
        if (initialShortages.length) {
            return response.status(409).json({ error: 'No hay stock suficiente para algunos productos.', shortages: initialShortages });
        }

        const total = orderItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        if (!Number.isFinite(total)) {
            return fieldError(response, 'items', 'El total del pedido no es válido.');
        }

        const envioPendiente = total < FREE_SHIPPING_THRESHOLD;
        const decrements = [];

        try {
            for (const [productoId, cantidad] of requested) {
                const result = await Stock.updateOne(
                    { productoId, unidades: { $gte: cantidad } },
                    { $inc: { unidades: -cantidad } }
                );

                if (result.modifiedCount !== 1) {
                    await rollbackStock(decrements);
                    const shortages = await shortagesFor(requested, [productoId]);
                    return response.status(409).json({
                        error: 'No hay stock suficiente para algunos productos.',
                        shortages,
                    });
                }

                decrements.push({ productoId, cantidad });
            }

            const [order] = await Order.create([{
                userId: request.user._id,
                contacto: { nombre, telefono, ...(email ? { email } : {}) },
                zona,
                notas,
                items: orderItems,
                total,
                moneda: 'UYU',
                estado: 'pendiente',
                envioPendiente,
            }]);

            return response.status(201).json({
                id: String(order._id),
                total: order.total,
                estado: order.estado,
            });
        } catch (error) {
            try {
                await rollbackStock(decrements);
            } catch (rollbackError) {
                console.error('No se pudo completar el rollback de stock:', rollbackError.message);
                return next(rollbackError);
            }
            return next(error);
        }
    });

    router.get('/', readLimiter, authenticate, async (request, response, next) => {
        try {
            const orders = await Order.find({ userId: request.user._id })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();
            const pedidos = orders.map(order => ({
                id: String(order._id),
                creado: order.createdAt.toISOString(),
                estado: order.estado,
                total: order.total,
                envio_pendiente: order.envioPendiente,
                items: order.items.map(item => ({
                    producto_id: item.productoId,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                })),
            }));
            return response.status(200).json({ pedidos });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createOrdersRouter };
