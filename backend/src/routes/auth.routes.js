'use strict';
/* Cuentas del sitio.
     POST /api/auth/registro  crear la cuenta y abrir sesion
     POST /api/auth/login     ingresar
     POST /api/auth/logout    cerrar la sesion (borra el token)
     GET  /api/auth/yo        quien esta adentro, o null

   Registro y login llevan limiteAuth: es la unica puerta donde
   alguien podria probar contraseñas en serie. Logout y yo no lo
   necesitan (no adivinan nada). */

const express = require('express');

const { registro, login, logout, yo } = require('../controllers/auth.controller');
const { opcional } = require('../middlewares/auth');
const { limiteAuth } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/yo', opcional, yo);
router.post('/registro', limiteAuth, registro);
router.post('/login', limiteAuth, login);
router.post('/logout', logout);

module.exports = router;
