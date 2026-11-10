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

        const lineas = [];
        const descontados = []; // { id, cantidad } para rollback si algo falla

        for (const [id, cantidad] of cantidades) {
            const producto = porId.get(id);
            if (!producto) {
                await restaurarStock(db, descontados);
                throw new HttpError(409, 'Un producto del pedido ya no está disponible.');
            }

            const resultado = await db.collection('products').findOneAndUpdate(
                { id, active: true, stock: { $gte: cantidad } },
                { $inc: { stock: -cantidad } },
                { returnDocument: 'after' }
            );

            if (!resultado || !resultado.value) {
                await restaurarStock(db, descontados);
                throw new HttpError(409, `No hay stock suficiente de ${producto.nombre}.`);
            }

            descontados.push({ id, cantidad });
            lineas.push({
                id: producto.id,
                slug: producto.slug,
                nombre: producto.nombre,
                precio: producto.precioBase,
                cantidad
            });
        }

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

        try {
            await db.collection('orders').insertOne(pedido);
        } catch (error) {
            await restaurarStock(db, descontados);
            throw error;
        }

        res.status(201).json({ order: pedido });
    });

    return router;
}

async function restaurarStock(db, descontados) {
    for (const { id, cantidad } of descontados) {
        await db.collection('products').findOneAndUpdate(
            { id, active: true },
            { $inc: { stock: cantidad } }
        );
    }
}

module.exports = { crearRouter };