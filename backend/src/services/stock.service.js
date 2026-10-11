'use strict';
/* ==========================================================
   SERVICIO: STOCK
   ------------------------------------------------------------
   El stock se escribe a mano desde la administracion, asi que
   este es el unico camino para cambiarlo. Si llega null es "sin
   datos" y no "agotado".
   ========================================================== */

const { Stock } = require('../models/stock.model');

/* Guarda o cambia el stock de un producto. */
async function poner(productoId, unidades) {
    await Stock.updateOne(
        { producto_id: productoId },
        { $set: { unidades, actualizado: new Date() } },
        { upsert: true }
    );
}

/* El stock de todo el catalogo, en un mapa { id: unidades }:
   facil de leer para el front, y null viaja como "sin datos". */
async function verTodo() {
    const filas = await Stock.find().lean();
    const stock = {};

    for (const fila of filas) {
        stock[fila.producto_id] = fila.unidades;
    }

    return stock;
}

module.exports = { poner, verTodo };