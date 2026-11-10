'use strict';

const express = require('express');
const { getDatabase } = require('./db.js');
const { HttpError } = require('./lib/http-error.js');
const { crearRouter: crearRouterProductos } = require('./routes/products.js');
const { crearRouter: crearRouterPedidos } = require('./routes/orders.js');
const { crearRouter: crearRouterEnvios } = require('./routes/submissions.js');

const ORIGENES_LOCALES = ['http://localhost:5500', 'http://127.0.0.1:5500'];

const LIMITE_POR_VENTANA = 20;
const VENTANA_MS = 60 * 1000;
const contenedorPorIp = new Map();

function ipDelCliente(req) {
    const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
    if (trustProxy && req.ip) return req.ip;
    return req.socket.remoteAddress || 'desconocida';
}

function limiter(req, res, next) {
    const ahora = Date.now();
    const ip = ipDelCliente(req);
    const registro = contenedorPorIp.get(ip) || { count: 0, reset: ahora + VENTANA_MS };

    if (ahora > registro.reset) {
        registro.count = 0;
        registro.reset = ahora + VENTANA_MS;
    }
    registro.count += 1;
    contenedorPorIp.set(ip, registro);

    if (registro.count > LIMITE_POR_VENTANA) {
        res.set('Retry-After', Math.ceil((registro.reset - ahora) / 1000));
        return next(new HttpError(429, 'Demasiadas solicitudes. Intentá de nuevo más tarde.'));
    }
    next();
}

const RUTAS_ESCRITURA = ['/api/contact', '/api/testimonials', '/api/orders'];

function crearApp(opciones = {}) {
    const app = express();
    const obtenerBase = opciones.getDatabase || getDatabase;

    app.set('trust proxy', process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true');
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
        res.set('X-Frame-Options', 'DENY');
        res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self';");

        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.status(204).end();
            return;
        }

        next();
    });
    app.use(express.json({ limit: '32kb', strict: true }));

    app.use((req, res, next) => {
        const esEscritura = req.method === 'POST' && RUTAS_ESCRITURA.some(ruta => req.originalUrl.startsWith(ruta));
        if (esEscritura) {
            res.set('Cache-Control', 'no-store');
            return limiter(req, res, next);
        }
        next();
    });

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

        if (status >= 500) console.error('Error de API:', error.message);
        res.status(status).json({ error: message });
    });

    return app;
}

module.exports = { crearApp };
