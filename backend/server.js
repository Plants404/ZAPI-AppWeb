'use strict';

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { loadConfig, validateConfig } = require('./config');

async function start() {
    const config = loadConfig();
    validateConfig(config);

    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });

    const server = createApp(config).listen(config.port, () => {
        console.log(`ZAPI API escuchando en el puerto ${config.port}.`);
    });

    async function shutdown(signal) {
        console.log(`Recibido ${signal}; cerrando la API.`);
        server.close(async error => {
            if (error) {
                console.error('No se pudo cerrar el servidor HTTP:', error.message);
                process.exitCode = 1;
            }

            await mongoose.disconnect();
        });
    }

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(error => {
    console.error('No se pudo iniciar ZAPI API:', error.message);
    process.exitCode = 1;
});
