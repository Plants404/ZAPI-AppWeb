'use strict';
/* Producto del catalogo. El _id ES el id numerico del catalogo
   (public/data/productos.json): es lo que conoce el front y lo
   que llega por URL, asi que no tiene sentido inventar un ObjectId
   y mantener dos ids. */

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const esquemaProducto = new Schema({
    _id: { type: Number, required: true },
    nombre: { type: String, required: true },
    slug: { type: String, required: true },
    categoria: { type: String, required: true },
    precio: { type: Number, required: true },
    /* Todo lo demas del catalogo (imagenes, descripcion, datos de
       venta) tal cual viene del JSON. Tipo Mixed a proposito: el
       esquema no tiene que cambiar cada vez que el catalogo crezca. */
    detalle: { type: Schema.Types.Mixed, default: {} },
    activo: { type: Boolean, default: true },
}, { versionKey: false });

esquemaProducto.index({ slug: 1 });

module.exports = { Producto: mongoose.model('Producto', esquemaProducto) };