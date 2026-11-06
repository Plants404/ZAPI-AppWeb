'use strict';

/* Siembra el catálogo inicial en MongoDB a partir de frontend/datos/catalogo.js.
   Uso:
       npm run seed:catalogo
       npm run seed:catalogo -- --forzar

   Sin --forzar solo crea los productos que faltan y respeta los cambios
   hechos desde el panel. Con --forzar actualiza los datos de catálogo de
   todos los productos, pero nunca pisa el stock. */

require('dotenv').config();

const mongoose = require('mongoose');
const MovimientoStock = require('../src/models/MovimientoStock');
const Producto = require('../src/models/Producto');
const { PRODUCTOS } = require('../../frontend/datos/catalogo.js');
const { slugify } = require('../src/utils/validacion');

const forzar = process.argv.includes('--forzar');

function validarSemilla() {
    if (!Array.isArray(PRODUCTOS) || PRODUCTOS.length === 0) {
        throw new Error('frontend/datos/catalogo.js no tiene productos.');
    }

    const ids = new Set();
    const slugs = new Set();

    for (const producto of PRODUCTOS) {
        if (!Number.isSafeInteger(producto.id) || producto.id < 1) {
            throw new Error('Hay un producto con id inválido en la semilla.');
        }

        if (ids.has(producto.id)) {
            throw new Error(`El id ${producto.id} está repetido en la semilla.`);
        }

        ids.add(producto.id);

        const slug = slugify(producto.nombre);

        if (!slug || slugs.has(slug)) {
            throw new Error(`El slug "${slug}" está repetido o vacío en la semilla.`);
        }

        slugs.add(slug);

        if (!Number.isFinite(producto.precioBase) || producto.precioBase <= 0) {
            throw new Error(`${producto.nombre} no tiene un precio válido.`);
        }

        if (!Number.isSafeInteger(producto.stock) || producto.stock < 0) {
            throw new Error(`${producto.nombre} no tiene un stock válido.`);
        }

        if (!Array.isArray(producto.imagenes) || producto.imagenes.length === 0) {
            throw new Error(`${producto.nombre} no tiene imágenes.`);
        }
    }
}

function datosDeCatalogo(producto) {
    return {
        slug: slugify(producto.nombre),
        nombre: producto.nombre,
        categoria: producto.categoria,
        descripcion: producto.descripcion,
        precio: producto.precioBase,
        costo: Number.isFinite(producto.costo) ? producto.costo : 0,
        imagenes: producto.imagenes,
        infoDeVenta: Array.isArray(producto.infoDeVenta) ? producto.infoDeVenta : [],
        stockMinimo: Number.isSafeInteger(producto.stockMinimo) ? producto.stockMinimo : 3,
        destacado: Boolean(producto.destacado),
        activo: true,
    };
}

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    validarSemilla();
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

    let creados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    for (const producto of PRODUCTOS) {
        const datos = datosDeCatalogo(producto);
        const existente = await Producto.findOne({ productoId: producto.id });

        if (!existente) {
            const creado = await Producto.create({
                ...datos,
                productoId: producto.id,
                stock: producto.stock,
            });

            if (creado.stock > 0) {
                await MovimientoStock.create({
                    producto: creado._id,
                    productoId: creado.productoId,
                    tipo: 'entrada',
                    cantidad: creado.stock,
                    stockAnterior: 0,
                    stockNuevo: creado.stock,
                    motivo: 'Stock inicial de la semilla',
                });
            }

            creados += 1;
            continue;
        }

        if (!forzar) {
            sinCambios += 1;
            continue;
        }

        await Producto.updateOne(
            { _id: existente._id },
            { $set: datos },
            { runValidators: true }
        );
        actualizados += 1;
    }

    console.log(
        `Catálogo sembrado: ${creados} creados, ${actualizados} actualizados, `
        + `${sinCambios} sin cambios (usá --forzar para actualizar).`
    );
}

main()
    .catch(error => {
        console.error('No se pudo sembrar el catálogo:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
