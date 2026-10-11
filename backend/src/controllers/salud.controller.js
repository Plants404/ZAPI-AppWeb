'use strict';
/* ==========================================================
   CONTROLADOR: SALUD
   ------------------------------------------------------------
   Comprobacion de estado. Devuelve 200 solo si Mongo responde:
   con la base caida el servidor puede atender HTML estatico,
   pero no esta listo para recibir escrituras. Un monitor externo
   usa el codigo de estado para decidir.
   ========================================================== */

const database = require('../config/database');

function ver(req, res) {
    const conectado = database.listo();

    res.status(conectado ? 200 : 503).json({
        ok: conectado,
        mongo: database.nombreEstado(),
        hora: new Date().toISOString(),
    });
}

module.exports = { ver };
