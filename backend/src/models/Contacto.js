'use strict';

const mongoose = require('mongoose');
const { EMAIL_PATTERN } = require('../utils/validacion');

const contactoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 254,
        match: [EMAIL_PATTERN, 'Ingresá un correo válido.'],
    },
    asunto: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150,
    },
    telefono: {
        type: String,
        trim: true,
        maxlength: 40,
    },
    mensaje: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 2000,
    },
    estado: {
        type: String,
        enum: ['nuevo', 'leido', 'respondido', 'archivado'],
        default: 'nuevo',
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

contactoSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.models.Contacto || mongoose.model('Contacto', contactoSchema);
