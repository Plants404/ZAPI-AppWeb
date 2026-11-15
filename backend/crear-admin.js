'use strict';

/* Crea una cuenta de administrador (Marcio o Pablo) sin dejar la contraseña
   en el historial de comandos ni en el repositorio.
   Uso: node backend/crear-admin.js <email>
   Si no se pasa el email, se pide por entrada estándar. */

const readline = require('node:readline');
const { connectDatabase, closeDatabase } = require('./db.js');
const { hashPassword } = require('./lib/auth.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function preguntar(texto) {
    return new Promise(resolve => rl.question(texto, resolve));
}

function preguntarClave(texto) {
    return new Promise((resolve) => {
        process.stdin.isTTY && process.stdin.setRawMode && process.stdin.setRawMode(true);
        rl._writeToOutput = function () {}; // suprimir eco
        rl.question(texto, clave => {
            process.stdin.isTTY && process.stdin.setRawMode && process.stdin.setRawMode(false);
            rl._writeToOutput = null;
            console.log();
            resolve(clave);
        });
    });
}

async function main() {
    const emailArg = process.argv[2];
    let email = emailArg;

    if (!email) {
        email = await preguntar('Email del administrador: ');
    }
    email = String(email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('Email inválido.');
        process.exitCode = 1;
        rl.close();
        return;
    }

    const clave = await preguntarClave('Contraseña (mínimo 12 caracteres, no se muestra): ');
    if (typeof clave !== 'string' || clave.length < 12) {
        console.error('La contraseña debe tener al menos 12 caracteres.');
        process.exitCode = 1;
        rl.close();
        return;
    }

    const db = await connectDatabase();
    const existente = await db.collection('users').findOne({ email });
    if (existente) {
        console.error(`Ya existe una cuenta con el email ${email}.`);
        await closeDatabase();
        rl.close();
        process.exitCode = 1;
        return;
    }

    const { salt, hash } = hashPassword(clave);
    await db.collection('users').insertOne({
        email,
        passwordSalt: salt,
        passwordHash: hash,
        rol: 'admin',
        nombre: email.split('@')[0],
        createdAt: new Date()
    });

    console.log(`Administrador creado: ${email}`);
    await closeDatabase();
    rl.close();
}

main().catch(error => {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
    rl.close();
});
