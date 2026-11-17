'use strict';

const { randomUUID } = require('node:crypto');
const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { validarPedido } = require('../lib/validation.js');
const { requerirAdmin, requerirSesion } = require('../lib/auth.js');
const { registrarAuditoria } = require('../lib/auditoria.js');
const { NEGOCIO } = require('../compartido/negocio.js');

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'];
const CANAL_WEB = 'web';
const CANAL_PRESENCIAL = 'presencial';

function historialInicial(usuario) {
    return [{
        estado: 'pendiente',
        fecha: new Date(),
        usuario: usuario && usuario.id ? usuario.id : 'sistema',
        email: usuario && usuario.email ? usuario.email : '',
        resumen: 'Pedido creado'
    }];
}

/* Función compartida de creación de pedidos. La usa la venta web (carrito) y
   la venta presencial (admin). No duplica código entre canales. */
async function crearPedido(db, { cliente, cantidades, canal, usuario }) {
    const productos = await db.collection('products')
        .find({ id: { $in: [...cantidades.keys()] }, active: true })
        .toArray();
    const porId = new Map(productos.map(producto => [producto.id, producto]));

    const lineas = [];
    const descontados = []; // { id, cantidad } para rollback si algo falla

    for (const [id, cantidad] of cantidades) {
        const producto = porId.get(id);
        if (!producto) {
            await restaurarStock(db, descontados);
            throw new HttpError(409, 'Un producto del pedido ya no está disponible.');
        }

        const resultado = await db.collection('products').findOneAndUpdate(
            { id, active: true, stock: { $gte: cantidad } },
            { $inc: { stock: -cantidad } },
            { returnDocument: 'after' }
        );

        if (!resultado) {
            await restaurarStock(db, descontados);
            throw new HttpError(409, `No hay stock suficiente de ${producto.nombre}.`);
        }

        descontados.push({ id, cantidad });
        lineas.push({
            id: producto.id,
            slug: producto.slug,
            nombre: producto.nombre,
            precio: producto.precioBase,
            cantidad
        });
    }

    const subtotal = lineas.reduce((total, linea) => total + linea.precio * linea.cantidad, 0);
    const envio = subtotal >= NEGOCIO.envioGratis ? 0 : null;
    const ahora = new Date();
    const pedido = {
        id: `ZAPI-${randomUUID()}`,
        fecha: ahora,
        estado: 'pendiente',
        canal,
        cliente,
        lineas,
        subtotal,
        envio,
        total: subtotal + (envio || 0),
        historial: historialInicial(usuario)
    };

    try {
        await db.collection('orders').insertOne(pedido);
    } catch (error) {
        await restaurarStock(db, descontados);
        throw error;
    }

    if (usuario) {
        await registrarAuditoria(db, usuario, 'pedido.crear', null, {
            id: pedido.id,
            canal,
            estado: pedido.estado,
            total: pedido.total
        }, `Pedido ${pedido.id} creado (${canal}) por $${pedido.total}`);
    }

    return pedido;
}

async function restaurarStock(db, descontados) {
    for (const { id, cantidad } of descontados) {
        await db.collection('products').findOneAndUpdate(
            { id, active: true },
            { $inc: { stock: cantidad } }
        );
    }
}

function crearRouter(getDatabase) {
    const router = express.Router();

    /* Venta web: exige cliente con sesión iniciada. Canal 'web'. */
    router.post('/', requerirSesion(getDatabase), async (req, res) => {
        const { cliente, cantidades } = validarPedido(req.body);
        const pedido = await crearPedido(getDatabase(), {
            cliente,
            cantidades,
            canal: CANAL_WEB,
            usuario: req.usuario
        });
        res.status(201).json({ order: pedido });
    });

    return router;
}

function crearRouterAdmin(getDatabase) {
    const router = express.Router();

    /* Venta presencial: reutiliza la misma función de creación de pedidos,
       con canal 'presencial'. No duplica código. */
    router.post('/pedidos/presencial', requerirAdmin(getDatabase), async (req, res) => {
        const { cliente, cantidades } = validarPedido(req.body);
        const pedido = await crearPedido(getDatabase(), {
            cliente,
            cantidades,
            canal: CANAL_PRESENCIAL,
            usuario: req.usuario
        });
        res.status(201).json({ order: pedido });
    });

    /* Cambiar estado de un pedido con historial.
       Cancelar devuelve el stock de forma atómica. */
    router.patch('/pedidos/:id/estado', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const { id } = req.params;
        const { estado } = req.body || {};

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            throw new HttpError(400, 'Estado no válido.');
        }

        const pedido = await db.collection('orders').findOne({ id });
        if (!pedido) throw new HttpError(404, 'Pedido no encontrado.');

        const transiciones = {
            pendiente: ['confirmado', 'cancelado'],
            confirmado: ['entregado', 'cancelado'],
            entregado: [],
            cancelado: []
        };
        if (!transiciones[pedido.estado] || !transiciones[pedido.estado].includes(estado)) {
            throw new HttpError(409, 'La transición de estado no está permitida.');
        }

        const antes = {
            estado: pedido.estado,
            stockLineas: (pedido.lineas || []).map(l => ({ id: l.id, cantidad: l.cantidad }))
        };
        const entradaHistorial = {
            estado,
            fecha: new Date(),
            usuario: req.usuario.id,
            email: req.usuario.email,
            resumen: `Estado cambiado a ${estado}`
        };

        const resultado = await db.collection('orders').findOneAndUpdate(
            { id, estado: pedido.estado },
            {
                $set: { estado },
                $push: { historial: entradaHistorial }
            },
            { returnDocument: 'after' }
        );
        if (!resultado) {
            throw new HttpError(409, 'El pedido cambió mientras se procesaba la solicitud.');
        }

        if (estado === 'cancelado') {
            for (const linea of (resultado.lineas || [])) {
                await db.collection('products').findOneAndUpdate(
                    { id: linea.id },
                    { $inc: { stock: linea.cantidad } }
                );
            }
        }

        const despues = {
            estado: resultado.estado,
            stockLineas: (resultado.lineas || []).map(l => ({ id: l.id, cantidad: l.cantidad }))
        };

        await registrarAuditoria(db, req.usuario, 'pedido.estado', antes, despues,
            `Pedido ${id}: ${antes.estado} → ${estado}`);

        res.json({ order: resultado });
    });

    return router;
}

module.exports = { crearRouter, crearRouterAdmin };
