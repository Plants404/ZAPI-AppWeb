'use strict';

const { randomUUID } = require('node:crypto');
const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { validarPedido } = require('../lib/validation.js');

const ENVIO_GRATIS_DESDE = 2500;

function crearRouter(getDatabase) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { cliente, cantidades } = validarPedido(req.body);
        const db = getDatabase();
        const productos = await db.collection('products')
            .find({ id: { $in: [...cantidades.keys()] }, active: true })
            .toArray();
        const porId = new Map(productos.map(producto => [producto.id, producto]));

        const lineas = [...cantidades].map(([id, cantidad]) => {
            const producto = porId.get(id);
            if (!producto) throw new HttpError(409, 'Un producto del pedido ya no está disponible.');
            if (cantidad > producto.stock) {
                throw new HttpError(409, `No hay stock suficiente de ${producto.nombre}.`);
            }

            return {
                id: producto.id,
                slug: producto.slug,
                nombre: producto.nombre,
                precio: producto.precioBase,
                cantidad
            };
        });

        const subtotal = lineas.reduce((total, linea) => total + linea.precio * linea.cantidad, 0);
        const envio = subtotal >= ENVIO_GRATIS_DESDE ? 0 : null;
        const pedido = {
            id: `ZAPI-${randomUUID()}`,
            fecha: new Date(),
            estado: 'pendiente',
            cliente,
            lineas,
            subtotal,
            envio,
            total: subtotal + (envio || 0)
        };
        await db.collection('orders').insertOne(pedido);

        res.status(201).json({ order: pedido });
    });

    return router;
}

module.exports = { crearRouter };
