'use strict';

const express = require('express');
const Testimonio = require('../models/Testimonio');
const { createAuthenticate } = require('../middleware/autenticacion');
const { texto } = require('../utils/validacion');

function testimonioPublico(testimonio) {
    return {
        id: String(testimonio._id),
        autor: testimonio.autor,
        lugar: testimonio.lugar,
        texto: testimonio.texto,
        estrellas: testimonio.estrellas,
        fecha: testimonio.createdAt,
        productoId: testimonio.productoId,
    };
}

function createTestimoniosRouter(config) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);

    router.get('/', async (request, response, next) => {
        try {
            const testimonios = await Testimonio.find({ estado: 'aprobado' })
                .sort({ createdAt: -1 })
                .limit(60)
                .lean();

            return response.status(200).json({ testimonios: testimonios.map(testimonioPublico) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/mios', authenticate, async (request, response, next) => {
        try {
            const testimonios = await Testimonio.find({ usuario: request.user._id })
                .sort({ createdAt: -1 })
                .limit(30)
                .lean();

            return response.status(200).json({
                testimonios: testimonios.map(testimonio => ({
                    ...testimonioPublico(testimonio),
                    estado: testimonio.estado,
                    motivoRechazo: testimonio.motivoRechazo,
                })),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.post('/', authenticate, async (request, response, next) => {
        try {
            const body = request.body || {};
            const autor = texto(body.autor) || request.user.nombre;
            const lugar = texto(body.lugar);
            const contenido = texto(body.texto);
            const estrellas = Number(body.estrellas);
            const productoId = body.productoId === undefined || body.productoId === null || body.productoId === ''
                ? null
                : Number(body.productoId);

            if (autor.length < 2 || autor.length > 120) {
                return response.status(400).json({
                    error: 'El nombre debe tener entre 2 y 120 caracteres.',
                    campo: 'autor',
                });
            }

            if (lugar.length > 120) {
                return response.status(400).json({ error: 'El lugar no puede superar 120 caracteres.', campo: 'lugar' });
            }

            if (contenido.length < 10 || contenido.length > 600) {
                return response.status(400).json({
                    error: 'La opinión debe tener entre 10 y 600 caracteres.',
                    campo: 'texto',
                });
            }

            if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
                return response.status(400).json({
                    error: 'El puntaje debe ser un entero entre 1 y 5.',
                    campo: 'estrellas',
                });
            }

            if (productoId !== null && (!Number.isSafeInteger(productoId) || productoId < 1)) {
                return response.status(400).json({ error: 'El producto indicado no es válido.', campo: 'productoId' });
            }

            const pendientes = await Testimonio.countDocuments({
                usuario: request.user._id,
                estado: 'pendiente',
            });

            if (pendientes >= 5) {
                return response.status(429).json({
                    error: 'Tenés varias opiniones pendientes de revisión. Esperá a que las moderemos.',
                });
            }

            const testimonio = await Testimonio.create({
                autor,
                lugar,
                texto: contenido,
                estrellas,
                productoId,
                usuario: request.user._id,
                estado: 'pendiente',
            });

            return response.status(201).json({
                testimonio: {
                    ...testimonioPublico(testimonio),
                    estado: testimonio.estado,
                },
                mensaje: '¡Gracias! Tu opinión queda pendiente de revisión.',
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createTestimoniosRouter, testimonioPublico };
