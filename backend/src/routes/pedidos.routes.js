'use strict';
/* POST /api/pedidos — cerrar el pedido de la cuenta.
   Exige cuenta (exigirSesion): comprar pide estar registrado. La
   sesion anonima del carrito sigue haciendo falta para el camino
   que arma el pedido del carrito del servidor, y lleva el limite
   mas bajo porque descuenta stock. */

const express = require('express');

const { crear } = require('../controllers/pedidos.controller');
const { exigirSesion } = require('../middlewares/auth');
const { sesion } = require('../middlewares/sesion');
const { limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/', exigirSesion, sesion, limiteEscritura, crear);

module.exports = router;