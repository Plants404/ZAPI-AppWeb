'use strict';
/* ==========================================================
   RUTAS DE LA API
   ------------------------------------------------------------
   Todo cuelga de /api para que las versiones futuras no rompan
   a los clientes actuales: hoy es /api, y si algun dia hay que
   cambiarlo se monta /api/v2 al lado sin tocar esto.

   GET  /api/salud        estado del servidor y de Mongo
   GET  /api/testimonios  opiniones publicadas
   POST /api/contacto     consulta del formulario
   ========================================================== */

const express = require('express');

const contacto = require('./contacto.routes');
const testimonios = require('./testimonios.routes');
const salud = require('./salud.routes');

const router = express.Router();

router.use('/salud', salud);
router.use('/testimonios', testimonios);
router.use('/contacto', contacto);

module.exports = router;
