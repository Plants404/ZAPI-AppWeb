'use strict';

const { randomUUID } = require('node:crypto');
const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { validarContacto, validarTestimonio } = require('../lib/validation.js');

function crearRouter(getDatabase) {
    const router = express.Router();

    router.post('/contact', async (req, res) => {
        const contacto = validarContacto(req.body);
        const consulta = {
            ...contacto,
            id: randomUUID(),
            estado: 'new',
            createdAt: new Date()
        };

        await getDatabase().collection('contacts').insertOne(consulta);
        res.status(201).json({ message: 'Consulta recibida.', id: consulta.id });
    });

    router.get('/testimonials', async (req, res) => {
        const testimonios = await getDatabase().collection('testimonials')
            .find(
                { estado: 'approved' },
                { projection: { _id: 0, autor: 1, lugar: 1, texto: 1, estrellas: 1, productoId: 1 } }
            )
            .sort({ createdAt: -1 })
            .toArray();

        res.json({ testimonials: testimonios });
    });

    router.post('/testimonials', async (req, res) => {
        const testimonio = validarTestimonio(req.body);
        if (testimonio.productoId !== null) {
            const producto = await getDatabase().collection('products').findOne(
                { id: testimonio.productoId, active: true },
                { projection: { _id: 1 } }
            );
            if (!producto) throw new HttpError(400, 'El producto indicado no existe.');
        }

        const documento = {
            ...testimonio,
            estado: 'pending',
            createdAt: new Date()
        };
        const resultado = await getDatabase().collection('testimonials').insertOne(documento);

        res.status(201).json({
            message: 'Opinión recibida para revisión.',
            id: resultado.insertedId
        });
    });

    return router;
}

module.exports = { crearRouter };
