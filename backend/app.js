'use strict';

const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const productosData = require('../public/data/productos.json');
const { createAuthRouter } = require('./routes/auth');
const { createContactRouter } = require('./routes/contacto');
const { createOrdersRouter } = require('./routes/pedidos');
const { createStockRouter } = require('./routes/stock');
const { createTestimoniosRouter } = require('./routes/testimonios');

function createApp(config) {
    const app = express();
    const allowedOrigins = new Set(config.frontendOrigins);
    const productos = Array.isArray(productosData.productos) ? productosData.productos : [];

    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);

    app.use(helmet());
    app.use(cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept'],
        maxAge: 600,
    }));
    app.use(express.json({ limit: '16kb', strict: true }));
    app.use(cookieParser());

    app.use('/api', (request, response, next) => {
        const changesData = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
        const origin = request.get('Origin');

        if (changesData && origin && !allowedOrigins.has(origin)) {
            return response.status(403).json({ error: 'Origen no autorizado.' });
        }

        return next();
    });

    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.' },
    });
    const registerLimiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Se alcanzó el límite de registros. Intentá más tarde.' },
    });
    const readLimiter = rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Hiciste demasiadas consultas. Esperá un minuto y volvé a intentar.' },
    });
    const writeLimiter = rateLimit({
        windowMs: 10 * 60 * 1000,
        limit: 20,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Hiciste demasiados envíos. Esperá unos minutos y volvé a intentar.' },
    });

    app.get('/api/health', (request, response) => {
        response.status(200).json({ estado: 'ok' });
    });
    app.post('/api/auth/login', loginLimiter);
    app.post('/api/auth/registro', registerLimiter);
    app.use('/api/auth', createAuthRouter(config));
    app.use('/api/stock', createStockRouter({ config, readLimiter, writeLimiter, productos }));
    app.use('/api/pedidos', createOrdersRouter({ config, readLimiter, writeLimiter, productos }));
    app.use('/api/contacto', createContactRouter({ writeLimiter }));
    app.use('/api/testimonios', createTestimoniosRouter({ config, readLimiter, writeLimiter }));

    app.use((request, response) => {
        response.status(404).json({ error: 'Ruta no encontrada.' });
    });

    app.use((error, request, response, next) => {
        if (response.headersSent) return next(error);

        if (error.type === 'entity.too.large') {
            return response.status(413).json({ error: 'La solicitud es demasiado grande.' });
        }

        if (error.type === 'entity.parse.failed') {
            return response.status(400).json({ error: 'El cuerpo JSON no es válido.' });
        }

        if (error.code === 11000) {
            return response.status(409).json({ error: 'Ya existe un registro con esos datos.' });
        }

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return response.status(400).json({ error: 'Los datos enviados no son válidos.' });
        }

        console.error('Error inesperado en la API:', error.message);
        return response.status(500).json({ error: 'Ocurrió un error interno.' });
    });

    return app;
}

module.exports = { createApp };
