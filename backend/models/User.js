'use strict';

const mongoose = require('mongoose');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
