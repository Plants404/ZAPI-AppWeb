'use strict';
/* GET    /api/testimonios        opiniones publicadas de la home.
   POST   /api/testimonios        guarda una opinion (con sesion).
   GET    /api/testimonios/todos  todas, con id y estado (token).
   PATCH  /api/testimonios/:id    publicar o despublicar (token).

   La lectura lleva el limite de lectura, que es mas alto que el de
   escritura. El POST escribe, asi que lleva el limite de escritura
   y exige sesion: solo deja opinar a una cuenta, que es la que se
   guarda. Las dos de administracion van detras del token de admin
   (x-zapi-token), como la carga de stock: sin eso no hay forma de
   aprobar u ocultar una opinion. */

const express = require('express');

const {
    listar,
    crear,
    listarAdmin,
    publicar,
} = require('../controllers/testimonios.controller');
const { exigirSesion } = require('../middlewares/auth');
const { exigirAdmin } = require('../middlewares/admin');
const { limiteLectura, limiteEscritura } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/', limiteLectura, listar);
router.post('/', limiteEscritura, exigirSesion, crear);
router.get('/todos', limiteLectura, exigirAdmin, listarAdmin);
router.patch('/:id', limiteEscritura, exigirAdmin, publicar);

module.exports = router;
