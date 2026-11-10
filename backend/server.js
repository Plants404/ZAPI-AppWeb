'use strict';

const { crearApp } = require('./app.js');
const { closeDatabase, connectDatabase } = require('./db.js');

async function startServer() {
    await connectDatabase();

    const port = Number(process.env.PORT) || 5501;
    const host = process.env.HOST || '127.0.0.1';
    const server = crearApp().listen(port, host, () => {
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
