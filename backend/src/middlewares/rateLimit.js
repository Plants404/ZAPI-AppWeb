'use strict';
/* ==========================================================
   RATE LIMIT
   ------------------------------------------------------------
   Un limite en memoria, sin dependencias. Dos reglas segun
   cuanta informacion mueve cada endpoint: leer testimonios es lo
   normal y aguanta mucho mas; escribir una consulta de contacto
   se corta antes de que alguien llene la base con spam.

   No sirve con varias instancias del servidor (cada proceso
   lleva su propia cuenta); para eso hay que mover el contador a
   un almacen compartido. Con un solo proceso es suficiente y no
   agrega infraestructura.
   ========================================================== */

const config = require('../config/env');

const registros = new Map();

/* Recorre el mapa cada tanto y borra las ventanas vencidas. El
   setInterval lleva unref() para que no mantenga vivo el proceso
   al apagar. */
setInterval(() => {
    const ahora = Date.now();

    for (const [clave, dato] of registros) {
        if (ahora > dato.reinicio) registros.delete(clave);
    }
}, 5 * 60 * 1000).unref();

function crearLimite(ventanaMs, maximo) {
    return function limite(req, res, next) {
        /* Detras de un proxy, req.ip es la IP real si trust proxy
           esta bien configurado (ver app.js). */
        const clave = req.ip || 'desconocido';
        const ahora = Date.now();
        const previo = registros.get(clave);

        if (!previo || ahora > previo.reinicio) {
            registros.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });

            return next();
        }

        if (previo.cuenta >= maximo) {
            const segundos = Math.ceil((previo.reinicio - ahora) / 1000);

            res.setHeader('Retry-After', String(segundos));

            return res.status(429).json({
                error: 'Demasiadas peticiones. Esperá un momento e intentá de nuevo.',
            });
        }

        previo.cuenta++;

        next();
    };
}

const limiteLectura = crearLimite(60 * 1000, config.limiteLectura);
const limiteEscritura = crearLimite(10 * 60 * 1000, config.limiteEscritura);

/* El chat del asistente va aparte: mueve mas que una escritura
   normal y quiere su propia ventana corta. */
const limiteChat = crearLimite(60 * 1000, config.limiteChat);

/* Solo para las pruebas: deja el mapa limpio entre casos. */
function reiniciar() {
    registros.clear();
}

module.exports = { limiteLectura, limiteEscritura, limiteChat, crearLimite, reiniciar };
