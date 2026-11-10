'use strict';

const express = require('express');
const { HttpError } = require('../lib/http-error.js');

function crearRouter(getDatabase) {
    const router = express.Router();
    const camposPublicos = {
        _id: 0,
        id: 1,
        nombre: 1,
        slug: 1,
        categoria: 1,
        imagen: 1,
        imagenes: 1,
        descripcion: 1,
        precioBase: 1,
        stock: 1,
        destacado: 1,
        infoDeVenta: 1
    };

    router.get('/', async (req, res) => {
        const productos = await getDatabase().collection('products')
            .find({ active: true }, { projection: camposPublicos })
            .sort({ id: 1 })
            .toArray();

        res.json({ products: productos });
    });

    router.get('/:slug', async (req, res) => {
        const producto = await getDatabase().collection('products').findOne(
            { slug: req.params.slug, active: true },
            { projection: camposPublicos }
        );

        if (!producto) throw new HttpError(404, 'No se encontró el producto.');
        res.json({ product: producto });
    });

    return router;
}

module.exports = { crearRouter };
