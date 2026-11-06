'use strict';

const express = require('express');
const { createAuthenticate, requireAdmin } = require('../../middleware/autenticacion');
const { createAuditoriaRouter } = require('./auditoria');
const { createClientesRouter } = require('./clientes');
const { createContenidoRouter } = require('./contenido');
const { createDashboardRouter } = require('./dashboard');
const { createOrdenesRouter } = require('./ordenes');
const { createProductosRouter } = require('./productos');
const { createTestimoniosAdminRouter } = require('./testimonios');
const { createVentasRouter } = require('./ventas');

function createAdminRouter(config) {
    const router = express.Router();

    router.use(createAuthenticate(config), requireAdmin);

    router.use('/dashboard', createDashboardRouter(config));
    router.use('/ordenes', createOrdenesRouter(config));
    router.use('/ventas', createVentasRouter(config));
    router.use('/productos', createProductosRouter(config));
    router.use('/testimonios', createTestimoniosAdminRouter(config));
    router.use('/clientes', createClientesRouter(config));
    router.use('/contenido', createContenidoRouter(config));
    router.use('/auditoria', createAuditoriaRouter(config));

    return router;
}

module.exports = { createAdminRouter };
