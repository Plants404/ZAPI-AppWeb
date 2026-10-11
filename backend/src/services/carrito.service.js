'use strict';
/* ==========================================================
   SERVICIO: CARRITO
   ------------------------------------------------------------
   Un carrito por sesion, con las lineas embebidas en un solo
   documento, y _id = id de sesion. No hay transaccion porque
   todas las escrituras tocan un unico documento: Mongo las hace
   atomicas aunque sean de varias lineas.

   El agregado suma cantidades sin pasarse de 99, igual que el
   backend anterior. La linea guarda solo producto_id y cantidad:
   nombres y precios se leen del catalogo en cada lectura.
   ========================================================== */

const { Carrito } = require('../models/carrito.model');
const { Producto } = require('../models/producto.model');
const { Stock } = require('../models/stock.model');
const { LIMITE_CANTIDAD } = require('../constants');

function redondear(numero) {
    return Math.round(numero * 100) / 100;
}

/* Suma la cantidad a la linea que ya existe, o crea la linea si
   no existe. Las dos cosas se resuelven con writes sobre un solo
   documento. */
async function agregar(sesion, productoId, cantidad) {
    const cap = Math.min(cantidad, LIMITE_CANTIDAD);
    const ahora = new Date();

    /* Con pipeline update para poder topar la suma con $min, que
       un $inc simple desbordaria sin aviso. */
    const resultado = await Carrito.updateOne(
        { _id: sesion, 'items.producto_id': productoId },
        [
            {
                $set: {
                    items: {
                        $map: {
                            input: '$items',
                            as: 'item',
                            in: {
                                $cond: [
                                    { $eq: ['$$item.producto_id', productoId] },
                                    {
                                        producto_id: productoId,
                                        cantidad: {
                                            $min: [
                                                { $add: ['$$item.cantidad', cap] },
                                                LIMITE_CANTIDAD,
                                            ],
                                        },
                                    },
                                    '$$item',
                                ],
                            },
                        },
                    },
                    actualizado: ahora,
                },
            },
        ],
        { updatePipeline: true }
    );

    /* No habia carrito ni linea: se crea el documento con la
       linea puesta. Un solo write, asi que tampoco hay partial. */
    if (resultado.matchedCount === 0) {
        await Carrito.updateOne(
            { _id: sesion },
            {
                $push: { items: { producto_id: productoId, cantidad: cap } },
                $setOnInsert: { creado: ahora },
                $set: { actualizado: ahora },
            },
            { upsert: true }
        );
    }
}

/* Cambia la cantidad de una linea. Con 0 (o menos) la borra: es
   la misma operacion que usa DELETE, vestida de UPDATE. */
async function fijar(sesion, productoId, cantidad) {
    const ahora = new Date();

    if (cantidad <= 0) {
        await Carrito.updateOne(
            { _id: sesion },
            { $pull: { items: { producto_id: productoId } }, $set: { actualizado: ahora } }
        );

        return;
    }

    await Carrito.updateOne(
        { _id: sesion },
        { $set: { 'items.$[l].cantidad': Math.min(cantidad, LIMITE_CANTIDAD), actualizado: ahora } },
        { arrayFilters: [{ 'l.producto_id': productoId }] }
    );
}

function quitar(sesion, productoId) {
    return fijar(sesion, productoId, 0);
}

/* Despues de un pedido el carrito se vacia de verdad. */
async function vaciar(sesion) {
    await Carrito.deleteOne({ _id: sesion });
}

/* El carrito ARMADO: cada linea lleva el nombre y el precio del
   catalogo de hoy, el stock actual y el subtotal. Las lineas
   que apuntan a un producto inactivo se caen solas. */
async function armar(sesion) {
    const carrito = await Carrito.findOne({ _id: sesion }).lean();

    if (!carrito || carrito.items.length === 0) {
        return { items: [], total: 0 };
    }

    const ids = [...new Set(carrito.items.map(i => i.producto_id))];

    const productos = await Producto.find({ _id: { $in: ids }, activo: true }).lean();
    const porId = new Map(productos.map(p => [p._id, p]));

    const stock = await Stock.find({ producto_id: { $in: ids } }).lean();
    const stockPorId = new Map(stock.map(s => [s.producto_id, s.unidades]));

    const items = carrito.items
        .map(item => {
            const producto = porId.get(item.producto_id);

            if (!producto) return null;

            const disponibles = stockPorId.has(item.producto_id)
                ? stockPorId.get(item.producto_id)
                : null;
            const subtotal = redondear(producto.precio * item.cantidad);

            return {
                id: producto._id,
                nombre: producto.nombre,
                slug: producto.slug,
                precio: producto.precio,
                cantidad: item.cantidad,
                subtotal,
                disponibles,
                /* Se marca pero no se corrige en silencio: bajar la
                   cantidad solo cambiaria el precio que el cliente
                   estaba mirando. Se avisa y que decida el. */
                problema: disponibles !== null && disponibles < item.cantidad,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const total = redondear(items.reduce((suma, item) => suma + item.precio * item.cantidad, 0));

    return { items, total };
}

module.exports = { armar, agregar, fijar, quitar, vaciar };