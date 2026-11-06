'use strict';

const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const { createOriginValidator } = require('./config');
const { createAdminRouter } = require('./routes/admin');
const { createAuthRouter } = require('./routes/auth');
const { createCatalogoRouter } = require('./routes/catalogo');
const { createConfigRouter } = require('./routes/config');
const { createContactoRouter } = require('./routes/contacto');
const { createContenidoPublicoRouter } = require('./routes/contenido');
const { createPedidosRouter } = require('./routes/pedidos');
const { createTestimoniosRouter } = require('./routes/testimonios');
const { ErrorHttp } = require('./utils/ErrorHttp');

function crearLimite(config, opciones) {
    return rateLimit({
        windowMs: opciones.windowMs,
        limit: opciones.limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: () => config.nodeEnv === 'test',
        message: { error: opciones.mensaje },
    });
}

function createApp(config) {
    const app = express();
    const isAllowedOrigin = createOriginValidator(config);

    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);

    app.use(helmet());
    app.use(cors({
        origin(origin, callback) {
            if (isAllowedOrigin(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept'],
        maxAge: 600,
    }));
    app.use(express.json({ limit: '64kb', strict: true }));
    app.use(cookieParser());

    app.use('/api', (request, response, next) => {
        const cambiaDatos = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

        if (cambiaDatos && !isAllowedOrigin(request.get('Origin'))) {
            return response.status(403).json({ error: 'Origen no autorizado.' });
        }

        return next();
    });

    const loginLimiter = crearLimite(config, {
        windowMs: 15 * 60 * 1000,
        limit: 10,
        mensaje: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.',
    });
    const registroLimiter = crearLimite(config, {
        windowMs: 60 * 60 * 1000,
        limit: 8,
        mensaje: 'Se alcanzó el límite de registros. Intentá más tarde.',
    });
    const lecturaLimiter = crearLimite(config, {
        windowMs: 60 * 1000,
        limit: 300,
        mensaje: 'Hiciste demasiadas consultas. Esperá un minuto y volvé a intentar.',
    });
    const escrituraLimiter = crearLimite(config, {
        windowMs: 10 * 60 * 1000,
        limit: 80,
        mensaje: 'Hiciste demasiados envíos. Esperá unos minutos y volvé a intentar.',
    });
    const adminLimiter = crearLimite(config, {
        windowMs: 60 * 1000,
        limit: 240,
        mensaje: 'Demasiadas operaciones seguidas. Esperá un momento.',
    });

    app.get('/api/health', (request, response) => {
        response.status(200).json({ estado: 'ok' });
    });

    app.use('/api/config', lecturaLimiter, createConfigRouter(config));
    app.use('/api/contenido', lecturaLimiter, createContenidoPublicoRouter());
    app.use('/api/catalogo', lecturaLimiter, createCatalogoRouter());
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth/registro', registroLimiter);
    app.use('/api/auth', createAuthRouter(config));
    app.use('/api/pedidos', escrituraLimiter, createPedidosRouter(config));
    app.use('/api/testimonios', escrituraLimiter, createTestimoniosRouter(config));
    app.use('/api/contacto', escrituraLimiter, createContactoRouter());
    app.use('/api/admin', adminLimiter, createAdminRouter(config));

    app.use((request, response) => {
        response.status(404).json({ error: 'Ruta no encontrada.' });
    });

    app.use((error, request, response, next) => {
        if (response.headersSent) return next(error);

        if (error instanceof ErrorHttp) {
            return response.status(error.estado).json({
                error: error.message,
                ...(error.campo ? { campo: error.campo } : {}),
                ...(error.detalle ? error.detalle : {}),
            });
        }

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
