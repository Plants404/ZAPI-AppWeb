'use strict';

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
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
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 140,
    },
    nombre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    categoria: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    descripcion: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1200,
    },
    precio: {
        type: Number,
        required: true,
        min: 0,
    },
    costo: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    imagenes: {
        type: [String],
        required: true,
        validate: {
            validator: imagenes => Array.isArray(imagenes) && imagenes.length > 0,
            message: 'El producto debe tener al menos una imagen.',
        },
    },
    infoDeVenta: {
        type: [String],
        default: () => [],
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        validate: {
            validator: Number.isSafeInteger,
            message: 'El stock debe ser un número entero.',
        },
    },
    stockMinimo: {
        type: Number,
        required: true,
        min: 0,
        default: 3,
        validate: {
            validator: Number.isSafeInteger,
            message: 'El stock mínimo debe ser un número entero.',
        },
    },
    destacado: {
        type: Boolean,
        required: true,
        default: false,
    },
    activo: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

productoSchema.index({ activo: 1, categoria: 1 });
productoSchema.index({ activo: 1, destacado: -1, nombre: 1 });
productoSchema.index({ activo: 1, stock: 1 });

module.exports = mongoose.models.Producto || mongoose.model('Producto', productoSchema);
