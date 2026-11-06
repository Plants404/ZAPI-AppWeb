'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const Orden = require('../models/Orden');
const Producto = require('../models/Producto');
const { ErrorHttp } = require('./ErrorHttp');
const { descontarStock, reponerStock } = require('./stock');
const { redondear } = require('./validacion');

const METODOS_PAGO = ['efectivo', 'debito', 'credito', 'transferencia', 'online'];
const ESTADOS = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];

function generarCodigoOrden(canal) {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sufijo = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `ZAPI-${canal === 'presencial' ? 'L' : 'W'}-${fecha}-${sufijo}`;
}

function ordenPublica(orden) {
    return {
        id: String(orden._id),
        codigo: orden.codigo,
        canal: orden.canal,
        estado: orden.estado,
        creado: orden.createdAt,
        actualizado: orden.updatedAt,
        subtotal: orden.subtotal,
        descuento: orden.descuento,
        total: orden.total,
        moneda: orden.moneda,
        metodoPago: orden.metodoPago,
        envioPendiente: orden.envioPendiente,
        zona: orden.zona,
        notas: orden.notas,
        motivoCancelacion: orden.motivoCancelacion,
        contacto: orden.contacto,
        items: orden.items.map(item => ({
            productoId: item.productoId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
            costo: item.costo,
        })),
    };
}

function ordenAdmin(orden) {
    return {
        ...ordenPublica(orden),
        cliente: orden.cliente && typeof orden.cliente === 'object'
            ? {
                id: String(orden.cliente._id),
                nombre: orden.cliente.nombre,
                email: orden.cliente.email,
            }
            : orden.cliente
                ? String(orden.cliente)
                : null,
        notasInternas: orden.notasInternas,
        stockRepuesto: orden.stockRepuesto,
        creadoPor: orden.creadoPor && typeof orden.creadoPor === 'object'
            ? {
                id: String(orden.creadoPor._id),
                nombre: orden.creadoPor.nombre,
                email: orden.creadoPor.email,
            }
            : orden.creadoPor
                ? String(orden.creadoPor)
                : null,
        margen: orden.items.reduce(
            (suma, item) => suma + (item.precio - item.costo) * item.cantidad,
            0
        ),
    };
}

async function cargarProductosParaOrden(items, session) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ErrorHttp(400, 'La orden debe incluir al menos un producto.', 'items');
    }

    const pedidos = new Map();

    for (const item of items) {
        const productoId = Number(item && item.productoId);
        const cantidad = Number(item && item.cantidad);

        if (!Number.isSafeInteger(productoId) || productoId < 1
            || !Number.isSafeInteger(cantidad) || cantidad < 1) {
            throw new ErrorHttp(400, 'Cada producto debe tener un ID y una cantidad entera válida.', 'items');
        }

        pedidos.set(productoId, (pedidos.get(productoId) || 0) + cantidad);
    }

    const productos = await Producto.find({
        productoId: { $in: [...pedidos.keys()] },
        activo: true,
    }).session(session || null).lean();

    if (productos.length !== pedidos.size) {
        throw new ErrorHttp(409, 'Alguno de los productos ya no está disponible.', 'items');
    }

    const porId = new Map(productos.map(producto => [producto.productoId, producto]));
    const faltantes = [];

    for (const [productoId, cantidad] of pedidos) {
        const producto = porId.get(productoId);

        if (!producto || producto.stock < cantidad) {
            faltantes.push({
                productoId,
                nombre: producto ? producto.nombre : 'Producto desconocido',
                disponibles: producto ? producto.stock : 0,
                solicitados: cantidad,
            });
        }
    }

    if (faltantes.length) {
        const error = new ErrorHttp(409, 'No hay stock suficiente para algunos productos.', 'items');
        error.detalle = { faltantes };
        throw error;
    }

    return [...pedidos.entries()].map(([productoId, cantidad]) => {
        const producto = porId.get(productoId);

        return {
            producto,
            productoId,
            nombre: producto.nombre,
            cantidad,
            precio: producto.precio,
            costo: producto.costo,
        };
    });
}

async function crearOrden({
    canal,
    items,
    contacto,
    cliente = null,
    creadoPor = null,
    metodoPago,
    descuento = 0,
    zona = null,
    notas = null,
    notasInternas = null,
    envioGratis,
    usuario,
}) {
    if (!['online', 'presencial'].includes(canal)) {
        throw new ErrorHttp(400, 'El canal de la orden es inválido.', 'canal');
    }

    if (!METODOS_PAGO.includes(metodoPago)) {
        throw new ErrorHttp(400, 'El método de pago es inválido.', 'metodoPago');
    }

    const session = await mongoose.startSession();

    try {
        let orden;

        for (let intento = 0; intento < 5 && !orden; intento++) {
            try {
                await session.withTransaction(async () => {
                    const lineas = await cargarProductosParaOrden(items, session);
                    const subtotal = redondear(lineas.reduce(
                        (suma, linea) => suma + linea.precio * linea.cantidad,
                        0
                    ));
                    const descuentoFinal = canal === 'presencial'
                        ? redondear(Math.min(subtotal, Math.max(0, Number(descuento) || 0)))
                        : 0;
                    const total = redondear(subtotal - descuentoFinal);
                    const envioPendiente = canal === 'online' && subtotal < envioGratis;
                    const codigo = generarCodigoOrden(canal);

                    const [creada] = await Orden.create([{
                        codigo,
                        canal,
                        cliente: cliente ? cliente._id || cliente : null,
                        contacto,
                        items: lineas.map(linea => ({
                            producto: linea.producto._id,
                            productoId: linea.productoId,
                            nombre: linea.nombre,
                            cantidad: linea.cantidad,
                            precio: linea.precio,
                            costo: linea.costo,
                        })),
                        subtotal,
                        descuento: descuentoFinal,
                        total,
                        moneda: 'UYU',
                        metodoPago,
                        estado: canal === 'presencial' ? 'entregado' : 'pendiente',
                        envioPendiente,
                        zona,
                        notas,
                        notasInternas,
                        creadoPor: creadoPor ? creadoPor._id || creadoPor : null,
                    }], { session });

                    await descontarStock(lineas, {
                        session,
                        orden: creada,
                        usuario: usuario || creadoPor || cliente,
                        tipo: 'venta',
                        motivo: `Venta ${creada.codigo}`,
                    });

                    orden = creada;
                });
            } catch (error) {
                if (error && error.code === 11000 && intento < 4) continue;
                throw error;
            }
        }

        return orden;
    } finally {
        await session.endSession();
    }
}

async function cancelarOrden(ordenId, {
    motivo,
    usuario,
    soloPendiente = false,
    cliente = null,
    canal = null,
}) {
    const session = await mongoose.startSession();

    try {
        let ordenCancelada;

        await session.withTransaction(async () => {
            const filtro = {
                _id: ordenId,
                estado: soloPendiente ? 'pendiente' : { $ne: 'cancelado' },
                stockRepuesto: false,
            };

            if (cliente) filtro.cliente = cliente._id || cliente;
            if (canal) filtro.canal = canal;

            const orden = await Orden.findOneAndUpdate(
                filtro,
                {
                    $set: {
                        estado: 'cancelado',
                        motivoCancelacion: motivo,
                        stockRepuesto: true,
                    },
                },
                { returnDocument: 'after', session }
            );

            if (!orden) {
                throw new ErrorHttp(
                    soloPendiente ? 409 : 404,
                    soloPendiente
                        ? 'Solo podés cancelar pedidos pendientes.'
                        : 'La orden no existe o ya fue cancelada.'
                );
            }

            await reponerStock(orden.items, {
                session,
                orden,
                usuario,
                tipo: orden.canal === 'presencial' ? 'anulacion' : 'cancelacion',
                motivo: motivo || `Cancelación ${orden.codigo}`,
            });

            ordenCancelada = orden;
        });

        return ordenCancelada;
    } finally {
        await session.endSession();
    }
}

module.exports = {
    ESTADOS,
    METODOS_PAGO,
    cancelarOrden,
    crearOrden,
    generarCodigoOrden,
    ordenAdmin,
    ordenPublica,
};
