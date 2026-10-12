'use strict';
/* GET    /api/testimonios        opiniones publicadas de la home.
   GET    /api/testimonios/todos  todas, con id y estado (token).
   PATCH  /api/testimonios/:id    publicar o despublicar (token).

   La lectura lleva el limite de lectura, que es mas alto que el de
   escritura. Las dos de administracion van detras del token de
   admin (x-zapi-token), como la carga de stock: sin eso no hay
   forma de aprobar u ocultar una opinion. */

const express = require('express');

const {
    listar,
    listarAdmin,
    publicar,
} = require('../controllers/testimonios.controller');
const { exigirAdmin } = require('../middlewares/admin');
const { limiteLectura, limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', limiteLectura, listar);
router.get('/todos', limiteLectura, exigirAdmin, listarAdmin);
router.patch('/:id', limiteEscritura, exigirAdmin, publicar);

module.exports = router;
