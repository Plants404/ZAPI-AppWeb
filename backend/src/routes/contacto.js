'use strict';

const express = require('express');
const ContactForm = require('../models/ContactForm');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const { fieldError } = require('../utils/fieldError');

function createContactRouter({ writeLimiter }) {
    const router = express.Router();

    router.post('/', writeLimiter, async (request, response, next) => {
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
            ? request.body
            : {};

        if (typeof body.sitio_web === 'string' && body.sitio_web.trim()) {
            return response.status(201).json({ ok: true });
        }

        if (body.sitio_web !== undefined && typeof body.sitio_web !== 'string') {
            return response.status(400).json({ error: 'El formulario no es válido.' });
        }

        const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
        const email = typeof body.correo === 'string' ? body.correo.trim().toLowerCase() : '';
        const asunto = typeof body.asunto === 'string' ? body.asunto.trim() : '';
        const telefono = body.telefono === undefined || body.telefono === null
            ? ''
            : typeof body.telefono === 'string' ? body.telefono.trim() : null;
        const mensaje = typeof body.consulta === 'string' ? body.consulta.trim() : '';

        if (nombre.length < 2 || nombre.length > 100) {
            return fieldError(response, 'nombre', 'El nombre debe tener entre 2 y 100 caracteres.');
        }
        if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
            return fieldError(response, 'correo', 'Ingresá un correo electrónico válido.');
        }
        if (asunto.length < 3 || asunto.length > 150) {
            return fieldError(response, 'asunto', 'El asunto debe tener entre 3 y 150 caracteres.');
        }
        if (telefono === null
            || (telefono && (!/^[+0-9\s().-]+$/.test(telefono)
                || telefono.length > 40
                || telefono.replace(/\D/g, '').length < 6))) {
            return fieldError(response, 'telefono', 'Ingresá un teléfono válido con al menos 6 dígitos.');
        }
        if (mensaje.length < 10 || mensaje.length > 2000) {
            return fieldError(response, 'consulta', 'La consulta debe tener entre 10 y 2000 caracteres.');
        }

        try {
            await ContactForm.create({
                userId: null,
                nombre,
                email,
                asunto,
                ...(telefono ? { telefono } : {}),
                mensaje,
            });
            return response.status(201).json({ ok: true });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createContactRouter };
