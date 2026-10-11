'use strict';
/* Carrito de una sesion, una fila por sesion con las lineas
   embebidas. El _id ES el id de sesion (lo que se guarda en la
   cookie firmada): no hay un id aparte que enlazar.

   La linea guarda solo producto_id y cantidad. El nombre y el
   precio se vuelven a leer del catalogo en cada lectura, porque
   el precio que se cobra sale de la base y nunca del cliente:
   un carrito manipulado tiene que pagar lo que dice el catalogo.

   TTL sobre actualizado: un carrito sin tocar durante 30 dias se
   borra solo. Como cada modificacion actualiza el campo, el
   reloj arranca de nuevo siempre. */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const item = new Schema({
    producto_id: { type: Number, required: true },
    cantidad: { type: Number, required: true, min: 1, max: 99 },
}, { _id: false });

const esquemaCarrito = new Schema({
    _id: { type: String, required: true },
    creado: { type: Date, default: Date.now },
    actualizado: { type: Date, default: Date.now },
    items: { type: [item], default: [] },
}, { versionKey: false });

esquemaCarrito.index({ actualizado: 1 }, { expireAfterSeconds: 2592000 });

module.exports = { Carrito: mongoose.model('Carrito', esquemaCarrito) };