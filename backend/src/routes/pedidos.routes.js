'use strict';
/* GET  /api/pedidos — el historial de la cuenta (exige cuenta).
   POST /api/pedidos — cerrar el pedido de la cuenta.
   Las dos exigen cuenta (exigirSesion): ver el historial y comprar
   piden estar registrado. La sesion anonima del carrito sigue
   haciendo falta para el camino que arma el pedido del carrito del
   servidor, y el POST lleva el limite mas bajo porque descuenta
   stock. */

const express = require('express');

const { crear, listar } = require('../controllers/pedidos.controller');
const { exigirSesion } = require('../middlewares/auth');
const { sesion } = require('../middlewares/sesion');
const { limiteEscritura, limiteLectura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', exigirSesion, limiteLectura, listar);
router.post('/', exigirSesion, sesion, limiteEscritura, crear);

module.exports = router;