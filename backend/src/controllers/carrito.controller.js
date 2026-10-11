'use strict';
/* ==========================================================
   CONTROLADOR: CARRITO
   ------------------------------------------------------------
   Contrato (igual que el backend anterior):
     GET    /api/carrito      el carrito armado de la sesion
     POST   /api/carrito      agregar un producto (cantidad opcional, 1)
     PATCH  /api/carrito/:id  fijar la cantidad
     DELETE /api/carrito/:id  sacar el producto

   El carrito vive en la cookie de sesion; el controlador solo
   traduce HTTP, la logica esta en el servicio.
   ========================================================== */

const carrito = require('../services/carrito.service');
const { verProducto } = require('../services/catalogo.service');
const { cantidadSegura, idNumerico } = require('../utils/numero');

async function ver(req, res, next) {
    try {
        res.json(await carrito.armar(req.sesion));
    } catch (error) {
        next(error);
    }
}

/* POST /api/carrito { id, cantidad? } ->  La linea se agrega por
   el id que viene en el cuerpo. Si no viene cantidad, "agregar"
   significa 1. El producto tiene que existir en el catalogo. */
async function agregar(req, res, next) {
    try {
        const productoId = idNumerico(req.body && req.body.id);

        if (productoId === null) {
            return res.status(400).json({ error: 'Producto inválido' });
        }

        const existe = await verProducto(String(productoId));

        if (!existe) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const cantidad = cantidadSegura(
            req.body && 'cantidad' in req.body ? req.body.cantidad : 1
        );

        if (cantidad === null) {
            return res.status(400).json({ error: 'Cantidad inválida' });
        }

        await carrito.agregar(req.sesion, productoId, cantidad);

        res.status(201).json({ ok: true });
    } catch (error) {
        next(error);
    }
}

async function fijar(req, res, next) {
    try {
        const productoId = idNumerico(req.params.id);

        if (productoId === null) {
            return res.status(400).json({ error: 'Producto inválido' });
        }

        const existe = await verProducto(String(productoId));

        if (!existe) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        /* PATCH con cantidad invalida (incluida 0) se rechaza:
           para sacar el producto existe DELETE. */
        const cantidad = cantidadSegura(req.body && req.body.cantidad);

        if (cantidad === null) {
            return res.status(400).json({ error: 'Cantidad inválida' });
        }

        await carrito.fijar(req.sesion, productoId, cantidad);

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
}

async function quitar(req, res, next) {
    try {
        const productoId = idNumerico(req.params.id);

        if (productoId === null) {
            return res.status(400).json({ error: 'Producto inválido' });
        }

        await carrito.quitar(req.sesion, productoId);

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
}

module.exports = { ver, agregar, fijar, quitar };