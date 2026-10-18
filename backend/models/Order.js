'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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
            validator: Number.isInteger,
            message: 'La cantidad debe ser un número entero.',
        },
        immutable: true,
    },
    precioUnitario: {
        type: Number,
        required: true,
        min: 0,
        immutable: true,
    },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    nombreDestinatario: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    telefono: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
    },
    calle: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },
    numero: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
    },
    ciudad: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    provincia: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    codigoPostal: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
    },
    referencias: {
        type: String,
        trim: true,
        maxlength: 500,
    },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
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
        required: true,
        uppercase: true,
        default: 'ARS',
        match: /^[A-Z]{3}$/,
    },
    estado: {
        type: String,
        enum: ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'],
        default: 'pendiente',
        required: true,
    },
    metodoPago: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    direccionEnvio: {
        type: shippingAddressSchema,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
