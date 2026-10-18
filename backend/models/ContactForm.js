'use strict';

const mongoose = require('mongoose');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactFormSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
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
        minlength: 2,
        maxlength: 150,
    },
    mensaje: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 5000,
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

contactFormSchema.index({ estado: 1, createdAt: -1 });
contactFormSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.ContactForm
    || mongoose.model('ContactForm', contactFormSchema);
