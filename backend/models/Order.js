'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productoId: {
        type: Number,
        required: true,
        immutable: true,
    },
    nombre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        immutable: true,
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isSafeInteger,
            message: 'La cantidad debe ser un número entero.',
        },
        immutable: true,
    },
    precio: {
        type: Number,
        required: true,
        min: 0,
        immutable: true,
    },
}, { _id: false });

const orderContactSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    telefono: {
        type: String,
        required: true,
        trim: true,
        maxlength: 40,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    contacto: {
        type: orderContactSchema,
        required: true,
    },
    zona: {
        type: String,
        trim: true,
        maxlength: 200,
        default: null,
    },
    notas: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: items => items.length > 0,
            message: 'El pedido debe incluir al menos un producto.',
        },
    },
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    moneda: {
        type: String,
        enum: ['UYU'],
        default: 'UYU',
        required: true,
    },
    estado: {
        type: String,
        enum: ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'],
        default: 'pendiente',
        required: true,
    },
    envioPendiente: {
        type: Boolean,
        required: true,
        default: false,
    },
    ocultoEnHistorial: {
        type: Boolean,
        required: true,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
