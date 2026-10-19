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
    verificado: {
        type: Boolean,
        required: true,
        default: false,
    },
    autorizado: {
        type: Boolean,
        required: true,
        default: false,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

testimonioSchema.index({ verificado: 1, autorizado: 1, createdAt: -1 });

module.exports = mongoose.models.Testimonio
    || mongoose.model('Testimonio', testimonioSchema);
