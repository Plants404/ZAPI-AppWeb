'use strict';
/* Carrito de la sesion autenticado por cookie.
     GET    /api/carrito      el carrito armado
     POST   /api/carrito      agregar un producto
     PATCH  /api/carrito/:id  fijar la cantidad
     DELETE /api/carrito/:id  sacar un producto

   Todo el router corre con sesion() encima: sin sesion valida se
   crea una en el acto y se firma, asi el carrito arranca vacio
   sin que el front tenga que pre-autenticarse en ningun lado. */

const express = require('express');

const { ver, agregar, fijar, quitar } = require('../controllers/carrito.controller');
const { sesion } = require('../middlewares/sesion');
const { limiteLectura, limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.use(sesion);

router.get('/', limiteLectura, ver);
router.post('/', limiteEscritura, agregar);
router.patch('/:id', limiteEscritura, fijar);
router.delete('/:id', limiteEscritura, quitar);

module.exports = router;