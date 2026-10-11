'use strict';
/* Pedido cerrado. La linea guarda producto_id, nombre y precio en
   el momento de la venta: aunque despues se cambie el precio del
   catalogo, el pedido conserva lo que se cobro.

   "id" es el codigo corto legible (Z-AAAA-MM-DD-XXXXXX) que se le
   muestra al cliente. "sesion" es la sesion que cerro el pedido,
   para que el administrador pueda volver a ella si hace falta. */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const linea = new Schema({
    producto_id: { type: Number, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true },
}, { _id: false });

const esquemaPedido = new Schema({
    id: { type: String, required: true, unique: true },
    sesion: { type: String, required: true },
    nombre: { type: String, required: true },
    telefono: { type: String, required: true },
    email: { type: String, default: null },
    zona: { type: String, default: null },
    notas: { type: String, default: null },
    total: { type: Number, required: true },
    estado: { type: String, default: 'pendiente' },
    creado: { type: Date, default: Date.now },
    items: { type: [linea], default: [] },
}, { versionKey: false });

esquemaPedido.index({ sesion: 1 });
esquemaPedido.index({ estado: 1 });

module.exports = { Pedido: mongoose.model('Pedido', esquemaPedido) };