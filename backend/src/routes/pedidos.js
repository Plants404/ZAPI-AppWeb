'use strict';

const express = require('express');
const Orden = require('../models/Orden');
const {
    createAuthenticate,
    requireCliente,
} = require('../middleware/autenticacion');
const { cancelarOrden, crearOrden, ordenPublica } = require('../utils/ordenes');
const {
    EMAIL_PATTERN,
    esIdMongo,
    normalizarEmail,
    texto,
    validarTelefono,
} = require('../utils/validacion');

function createPedidosRouter(config) {
    const router = express.Router();
    const authenticate = createAuthenticate(config);

    router.use(authenticate);

    router.post('/', requireCliente, async (request, response, next) => {
        try {
            const body = request.body || {};
            const nombre = texto(body.nombre) || request.user.nombre;
            const telefono = texto(body.telefono) || request.user.telefono || '';
            const email = normalizarEmail(body.email) || request.user.email;
            const zona = texto(body.zona) || null;
            const notas = texto(body.notas) || null;

            if (nombre.length < 2 || nombre.length > 120) {
                return response.status(400).json({
                    error: 'El nombre debe tener entre 2 y 120 caracteres.',
                    campo: 'nombre',
                });
            }

            if (!validarTelefono(telefono)) {
                return response.status(400).json({
                    error: 'Ingresá un teléfono válido con al menos 6 dígitos.',
                    campo: 'telefono',
                });
            }

            if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
                return response.status(400).json({ error: 'Ingresá un correo válido.', campo: 'email' });
            }

            if (zona && zona.length > 200) {
                return response.status(400).json({ error: 'La zona no puede superar 200 caracteres.', campo: 'zona' });
            }

            if (notas && notas.length > 2000) {
                return response.status(400).json({ error: 'Las notas no pueden superar 2000 caracteres.', campo: 'notas' });
            }

            if (!Array.isArray(body.items) || body.items.length > config.maxItemsPorPedido) {
                return response.status(400).json({
                    error: `El pedido debe incluir entre 1 y ${config.maxItemsPorPedido} productos.`,
                    campo: 'items',
                });
            }

            const orden = await crearOrden({
                canal: 'online',
                items: body.items,
                contacto: {
                    nombre,
                    telefono,
                    ...(email ? { email } : {}),
                },
                cliente: request.user,
                metodoPago: 'online',
                zona,
                notas,
                envioGratis: config.envioGratis,
                usuario: request.user,
            });

            return response.status(201).json({ pedido: ordenPublica(orden) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/', async (request, response, next) => {
        try {
            const ordenes = await Orden.find({ cliente: request.user._id })
                .sort({ createdAt: -1 })
                .limit(80)
                .lean();

            return response.status(200).json({ pedidos: ordenes.map(ordenPublica) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/:id', async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const orden = await Orden.findOne({
                _id: request.params.id,
                cliente: request.user._id,
            }).lean();

            if (!orden) return response.status(404).json({ error: 'Pedido no encontrado.' });

            return response.status(200).json({ pedido: ordenPublica(orden) });
        } catch (error) {
            return next(error);
        }
    });

    router.patch('/:id/cancelar', requireCliente, async (request, response, next) => {
        try {
            if (!esIdMongo(request.params.id)) {
                return response.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const motivo = texto(request.body && request.body.motivo) || 'Cancelado por el cliente';
            const orden = await cancelarOrden(request.params.id, {
                motivo: motivo.slice(0, 300),
                usuario: request.user,
                soloPendiente: true,
                cliente: request.user,
            });

            return response.status(200).json({ pedido: ordenPublica(orden) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createPedidosRouter };
