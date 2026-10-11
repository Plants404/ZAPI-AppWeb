'use strict';
/* Rutas del asistente.
     GET  /api/asistente/config    config publica (sin datos
                                   sensibles): nombre, contacto,
                                   promociones y el motor del
                                   asistente. Lectura.
     POST /api/asistente/chat      un mensaje del visitante. Lleva
                                   sesion (para leer sus intereses)
                                   y el limite de chat.
     POST /api/asistente/tracking  un evento de navegacion. Escritura
                                   barata: limite de escritura. */

const express = require('express');

const { config, chat, evento } = require('../controllers/asistente.controller');
const { sesion } = require('../middlewares/sesion');
const { limiteLectura, limiteEscritura, limiteChat } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/config', limiteLectura, config);
router.post('/chat', sesion, limiteChat, chat);
router.post('/tracking', sesion, limiteEscritura, evento);

module.exports = router;
