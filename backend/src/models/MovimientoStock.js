'use strict';

const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true,
        index: true,
    },
    productoId: {
        type: Number,
        required: true,
    },
    tipo: {
        type: String,
        required: true,
        enum: ['entrada', 'ajuste', 'merma', 'venta', 'cancelacion', 'anulacion'],
    },
    cantidad: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isSafeInteger,
            message: 'La cantidad debe ser un entero.',
        },
    },
    stockAnterior: {
        type: Number,
        required: true,
        min: 0,
    },
    stockNuevo: {
        type: Number,
        required: true,
        min: 0,
    },
    motivo: {
        type: String,
        trim: true,
        maxlength: 300,
        default: '',
    },
    orden: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orden',
        default: null,
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});

movimientoSchema.index({ producto: 1, createdAt: -1 });

module.exports = mongoose.models.MovimientoStock
    || mongoose.model('MovimientoStock', movimientoSchema);
