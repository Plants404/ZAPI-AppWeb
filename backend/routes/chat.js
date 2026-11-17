'use strict';

/* Ruta del chat con IA ("Brotecito") con límite de uso. */

const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { validarMensajes, armarInstrucciones, consultarGemini, MODELO_POR_DEFECTO } = require('../lib/chat.js');
const { NEGOCIO } = require('../compartido/negocio.js');

function crearRouter(getDatabase, { consultar = consultarGemini } = {}) {
    const router = express.Router();

    router.post('/chat', async (req, res) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpError(503, 'El asistente con IA no está disponible.');

        const mensajes = validarMensajes(req.body);
        const productos = await getDatabase().collection('products')
            .find({ active: true }, { projection: { _id: 0, nombre: 1, categoria: 1, precioBase: 1, stock: 1, descripcion: 1, infoDeVenta: 1 } })
            .sort({ id: 1 })
            .toArray();

        const respuesta = await consultar({
            apiKey,
            modelo: process.env.GEMINI_MODEL || MODELO_POR_DEFECTO,
            instrucciones: armarInstrucciones(productos, NEGOCIO),
            mensajes
        });

        res.json({ respuesta });
    });

    return router;
}

module.exports = { crearRouter };
