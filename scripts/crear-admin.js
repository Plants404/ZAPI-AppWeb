'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../backend/models/User');

async function main() {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const nombre = (process.env.ADMIN_NAME || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Definí ADMIN_EMAIL con un correo válido.');
    }

    if (nombre.length < 2 || nombre.length > 100) {
        throw new Error('Definí ADMIN_NAME con un nombre de entre 2 y 100 caracteres.');
    }

    if (password.length < 12 || password.length > 128) {
        throw new Error('ADMIN_PASSWORD debe tener entre 12 y 128 caracteres.');
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const passwordHash = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate(
        { email },
        { $set: { nombre, passwordHash, role: 'admin' } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log(`Administrador configurado para ${email}.`);
}

main()
    .catch(error => {
        console.error('No se pudo configurar el administrador:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
