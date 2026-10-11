'use strict';
/* Stock de un producto, 1 a 1 con el catalogo (producto_id unico).

   unidades === null significa "sin datos cargados", y NO es lo
   mismo que 0: con null hay que preguntar, con 0 hay que avisar
   que se agoto. El stock se escribe a mano desde la administracion
   (PUT /api/stock/:id), asi que el catalogo arranca sin el. */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const esquemaStock = new Schema({
    producto_id: { type: Number, required: true },
    unidades: { type: Number, default: null },
    actualizado: { type: Date, default: Date.now },
}, { versionKey: false });

esquemaStock.index({ producto_id: 1 }, { unique: true });

module.exports = { Stock: mongoose.model('Stock', esquemaStock) };