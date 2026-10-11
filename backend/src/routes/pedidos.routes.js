'use strict';
/* POST /api/pedidos — cerrar el pedido del carrito de la sesion.
   Escritura: descuenta stock, asi que lleva el limite mas bajo y
   la sesion. */

const express = require('express');

const { crear } = require('../controllers/pedidos.controller');
const { sesion } = require('../middlewares/sesion');
const { limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/', sesion, limiteEscritura, crear);

module.exports = router;