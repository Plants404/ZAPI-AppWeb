'use strict';

/* Depuración de datos personales a los 365 días (1 año).
   - Consultas de contacto: se eliminan por índice TTL de MongoDB
     (365 días desde createdAt).
   - Testimonios rechazados: se eliminan por índice TTL de MongoDB
     (365 días desde rechazadoEn, seteado al rechazar).
   - Pedidos: a los 365 días se anonimizan los datos personales del cliente
     (nombre, teléfono, correo, dirección, notas) y se conservan fecha,
     total, estado, canal y líneas para estadísticas del negocio.
     Idempotente: un pedido ya anonimizado no se toca de nuevo.
   Uso: node backend/depurar.js
   Puede ejecutarse con un programador del hosting (cron). */

const { connectDatabase, closeDatabase } = require('./db.js');

const DIAS_CONSERVACION = 365;

function fechaLimite() {
    const ahora = new Date();
    ahora.setDate(ahora.getDate() - DIAS_CONSERVACION);
    return ahora;
}

async function depurarPedidos(db) {
    const limite = fechaLimite();
    const cursor = await db.collection('orders').find({
        fecha: { $lt: limite },
        $or: [
            { clienteAnonimizado: { $ne: true } },
            { clienteAnonimizado: { $exists: false } }
        ]
    });
    const pedidos = await cursor.toArray();

    for (const pedido of pedidos) {
        await db.collection('orders').updateOne(
            { id: pedido.id },
            {
                $set: {
                    cliente: {
                        nombre: '[Anonimizado]',
                        telefono: '[Anonimizado]',
                        email: '[Anonimizado]',
                        zona: '[Anonimizado]',
                        notas: '[Anonimizado]'
                    },
                    clienteAnonimizado: true,
                    actualizadoEn: new Date()
                }
            }
        );
    }

    return pedidos.length;
}

async function main() {
    const db = await connectDatabase();
    const pedidosDepurados = await depurarPedidos(db);
    console.log(`Depuración completada: ${pedidosDepurados} pedidos anonimizados.`);
    await closeDatabase();
}

if (require.main === module) {
    main().catch(error => {
        console.error('No se pudo depurar:', error.message);
        process.exitCode = 1;
        closeDatabase();
    });
}

module.exports = { depurarPedidos, fechaLimite };
