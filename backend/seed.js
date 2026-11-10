'use strict';

const { PRODUCTOS } = require('../frontend/datos/catalogo.js');
const { closeDatabase, connectDatabase } = require('./db.js');

async function sembrarProductos() {
    const db = await connectDatabase();
    const ahora = new Date();
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    const operaciones = PRODUCTOS.map(producto => ({
        updateOne: {
            filter: { id: producto.id },
            update: {
                $set: { ...producto, updatedAt: ahora },
                $setOnInsert: { active: true, createdAt: ahora }
            },
            upsert: true
        }
    }));

    const resultado = await db.collection('products').bulkWrite(operaciones);
    console.log(`Catálogo sincronizado: ${resultado.upsertedCount} nuevos, ${resultado.modifiedCount} actualizados.`);
}

sembrarProductos()
    .catch(error => {
        console.error('No se pudo sincronizar el catálogo:', error.message);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
