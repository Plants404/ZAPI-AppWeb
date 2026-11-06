'use strict';

const express = require('express');
const Contacto = require('../models/Contacto');
const {
    EMAIL_PATTERN,
    normalizarEmail,
    texto,
    validarTelefono,
} = require('../utils/validacion');

function createContactoRouter() {
    const router = express.Router();

    router.post('/', async (request, response, next) => {
        try {
            const body = request.body || {};
            const nombre = texto(body.nombre);
            const email = normalizarEmail(body.email);
            const asunto = texto(body.asunto);
            const telefono = texto(body.telefono);
            const mensaje = texto(body.mensaje);

            if (body.sitio_web) {
                return response.status(201).json({ ok: true });
            }

            if (nombre.length < 2 || nombre.length > 100) {
                return response.status(400).json({
                    error: 'El nombre debe tener entre 2 y 100 caracteres.',
                    campo: 'nombre',
                });
            }

            if (!EMAIL_PATTERN.test(email) || email.length > 254) {
                return response.status(400).json({ error: 'Ingresá un correo válido.', campo: 'email' });
            }

            if (asunto.length < 3 || asunto.length > 150) {
                return response.status(400).json({
                    error: 'El asunto debe tener entre 3 y 150 caracteres.',
                    campo: 'asunto',
                });
            }

            if (telefono && !validarTelefono(telefono)) {
                return response.status(400).json({ error: 'Ingresá un teléfono válido.', campo: 'telefono' });
            }

            if (mensaje.length < 10 || mensaje.length > 2000) {
                return response.status(400).json({
                    error: 'El mensaje debe tener entre 10 y 2000 caracteres.',
                    campo: 'mensaje',
                });
            }

            const contacto = await Contacto.create({
                nombre,
                email,
                asunto,
                telefono: telefono || undefined,
                mensaje,
            });

            return response.status(201).json({
                ok: true,
                id: String(contacto._id),
                mensaje: 'Recibimos tu consulta y te responderemos a la brevedad.',
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createContactoRouter };
