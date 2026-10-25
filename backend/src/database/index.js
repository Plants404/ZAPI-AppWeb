'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

let connectionPromise;

async function ensureDatabaseConnected(mongoUri) {
    if (mongoose.connection.readyState === 1) return;
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
        bufferCommands: false,
    })
        .then(async () => {
            /* Crea un administrador por defecto si no existe ninguno.
               Las credenciales salen de ADMIN_EMAIL / ADMIN_PASSWORD del
               entorno. Si no se definen, no se crea nada (se requiere
               crear el admin manualmente en la base de datos). */
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (adminEmail && adminPassword) {
                const existe = await User.exists({ email: adminEmail.toLowerCase() });
                if (!existe) {
                    const passwordHash = await bcrypt.hash(adminPassword, 12);
                    await User.create({
                        nombre: 'Administrador',
                        email: adminEmail.toLowerCase(),
                        passwordHash,
                        role: 'admin',
                    });
                    console.log(`Usuario administrador creado: ${adminEmail}`);
                }
            }
        })
        .finally(() => {
            connectionPromise = undefined;
        });

    return connectionPromise;
}

module.exports = { ensureDatabaseConnected };
