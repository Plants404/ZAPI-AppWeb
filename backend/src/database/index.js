'use strict';

const mongoose = require('mongoose');

let connectionPromise;

/* Una sola conexión compartida por todas las invocaciones de la función.
   No crea usuarios ni datos: el super admin se crea únicamente con el
   script `npm run admin:crear`. */
async function ensureDatabaseConnected(mongoUri) {
    if (mongoose.connection.readyState === 1) return;
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        bufferCommands: false,
    }).finally(() => {
        connectionPromise = undefined;
    });

    return connectionPromise;
}

module.exports = { ensureDatabaseConnected };
