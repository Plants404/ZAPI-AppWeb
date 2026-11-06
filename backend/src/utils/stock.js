'use strict';

const MovimientoStock = require('../models/MovimientoStock');
const Producto = require('../models/Producto');
const { ErrorHttp } = require('./ErrorHttp');

async function descontarStock(items, { session, orden, usuario, tipo = 'venta', motivo = '' }) {
    const movimientos = [];

    for (const item of items) {
        const actualizado = await Producto.findOneAndUpdate(
            { _id: item.producto._id, stock: { $gte: item.cantidad } },
            { $inc: { stock: -item.cantidad } },
            { returnDocument: 'after', session }
        );

        if (!actualizado) {
            throw new ErrorHttp(
                409,
                `No hay stock suficiente de ${item.nombre}.`,
                'items'
            );
        }

        movimientos.push({
            producto: item.producto._id,
            productoId: item.productoId,
            tipo,
            cantidad: item.cantidad,
            stockAnterior: actualizado.stock + item.cantidad,
            stockNuevo: actualizado.stock,
            motivo: motivo || `Venta ${orden.codigo}`,
            orden: orden._id,
            usuario: usuario ? usuario._id : null,
        });
    }

    if (movimientos.length) {
        await MovimientoStock.insertMany(movimientos, { session });
    }

    return movimientos;
}

async function reponerStock(items, { session, orden, usuario, tipo = 'cancelacion', motivo = '' }) {
    const movimientos = [];

    for (const item of items) {
        const actualizado = await Producto.findOneAndUpdate(
            { _id: item.producto },
            { $inc: { stock: item.cantidad } },
            { returnDocument: 'after', session }
        );

        if (!actualizado) continue;

        movimientos.push({
            producto: item.producto,
            productoId: item.productoId,
            tipo,
            cantidad: item.cantidad,
            stockAnterior: actualizado.stock - item.cantidad,
            stockNuevo: actualizado.stock,
            motivo: motivo || `Reposición ${orden.codigo}`,
            orden: orden._id,
            usuario: usuario ? usuario._id : null,
        });
    }

    if (movimientos.length) {
        await MovimientoStock.insertMany(movimientos, { session });
    }

    return movimientos;
}

async function registrarMovimientoManual({
    producto,
    tipo,
    cantidad,
    stockNuevo,
    motivo,
    usuario,
    session,
}) {
    let actualizado;
    let cantidadRegistrada;

    if (tipo === 'ajuste') {
        if (!Number.isSafeInteger(stockNuevo) || stockNuevo < 0) {
            throw new ErrorHttp(400, 'El stock nuevo debe ser un entero no negativo.', 'stockNuevo');
        }

        cantidadRegistrada = stockNuevo - producto.stock;

        if (cantidadRegistrada === 0) {
            throw new ErrorHttp(400, 'El stock nuevo es igual al actual.', 'stockNuevo');
        }

        actualizado = await Producto.findOneAndUpdate(
            { _id: producto._id },
            { $set: { stock: stockNuevo } },
            { returnDocument: 'after', session }
        );
    } else {
        if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
            throw new ErrorHttp(400, 'La cantidad debe ser un entero mayor a cero.', 'cantidad');
        }

        const delta = tipo === 'entrada' ? cantidad : -cantidad;

        if (producto.stock + delta < 0) {
            throw new ErrorHttp(400, 'La merma supera el stock disponible.', 'cantidad');
        }

        cantidadRegistrada = delta;
        actualizado = await Producto.findOneAndUpdate(
            { _id: producto._id, stock: { $gte: tipo === 'merma' ? cantidad : 0 } },
            { $inc: { stock: delta } },
            { returnDocument: 'after', session }
        );

        if (!actualizado) throw new ErrorHttp(409, 'No hay stock suficiente para registrar la merma.', 'cantidad');
    }

    const [movimiento] = await MovimientoStock.create([{
        producto: producto._id,
        productoId: producto.productoId,
        tipo,
        cantidad: cantidadRegistrada,
        stockAnterior: actualizado.stock - cantidadRegistrada,
        stockNuevo: actualizado.stock,
        motivo,
        usuario: usuario ? usuario._id : null,
    }], session ? { session } : {});

    return { producto: actualizado, movimiento };
}

module.exports = { descontarStock, registrarMovimientoManual, reponerStock };
