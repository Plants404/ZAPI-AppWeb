'use strict';
/* GET /api/testimonios — opiniones publicadas de la home.
   Lectura: lleva el limite de lectura, que es mas alto que el de
   escritura. */

const express = require('express');

const { listar } = require('../controllers/testimonios.controller');
const { limiteLectura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', limiteLectura, listar);

module.exports = router;
