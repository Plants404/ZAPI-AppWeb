'use strict';

const mongoose = require('mongoose');
const { EMAIL_PATTERN } = require('../utils/validacion');

const userSchema = new mongoose.Schema({
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
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254,
        match: [EMAIL_PATTERN, 'Ingresá un correo válido.'],
    },
    telefono: {
        type: String,
        trim: true,
        maxlength: 40,
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['cliente', 'superadmin'],
        default: 'cliente',
        required: true,
        index: true,
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

userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
