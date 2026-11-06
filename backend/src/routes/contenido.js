'use strict';

const express = require('express');
const Contenido = require('../models/Contenido');
const { contenidoCompleto } = require('../utils/contenido');

function createContenidoPublicoRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const secciones = await Contenido.find().lean();
            return response.status(200).json({ contenido: contenidoCompleto(secciones) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createContenidoPublicoRouter };
