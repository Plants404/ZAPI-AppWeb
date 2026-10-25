'use strict';

const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    productoId: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        validate: {
            validator: Number.isSafeInteger,
            message: 'El ID del producto debe ser un entero.',
        },
    },
    nombre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    precioBase: {
        type: Number,
        required: true,
        min: 0,
    },
    unidades: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: Number.isSafeInteger,
            message: 'Las unidades deben ser un número entero.',
        },
    },
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.models.Stock || mongoose.model('Stock', stockSchema);
