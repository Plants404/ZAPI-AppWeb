'use strict';

const express = require('express');
const Producto = require('../models/Producto');
const { productoPublico } = require('../utils/catalogo');
const { escaparRegex, texto } = require('../utils/validacion');

function createCatalogoRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const filtro = { activo: true };
            const categoria = texto(request.query.categoria);
            const busqueda = texto(request.query.q);

            if (categoria) filtro.categoria = categoria;

            if (busqueda) {
                const patron = new RegExp(escaparRegex(busqueda), 'i');
                filtro.$or = [
                    { nombre: patron },
                    { descripcion: patron },
                    { categoria: patron },
                    { infoDeVenta: patron },
                ];
            }

            if (request.query.destacado === '1' || request.query.destacado === 'true') {
                filtro.destacado = true;
            }

            const [productos, categorias] = await Promise.all([
                Producto.find(filtro).sort({ destacado: -1, nombre: 1 }).limit(200).lean(),
                Producto.distinct('categoria', { activo: true }),
            ]);

            return response.status(200).json({
                productos: productos.map(productoPublico),
                categorias: categorias.sort((a, b) => a.localeCompare(b, 'es')),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/:slug', async (request, response, next) => {
        try {
            const slug = texto(request.params.slug).toLowerCase();
            const producto = await Producto.findOne({ slug, activo: true }).lean();

            if (!producto) {
                return response.status(404).json({ error: 'Producto no encontrado.' });
            }

            return response.status(200).json({ producto: productoPublico(producto) });
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createCatalogoRouter };
