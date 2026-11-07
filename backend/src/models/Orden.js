'use strict';

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true,
    },
    productoId: {
        type: Number,
        required: true,
    },
    nombre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isSafeInteger,
            message: 'La cantidad debe ser un número entero.',
        },
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
    },
}, { _id: false });

const contactoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    telefono: {
        type: String,
        trim: true,
        maxlength: 40,
        default: '',
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
}, { _id: false });

const ordenSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: 40,
    },
    canal: {
        type: String,
        required: true,
        enum: ['online', 'presencial'],
        index: true,
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    contacto: {
        type: contactoSchema,
        required: true,
    },
    items: {
        type: [itemSchema],
        required: true,
        validate: {
            validator: items => Array.isArray(items) && items.length > 0,
            message: 'La orden debe incluir al menos un producto.',
        },
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    descuento: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
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
    metodoPago: {
        type: String,
        required: true,
        enum: ['efectivo', 'debito', 'credito', 'transferencia', 'online'],
        default: 'online',
    },
    estado: {
        type: String,
        required: true,
        enum: ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'],
        default: 'pendiente',
        index: true,
    },
    envioPendiente: {
        type: Boolean,
        required: true,
        default: false,
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
    notasInternas: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
    },
    motivoCancelacion: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
    },
    stockRepuesto: {
        type: Boolean,
        required: true,
        default: false,
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});

ordenSchema.index({ canal: 1, createdAt: -1 });
ordenSchema.index({ estado: 1, createdAt: -1 });
ordenSchema.index({ canal: 1, estado: 1, createdAt: -1 });
ordenSchema.index({ cliente: 1, createdAt: -1 });
ordenSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Orden || mongoose.model('Orden', ordenSchema);
