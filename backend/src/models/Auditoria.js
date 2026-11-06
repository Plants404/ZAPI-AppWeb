'use strict';

const mongoose = require('mongoose');

const auditoriaSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    actorEmail: {
        type: String,
        trim: true,
        maxlength: 254,
        default: '',
    },
    accion: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    entidad: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60,
        index: true,
    },
    entidadId: {
        type: String,
        trim: true,
        maxlength: 80,
        default: '',
    },
    detalle: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});

auditoriaSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Auditoria || mongoose.model('Auditoria', auditoriaSchema);
