'use strict';

/* Función serverless de Vercel para la API de ZAPI.
   Ubicación: api/index.js
   Reenvía todas las peticiones bajo /api a la aplicación Express. */

const serverless = require('serverless-http');
const { createApp } = require('../backend/src/app');
const { ensureDatabaseConnected } = require('../backend/src/database');
const { loadConfig, validateConfig } = require('../backend/src/config');

const config = loadConfig();
validateConfig(config);

const app = createApp(config);

module.exports = async function handler(request, response) {
    try {
        await ensureDatabaseConnected(config.mongoUri);
    } catch (error) {
        response.status(503).json({
            error: 'Base de datos no disponible.',
            detalle: error.message,
        });
        return;
    }

    return serverless(app)(request, response);
};
