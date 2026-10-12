'use strict';
/* ==========================================================
   RUTAS DE LA API
   ------------------------------------------------------------
   Todo cuelga de /api para que las versiones futuras no rompan
   a los clientes actuales: hoy es /api, y si algun dia hay que
   cambiarlo se monta /api/v2 al lado sin tocar esto.

   GET    /api/productos      catalogo con el stock actual
   GET    /api/productos/:id  una ficha (id o slug)
   GET    /api/stock          stock de todo el catalogo
   PUT    /api/stock/:id      cargar o cambiar el stock (token)
   GET    /api/carrito        el carrito de la sesion
   POST   /api/carrito        agregar un producto
   PATCH  /api/carrito/:id    cambiar la cantidad
   DELETE /api/carrito/:id    sacar un producto
   POST   /api/pedidos        cerrar el pedido (exige cuenta)
   POST   /api/auth/registro  crear la cuenta
   POST   /api/auth/login     ingresar
   POST   /api/auth/logout    cerrar la sesion
   GET    /api/auth/yo        la cuenta de la sesion, o null
   GET    /api/salud          estado del servidor y de Mongo
   GET    /api/testimonios    opiniones publicadas
   POST   /api/contacto       consulta del formulario
   GET    /api/asistente/config     config del asistente (IA activa)
   POST   /api/asistente/chat       mensaje al asistente con IA
   POST   /api/asistente/tracking   evento de navegacion
   ========================================================== */

const express = require('express');

const producto = require('./productos.routes');
const stock = require('./stock.routes');
const carrito = require('./carrito.routes');
const pedidos = require('./pedidos.routes');
const auth = require('./auth.routes');
const contacto = require('./contacto.routes');
const testimonios = require('./testimonios.routes');
const salud = require('./salud.routes');
const asistente = require('./asistente.routes');

const router = express.Router();

router.use('/productos', producto);
router.use('/stock', stock);
router.use('/carrito', carrito);
router.use('/pedidos', pedidos);
router.use('/auth', auth);
router.use('/salud', salud);
router.use('/testimonios', testimonios);
router.use('/contacto', contacto);
router.use('/asistente', asistente);

module.exports = router;
