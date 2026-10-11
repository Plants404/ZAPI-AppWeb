'use strict';
/* ==========================================================
   CONTROLADOR: PRODUCTOS
   ------------------------------------------------------------
   Catalogo con el stock pegado. La ficha soporta el id numerico
   y el slug: por la API suele llegar el numero, pero el front
   puede engancharse por el mismo slug de la ficha estatica.
   ========================================================== */

const { productosConStock, verProducto } = require('../services/catalogo.service');

async function listar(req, res, next) {
    try {
        res.json({ productos: await productosConStock() });
    } catch (error) {
        next(error);
    }
}

async function ver(req, res, next) {
    try {
        const producto = await verProducto(req.params.id);

        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ producto });
    } catch (error) {
        next(error);
    }
}

module.exports = { listar, ver };