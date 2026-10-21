'use strict';

const mongoose = require('mongoose');

let connectionPromise;

async function ensureDatabaseConnected(mongoUri) {
    if (mongoose.connection.readyState === 1) return;
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        bufferCommands: false,
    })
        .then(() => undefined)
        .finally(() => {
            connectionPromise = undefined;
        });

    return connectionPromise;
}

module.exports = { ensureDatabaseConnected };
