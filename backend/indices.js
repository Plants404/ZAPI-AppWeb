'use strict';

/* Crea los índices de MongoDB que necesita la API.
   Ejecutar con: npm run backend:indices
   Se corre a mano una vez, y de nuevo solo si cambia esta lista. No se
   ejecuta al arrancar la API: en Vercel cada arranque en frío repetiría el
   trabajo. Crear un índice que ya existe igual no hace nada. */

const { connectDatabase, closeDatabase } = require('./db.js');

const UN_ANIO = 365 * 24 * 60 * 60;

const INDICES = [
    { coleccion: 'orders', clave: { id: 1 }, opciones: { unique: true } },
    { coleccion: 'orders', clave: { estado: 1, fecha: -1 }, opciones: {} },
    { coleccion: 'contacts', clave: { createdAt: 1 }, opciones: { expireAfterSeconds: UN_ANIO } },
    { coleccion: 'testimonials', clave: { estado: 1, createdAt: -1 }, opciones: {} },
    { coleccion: 'testimonials', clave: { rechazadoEn: 1 }, opciones: { expireAfterSeconds: UN_ANIO } },
    { coleccion: 'users', clave: { email: 1 }, opciones: { unique: true } },
    { coleccion: 'sessions', clave: { expiresAt: 1 }, opciones: { expireAfterSeconds: 0 } },
    { coleccion: 'auditoria', clave: { createdAt: -1 }, opciones: {} },
    { coleccion: 'publicaciones', clave: { version: 1 }, opciones: { unique: true } },
    { coleccion: 'eventos', clave: { ttl: 1 }, opciones: { expireAfterSeconds: 0 } },
    { coleccion: 'eventos', clave: { timestamp: -1 }, opciones: {} },
    { coleccion: 'limites', clave: { clave: 1 }, opciones: { unique: true } },
    { coleccion: 'limites', clave: { expiraEn: 1 }, opciones: { expireAfterSeconds: 0 } }
];

async function crearIndices() {
    const db = await connectDatabase();
    const fallidos = [];

    try {
        for (const indice of INDICES) {
            const nombre = `${indice.coleccion}.${JSON.stringify(indice.clave)}`;
            try {
                await db.collection(indice.coleccion).createIndex(indice.clave, indice.opciones);
                console.log(`Índice listo: ${nombre}`);
            } catch (error) {
                fallidos.push(nombre);
                console.error(`Error en ${nombre}: ${error.message}`);
            }
        }
    } finally {
        await closeDatabase();
    }

    if (fallidos.length > 0) {
        throw new Error(`No se pudieron crear ${fallidos.length} índices.`);
    }
    console.log('Todos los índices están creados.');
}

if (require.main === module) {
    crearIndices().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { INDICES, crearIndices };
