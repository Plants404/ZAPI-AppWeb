'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const productosData = require('../public/data/productos.json');
const Stock = require('../backend/models/Stock');

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    const productos = productosData.productos;
    if (!Array.isArray(productos) || productos.length === 0) {
        throw new Error('No hay productos válidos en public/data/productos.json.');
    }

    for (const producto of productos) {
        if (!Number.isSafeInteger(producto.id) || producto.id < 1
            || typeof producto.nombre !== 'string' || !producto.nombre.trim()
            || typeof producto.precioBase !== 'number' || !Number.isFinite(producto.precioBase)
            || producto.precioBase < 0) {
            throw new Error('El catálogo contiene un producto con ID, nombre o precio inválido.');
        }
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

    const operations = productos.map(producto => ({
        updateOne: {
            filter: { productoId: producto.id },
            update: {
                $set: {
                    nombre: producto.nombre.trim(),
                    precioBase: producto.precioBase,
                },
                $setOnInsert: {
                    productoId: producto.id,
                    unidades: 10,
                },
            },
            upsert: true,
        },
    }));

    const result = await Stock.bulkWrite(operations, { ordered: true });
    console.log(
        `Stock sembrado: ${productos.length} productos; `
        + `${result.upsertedCount} creados y unidades existentes preservadas.`
    );
}

main()
    .catch(error => {
        console.error('No se pudo sembrar el stock:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
