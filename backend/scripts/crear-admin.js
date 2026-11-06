'use strict';

/* Crea (o actualiza) el único super administrador del sistema.
   No se ejecuta desde la web ni al conectar la base: es una acción manual.

   PowerShell:
       $env:ADMIN_NOMBRE="Administrador"
       $env:ADMIN_EMAIL="admin@zapi.uy"
       $env:ADMIN_CLAVE="una-clave-de-12-caracteres-o-mas"
       npm run admin:crear
*/

require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { EMAIL_PATTERN, normalizarEmail, texto } = require('../src/utils/validacion');

const CLAVE_MIN = 12;
const CLAVE_MAX = 128;
const RONDAS_BCRYPT = 12;

function leerEntorno() {
    return {
        nombre: texto(process.env.ADMIN_NOMBRE || process.env.ADMIN_NAME),
        email: normalizarEmail(process.env.ADMIN_EMAIL),
        clave: process.env.ADMIN_CLAVE || process.env.ADMIN_PASSWORD || '',
        mongoUri: process.env.MONGODB_URI || '',
    };
}

function validar({ nombre, email, clave, mongoUri }) {
    if (!mongoUri) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    if (nombre.length < 2 || nombre.length > 100) {
        throw new Error('ADMIN_NOMBRE debe tener entre 2 y 100 caracteres.');
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        throw new Error('ADMIN_EMAIL debe ser un correo válido.');
    }

    if (clave.length < CLAVE_MIN || clave.length > CLAVE_MAX) {
        throw new Error(`ADMIN_CLAVE debe tener entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`);
    }
}

async function main() {
    const datos = leerEntorno();
    validar(datos);

    await mongoose.connect(datos.mongoUri, { serverSelectionTimeoutMS: 10000 });

    const passwordHash = await bcrypt.hash(datos.clave, RONDAS_BCRYPT);
    const existente = await User.findOne({ email: datos.email }).select('role').lean();

    await User.findOneAndUpdate(
        { email: datos.email },
        {
            $set: {
                nombre: datos.nombre,
                passwordHash,
                role: 'superadmin',
                activo: true,
            },
        },
        {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
            setDefaultsOnInsert: true,
        }
    );

    if (existente && existente.role === 'cliente') {
        console.log(`La cuenta ${datos.email} era de cliente y ahora es superadministradora.`);
    } else if (existente) {
        console.log(`Superadministrador ${datos.email} actualizado.`);
    } else {
        console.log(`Superadministrador ${datos.email} creado.`);
    }
}

main()
    .catch(error => {
        console.error('No se pudo configurar el superadministrador:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
