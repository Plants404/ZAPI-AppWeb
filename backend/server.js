'use strict';

const { crearApp } = require('./app.js');
const { closeDatabase, connectDatabase } = require('./db.js');
const { PRODUCTOS } = require('./compartido/catalogo.js');
const { construirOperacionesProductos } = require('./seed.js');
const { cargarDemo } = require('./seed-demo.js');

/* Si la base está vacía (primer arranque o base nueva), carga el catálogo
   del sitio para que el panel y la tienda tengan productos desde el inicio. */
async function cargarCatalogoInicial(db) {
    try {
        const productos = db.collection('products');
        if (await productos.countDocuments({}, { limit: 1 }) > 0) return;

        await productos.createIndex({ id: 1 }, { unique: true });
        await productos.createIndex({ slug: 1 }, { unique: true });
        const resultado = await productos.bulkWrite(construirOperacionesProductos(PRODUCTOS, new Date()));
        console.log(`Catálogo inicial cargado: ${resultado.upsertedCount} productos.`);
    } catch (error) {
        console.error('No se pudo cargar el catálogo inicial:', error.message);
    }
}

/* Con ZAPI_CARGAR_DEMO=1 se cargan una sola vez los datos de demostración
   (pedidos, analítica y testimonios) si la base todavía no los tiene. */
async function cargarDemoInicial(db) {
    if (process.env.ZAPI_CARGAR_DEMO !== '1') return;
    try {
        if (await db.collection('orders').countDocuments({ ejemplo: true }, { limit: 1 }) > 0) return;
        await cargarDemo(db);
    } catch (error) {
        console.error('No se pudo cargar la demo:', error.message);
    }
}

async function startServer() {
    const db = await connectDatabase();
    await cargarCatalogoInicial(db);
    await cargarDemoInicial(db);

    const port = Number(process.env.PORT) || 5501;
    const host = process.env.HOST || '0.0.0.0';
    const app = await crearApp();
    const server = app.listen(port, host, () => {
        console.log(`API ZAPI escuchando en http://${host}:${port}`);
    });

    const detener = async () => {
        server.close(async () => {
            await closeDatabase();
            process.exit(0);
        });
    };
    process.once('SIGINT', detener);
    process.once('SIGTERM', detener);

    return server;
}

if (require.main === module) {
    startServer().catch(error => {
        console.error('No se pudo iniciar la API:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { startServer };
