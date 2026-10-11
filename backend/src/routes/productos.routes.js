'use strict';
/* GET /api/productos — catalogo con el stock pegado.
   Lectura: limite alto, es lo que consulta el front para pintar
   las tarjetas y las fichas. */

const express = require('express');

const { listar, ver } = require('../controllers/productos.controller');
const { limiteLectura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', limiteLectura, listar);
router.get('/:id', limiteLectura, ver);

module.exports = router;