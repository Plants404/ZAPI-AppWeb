'use strict';

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('./db.js');
const { HttpError } = require('./lib/http-error.js');
const { verificarLimite } = require('./lib/limiter.js');
const { depurarPedidos } = require('./depurar.js');
const { crearRouter: crearRouterProductos } = require('./routes/products.js');
const {
    crearRouterAdmin: crearRouterAdminProductos,
    crearRouterImagenesAdmin,
    crearRouterImagenes
} = require('./routes/products.js');
const { crearRouter: crearRouterPedidos } = require('./routes/orders.js');
const { crearRouter: crearRouterEnvios } = require('./routes/submissions.js');
const { crearRouter: crearRouterAuth } = require('./routes/auth.js');
const { crearRouter: crearRouterAdmin } = require('./routes/admin.js');
const { crearRouter: crearRouterGestion } = require('./routes/gestion.js');
const { crearRouterAdmin: crearRouterAdminOperaciones } = require('./routes/orders.js');
const {
    crearRouter: crearRouterPublicacion,
    crearRouterPublicado
} = require('./routes/publicacion.js');
const { crearRouter: crearRouterEventos } = require('./routes/eventos.js');

const ORIGENES_LOCALES = ['http://localhost:5500', 'http://127.0.0.1:5500'];

const RUTAS_ESCRITURA = ['/api/contact', '/api/testimonials', '/api/orders', '/api/auth/login', '/api/auth/registro'];

function esProduccion() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL !== undefined;
}

function validarOrigenes() {
    const configurados = process.env.FRONTEND_ORIGINS;
    const esProduccionActual = esProduccion();
    const origenesConfigurados = (configurados || '')
        .split(',')
        .map(origen => origen.trim())
        .filter(Boolean);

    if (esProduccionActual && (configurados === undefined || origenesConfigurados.length === 0)) {
        throw new Error('FRONTEND_ORIGINS es obligatorio en producción.');
    }

    const origenes = origenesConfigurados.length
        ? origenesConfigurados
        : ORIGENES_LOCALES;

    if (esProduccionActual) {
        for (const origen of origenes) {
            if (origen.includes('NOMBRE-DEL-PROYECTO') || origen.includes('PEGAR_') || origen.includes('REEMPLAZAR')) {
                throw new Error('FRONTEND_ORIGINS contiene un marcador sin resolver: ' + origen);
            }
        }
    }

    return origenes;
}

async function crearApp(opciones = {}) {
    const app = express();
    const obtenerBase = opciones.getDatabase || getDatabase;

    const origenes = validarOrigenes();
    const db = await obtenerBase();

    const trustProxySaltos = parseInt(process.env.TRUST_PROXY, 10);
    if (!Number.isNaN(trustProxySaltos) && trustProxySaltos > 0) {
        app.set('trust proxy', trustProxySaltos);
    }

    app.disable('x-powered-by');
    app.use((req, res, next) => {
        const esRutaPrivada = /^\/api\/(auth|admin)(\/|$)/.test(req.path);
        const esEscritura = req.method === 'POST'
            && RUTAS_ESCRITURA.some(ruta => req.path.startsWith(ruta));
        if (esRutaPrivada || esEscritura) {
            res.set('Cache-Control', 'no-store');
        }
        next();
    });

    app.use((req, res, next) => {
        const origen = req.get('Origin');
        if (origen && !origenes.includes(origen)) {
            next(new HttpError(403, 'Este origen no está permitido.'));
            return;
        }

        if (origen) {
            res.set('Access-Control-Allow-Origin', origen);
            res.set('Vary', 'Origin');
            if (/^\/api\/(auth|admin)(\/|$)/.test(req.path)) {
                res.set('Access-Control-Allow-Credentials', 'true');
            }
        }
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Referrer-Policy', 'no-referrer');
        res.set('X-Frame-Options', 'DENY');
        res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self';");

        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.status(204).end();
            return;
        }

        next();
    });
    app.use(express.json({ limit: '96kb', strict: true }));

    app.use((req, res, next) => {
        const esEscritura = req.method === 'POST' && RUTAS_ESCRITURA.some(ruta => req.originalUrl.startsWith(ruta));
        if (esEscritura) {
            let politica = 'contacto';
            if (req.originalUrl.startsWith('/api/testimonials')) politica = 'testimonios';
            if (req.originalUrl.startsWith('/api/orders')) politica = 'pedidos';
            if (req.originalUrl.startsWith('/api/auth/login')) politica = 'login';
            if (req.originalUrl.startsWith('/api/auth/registro')) politica = 'registro';
            return verificarLimite(db, politica, req.ip).then(({ permitido, retryAfter }) => {
                if (!permitido) {
                    res.set('Retry-After', String(retryAfter));
                    return next(new HttpError(429, 'Demasiadas solicitudes. Intentá de nuevo más tarde.'));
                }
                next();
            });
        }
        next();
    });

    app.get('/api/health', async (req, res) => {
        await obtenerBase().command({ ping: 1 });
        res.json({ ok: true, database: 'connected' });
    });

    /* Rutas de mantenimiento: exigen `Authorization: Bearer <CRON_SECRET>`. */
    function exigirSecretoCron(req, res, next) {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return next(new HttpError(503, 'Mantenimiento no configurado.'));
        }
        const auth = req.get('Authorization') || '';
        const prefijo = 'Bearer ';
        if (!auth.startsWith(prefijo)) {
            return next(new HttpError(401, 'No autorizado.'));
        }
        const a = Buffer.from(auth.slice(prefijo.length));
        const b = Buffer.from(cronSecret);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return next(new HttpError(401, 'No autorizado.'));
        }
        next();
    }

    /* Ayuda a calibrar TRUST_PROXY detrás de Vercel + Render: `ip` debe ser
       la IP pública de quien llama, no la de un proxy. */
    app.get('/api/diagnostico-ip', exigirSecretoCron, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json({
            ip: req.ip,
            trustProxy: app.get('trust proxy'),
            xForwardedFor: req.get('X-Forwarded-For') || null
        });
    });

    app.get('/api/depurar', exigirSecretoCron, async (req, res, next) => {
        try {
            const depurados = await depurarPedidos(db);
            res.json({ ok: true, depurados });
        } catch (error) {
            next(error);
        }
    });

    app.use('/api/auth', crearRouterAuth(obtenerBase));
    app.use('/api/admin', crearRouterAdmin(obtenerBase));
    app.use('/api/admin', crearRouterAdminOperaciones(obtenerBase));
    app.use('/api/admin', crearRouterGestion(obtenerBase));
    app.use('/api/admin/productos', crearRouterAdminProductos(obtenerBase));
    app.use('/api/admin/imagenes', crearRouterImagenesAdmin(obtenerBase));
    app.use('/api/imagenes', crearRouterImagenes(obtenerBase));
    app.use('/api/admin/publicacion', crearRouterPublicacion(obtenerBase));
    app.use('/api', crearRouterPublicado(obtenerBase));
    app.use('/api/products', crearRouterProductos(obtenerBase));
    app.use('/api/orders', crearRouterPedidos(obtenerBase));
    app.use('/api', crearRouterEnvios(obtenerBase));
    app.use('/api', crearRouterEventos(obtenerBase));
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

module.exports = { crearApp, validarOrigenes };
