'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Testimonio = require('../models/Testimonio');
const { createAuthenticate, createAuthenticateOpcional } = require('../middleware/authenticate');

const { fieldError } = require('../utils/fieldError');

function createTestimoniosRouter({ config, readLimiter, writeLimiter }) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);
    const authenticateForReview = createAuthenticate(config, 'Iniciá sesión para dejar tu opinión.');
    const authenticateOpcional = createAuthenticateOpcional(config);
    const authMiddleware = config.requiereCuenta ? authenticateForReview : authenticateOpcional;

    router.get('/', readLimiter, async (request, response, next) => {
        try {
            const rows = await Testimonio.find({ verificado: true, autorizado: true })
                .sort({ createdAt: -1 })
                .lean();
            const testimonios = rows.map(row => ({
                autor: row.autor,
                lugar: row.lugar,
                texto: row.texto,
                estrellas: row.estrellas,
                verificado: row.verificado,
                autorizado: row.autorizado,
                fecha: row.createdAt.toISOString(),
            }));
            return response.status(200).json({ testimonios });
        } catch (error) {
            return next(error);
        }
    });

    router.post('/', writeLimiter, authMiddleware, async (request, response, next) => {
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
            ? request.body
            : {};
        const autor = typeof body.autor === 'string' ? body.autor.trim() : '';
        const lugar = typeof body.lugar === 'string' ? body.lugar.trim() : '';
        const texto = typeof body.texto === 'string' ? body.texto.trim() : '';

        if (autor.length < 2 || autor.length > 120) {
            return fieldError(response, 'autor', 'El nombre debe tener entre 2 y 120 caracteres.');
        }
        if (body.lugar !== undefined && typeof body.lugar !== 'string') {
            return fieldError(response, 'lugar', 'El lugar debe ser texto.');
        }
        if (lugar.length > 120) {
            return fieldError(response, 'lugar', 'El lugar no puede superar los 120 caracteres.');
        }
        if (texto.length < 10 || texto.length > 600) {
            return fieldError(response, 'texto', 'La opinión debe tener entre 10 y 600 caracteres.');
        }
        if (typeof body.estrellas !== 'number'
            || !Number.isInteger(body.estrellas)
            || body.estrellas < 1
            || body.estrellas > 5) {
            return fieldError(response, 'estrellas', 'La calificación debe ser un entero entre 1 y 5.');
        }

        try {
            await Testimonio.create({
                autor,
                lugar,
                texto,
                estrellas: body.estrellas,
                userId: request.user ? request.user._id : null,
                verificado: false,
                autorizado: false,
            });
            return response.status(201).json({ ok: true });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id/aprobar', writeLimiter, authenticate, async (request, response, next) => {
        if (request.user.role !== 'admin') {
            return response.status(403).json({ error: 'No tenés permiso para aprobar opiniones.' });
        }
        if (!mongoose.isValidObjectId(request.params.id)) {
            return response.status(400).json({ error: 'El ID de la opinión no es válido.', campo: 'id' });
        }

        try {
            const testimonio = await Testimonio.findByIdAndUpdate(
                request.params.id,
                { $set: { verificado: true, autorizado: true } },
                { returnDocument: 'after', runValidators: true }
            );
            if (!testimonio) return response.status(404).json({ error: 'No encontramos esa opinión.' });
            return response.status(200).json({ ok: true });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createTestimoniosRouter };
