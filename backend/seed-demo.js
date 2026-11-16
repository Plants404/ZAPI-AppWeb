'use strict';

/* Carga datos de demostración en la base: pedidos, analítica y testimonios.
   Borra antes los datos de demostración anteriores (campo `ejemplo: true`),
   así que se puede repetir sin duplicar. No toca productos ni usuarios.
   Uso: npm run backend:demo */

const { connectDatabase, closeDatabase } = require('./db.js');
const { TESTIMONIOS, generarPedidos, generarEventos } = require('./lib/datos-demo.js');

async function cargarDemo(db) {
    const ahora = new Date();

    for (const coleccion of ['orders', 'eventos', 'testimonials']) {
        await db.collection(coleccion).deleteMany({ ejemplo: true });
    }

    const pedidos = generarPedidos(ahora);
    const eventos = generarEventos(ahora);
    const testimonios = TESTIMONIOS.map(({ dias, ...resto }) => ({
        ...resto,
        createdAt: new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000),
        ejemplo: true
    }));

    await db.collection('orders').insertMany(pedidos);
    await db.collection('eventos').insertMany(eventos);
    await db.collection('testimonials').insertMany(testimonios);

    console.log(`Demo cargada: ${pedidos.length} pedidos, ${eventos.length} eventos, ${testimonios.length} testimonios.`);
}

async function main() {
    await cargarDemo(await connectDatabase());
}

if (require.main === module) {
main()
    .catch(error => {
        console.error('No se pudo cargar la demo:', error.message);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = { cargarDemo };
