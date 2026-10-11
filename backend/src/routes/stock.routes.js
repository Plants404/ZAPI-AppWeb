'use strict';
/* GET /api/stock — stock de todo el catalogo.
   PUT /api/stock/:id — cargar o cambiar el stock. Es la unica
   ruta de escritura que acepta un id elegido por el cliente, y a
   proposito: es asi como se carga el stock sin un panel de
   administracion. Por eso lleva el token de admin. */

const express = require('express');

const { ver, cambiar } = require('../controllers/stock.controller');
const { exigirAdmin } = require('../middlewares/admin');
const { limiteLectura, limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', limiteLectura, ver);
router.put('/:id', limiteEscritura, exigirAdmin, cambiar);

module.exports = router;