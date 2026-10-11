'use strict';
/* GET /api/salud — comprobacion de estado.
   No lleva rate limit ni autenticacion: un monitor tiene que
   poder preguntar seguido, y no expone informacion interna mas
   alla de si Mongo responde. */

const express = require('express');

const { ver } = require('../controllers/salud.controller');

const router = express.Router();

router.get('/', ver);

module.exports = router;
