'use strict';

const mongoose = require('mongoose');

const testimonioSchema = new mongoose.Schema({
    autor: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
    },
    lugar: {
        type: String,
        trim: true,
        maxlength: 120,
        default: '',
    },
    texto: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 600,
    },
    estrellas: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: 'La calificación debe ser un número entero.',
        },
    },
    estado: {
        type: String,
        required: true,
        enum: ['pendiente', 'aprobado', 'rechazado'],
        default: 'pendiente',
    },
    motivoRechazo: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    productoId: {
        type: Number,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});

testimonioSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.models.Testimonio
    || mongoose.model('Testimonio', testimonioSchema);
