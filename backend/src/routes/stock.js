'use strict';

const express = require('express');
const Stock = require('../models/Stock');
const { createAuthenticate } = require('../middleware/authenticate');

const { fieldError } = require('../utils/fieldError');

function createStockRouter({ config, readLimiter, writeLimiter, productos }) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);
    const productIds = new Set(productos.map(producto => producto.id));

    router.get('/', readLimiter, async (request, response, next) => {
        try {
            const rows = await Stock.find({}).select('productoId unidades -_id').lean();
            const stock = Object.fromEntries(rows.map(row => [String(row.productoId), row.unidades]));
            return response.status(200).json({ stock });
        } catch (error) {
            return next(error);
        }
    });

    router.put('/:id', writeLimiter, authenticate, async (request, response, next) => {
        if (request.user.role !== 'admin') {
            return response.status(403).json({ error: 'No tenés permiso para modificar el stock.' });
        }

        const productoId = /^\d+$/.test(request.params.id) ? Number(request.params.id) : NaN;
        if (!Number.isSafeInteger(productoId) || !productIds.has(productoId)) {
            return response.status(404).json({ error: 'No encontramos ese producto.' });
        }

        const body = request.body || {};
        if (typeof body.unidades !== 'number'
            || !Number.isSafeInteger(body.unidades)
            || body.unidades < 0) {
            return fieldError(response, 'unidades', 'Las unidades deben ser un entero mayor o igual a cero.');
        }

        try {
            const stock = await Stock.findOneAndUpdate(
                { productoId },
                { $set: { unidades: body.unidades } },
                { returnDocument: 'after', runValidators: true }
            ).select('productoId unidades -_id');

            if (!stock) return response.status(404).json({ error: 'No encontramos el stock de ese producto.' });
            return response.status(200).json({ stock: { [String(productoId)]: stock.unidades } });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createStockRouter };
