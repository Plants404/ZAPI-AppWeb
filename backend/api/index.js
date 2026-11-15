'use strict';

/* Punto de entrada para Vercel Functions.
   Exporta la app Express sin llamar a listen; Vercel maneja el servidor.
   En local (npm run backend) sigue usando backend/server.js. */

const { crearApp } = require('../app.js');
const { connectDatabase } = require('../db.js');

let appPromesa;

function restaurarRutaOriginal(req, res) {
    const destino = new URL(req.url, 'http://vercel.local');
    const rutas = destino.searchParams.getAll('__zapiPath');
    if (rutas.length === 0) return true;

    if (rutas.length !== 1 || !rutas[0].startsWith('/api/')) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Ruta de API no válida.' }));
        return false;
    }

    const rutaOriginal = rutas[0];
    destino.searchParams.delete('__zapiPath');
    req.url = rutaOriginal + destino.search;
    return true;
}

/* Se guarda la promesa para que dos peticiones simultáneas en un arranque en
   frío no creen dos apps ni dos conexiones. Si falla, se olvida y la próxima
   petición vuelve a intentar. */
function obtenerApp() {
    if (!appPromesa) {
        appPromesa = connectDatabase()
            .then(() => crearApp())
            .catch(error => {
                appPromesa = undefined;
                throw error;
            });
    }
    return appPromesa;
}

module.exports = async (req, res) => {
    if (!restaurarRutaOriginal(req, res)) return;

    let app;
    try {
        app = await obtenerApp();
    } catch (error) {
        console.error('No se pudo iniciar la API:', error.message);
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Servicio no disponible.' }));
        return;
    }
    return app(req, res);
};

module.exports.restaurarRutaOriginal = restaurarRutaOriginal;
