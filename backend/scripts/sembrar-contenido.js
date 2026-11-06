'use strict';

/* Siembra las secciones de contenido editable con los valores por defecto.
   Uso:
       npm run seed:contenido
       npm run seed:contenido -- --forzar

   Sin --forzar respeta el contenido ya editado desde el panel. */

require('dotenv').config();

const mongoose = require('mongoose');
const Contenido = require('../src/models/Contenido');
const { CONTENIDO_POR_DEFECTO, SECCIONES } = require('../src/data/contenido');
const { normalizarSeccion } = require('../src/utils/contenido');

const forzar = process.argv.includes('--forzar');

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('Falta MONGODB_URI en el entorno.');
    }

    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

    let creadas = 0;
    let actualizadas = 0;
    let sinCambios = 0;

    for (const clave of SECCIONES) {
        const valor = normalizarSeccion(clave, CONTENIDO_POR_DEFECTO[clave]);
        const existente = await Contenido.findOne({ clave }).select('_id').lean();

        if (!existente) {
            await Contenido.create({ clave, valor });
            creadas += 1;
            continue;
        }

        if (!forzar) {
            sinCambios += 1;
            continue;
        }

        await Contenido.updateOne(
            { _id: existente._id },
            { $set: { valor } },
            { runValidators: true }
        );
        actualizadas += 1;
    }

    console.log(
        `Contenido sembrado: ${creadas} secciones creadas, ${actualizadas} actualizadas, `
        + `${sinCambios} sin cambios (usá --forzar para actualizar).`
    );
}

main()
    .catch(error => {
        console.error('No se pudo sembrar el contenido:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
