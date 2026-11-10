'use strict';

const express = require('express');
const { getDatabase } = require('./db.js');
const { HttpError } = require('./lib/http-error.js');
const { crearRouter: crearRouterProductos } = require('./routes/products.js');
const { crearRouter: crearRouterPedidos } = require('./routes/orders.js');
const { crearRouter: crearRouterEnvios } = require('./routes/submissions.js');

const ORIGENES_LOCALES = ['http://localhost:5500', 'http://127.0.0.1:5500'];

function crearApp(opciones = {}) {
    const app = express();
    const obtenerBase = opciones.getDatabase || getDatabase;
    const origenes = (process.env.FRONTEND_ORIGINS || ORIGENES_LOCALES.join(','))
        .split(',')
        .map(origen => origen.trim())
        .filter(Boolean);

    app.disable('x-powered-by');
    app.use((req, res, next) => {
        const origen = req.get('Origin');
        if (origen && !origenes.includes(origen)) {
            next(new HttpError(403, 'Este origen no está permitido.'));
            return;
        }

        if (origen) {
            res.set('Access-Control-Allow-Origin', origen);
            res.set('Vary', 'Origin');
        }
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Referrer-Policy', 'no-referrer');

        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.status(204).end();
            return;
        }

        next();
    });
    app.use(express.json({ limit: '32kb', strict: true }));

    app.get('/api/health', async (req, res) => {
        await obtenerBase().command({ ping: 1 });
        res.json({ ok: true, database: 'connected' });
    });
    app.use('/api/products', crearRouterProductos(obtenerBase));
    app.use('/api/orders', crearRouterPedidos(obtenerBase));
    app.use('/api', crearRouterEnvios(obtenerBase));
    app.use('/api', (req, res, next) => next(new HttpError(404, 'Ruta de API no encontrada.')));

    app.use((error, req, res, next) => {
        if (res.headersSent) {
            next(error);
            return;
        }

        let status = error.status || 500;
        let message = status >= 500 ? 'Error interno del servidor.' : error.message;
        if (error.type === 'entity.parse.failed') {
            status = 400;
            message = 'El JSON de la solicitud no es válido.';
        } else if (error.type === 'entity.too.large') {
            status = 413;
            message = 'La solicitud supera el tamaño permitido.';
        }

        if (status >= 500) console.error('Error de API:', error);
        res.status(status).json({ error: message });
    });

    return app;
}

module.exports = { crearApp };
