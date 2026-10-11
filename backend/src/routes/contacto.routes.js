'use strict';
/* POST /api/contacto — consulta del formulario de contacto.
   Lleva el limite de escritura: escribir en la base es lo caro, y
   un formulario abierto sin limite es la forma mas facil de
   llenar la bandeja de spam. */

const express = require('express');

const { crear } = require('../controllers/contacto.controller');
const { limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/', limiteEscritura, crear);

module.exports = router;
