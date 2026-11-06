'use strict';

const mongoose = require('mongoose');

const contenidoSchema = new mongoose.Schema({
    clave: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 60,
    },
    valor: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    actualizadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.models.Contenido || mongoose.model('Contenido', contenidoSchema);
