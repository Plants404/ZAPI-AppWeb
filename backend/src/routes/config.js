'use strict';

const express = require('express');
const Contenido = require('../models/Contenido');
const { CONTENIDO_POR_DEFECTO } = require('../data/contenido');

function createConfigRouter(config) {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const guardado = await Contenido.findOne({ clave: 'negocio' }).lean();
            const negocio = guardado && guardado.valor ? guardado.valor : CONTENIDO_POR_DEFECTO.negocio;

            return response.status(200).json({
                requiereCuenta: true,
                registroAbierto: config.registroPublico,
                envioGratis: config.envioGratis,
                moneda: config.moneda,
                maxItemsPorPedido: config.maxItemsPorPedido,
                negocio: {
                    nombre: negocio.nombre,
                    descripcion: negocio.descripcion,
                    whatsapp: negocio.whatsapp,
                    whatsappVisible: negocio.whatsappVisible,
                    email: negocio.email,
                    direccion: negocio.direccion,
                    horario: negocio.horario,
                    sitio: negocio.sitio,
                },
            });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createConfigRouter };
