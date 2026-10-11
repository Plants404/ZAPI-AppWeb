'use strict';
/* ==========================================================
   REGISTRO
   ------------------------------------------------------------
   Una linea JSON por evento. Estructurado y no texto suelto
   porque asi lo puede leer una herramienta de logs (y no hay que
   adivinar el formato a la hora de buscar un error).

   Nunca se registra el cuerpo del formulario: llevaria el
   telefono y el correo de los clientes a los logs. Solo metodo,
   ruta, estado y duracion.
   ========================================================== */

const config = require('../config/env');

function emitir(nivel, mensaje, datos) {
    const linea = JSON.stringify({
        hora: new Date().toISOString(),
        nivel,
        mensaje,
        ...datos,
    });

    if (nivel === 'error') {
        console.error(linea);
    } else {
        console.log(linea);
    }
}

function info(mensaje, datos = {}) {
    emitir('info', mensaje, datos);
}

function warn(mensaje, datos = {}) {
    emitir('warn', mensaje, datos);
}

function error(mensaje, datos = {}) {
    emitir('error', mensaje, datos);
}

/* Logger de peticiones. En test se salta para no ensuciar la
   salida de la suite con una linea por request. */
function peticiones(req, res, next) {
    if (config.esTest) return next();

    const inicio = process.hrtime.bigint();

    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

        info('peticion', {
            metodo: req.method,
            ruta: req.originalUrl,
            estado: res.statusCode,
            ms: Math.round(ms),
        });
    });

    next();
}

module.exports = { info, warn, error, peticiones };
