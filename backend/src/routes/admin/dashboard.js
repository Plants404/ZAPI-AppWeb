'use strict';

const express = require('express');
const Orden = require('../../models/Orden');
const Producto = require('../../models/Producto');
const Testimonio = require('../../models/Testimonio');
const User = require('../../models/User');
const { ordenAdmin } = require('../../utils/ordenes');
const { parseFecha } = require('../../utils/validacion');

const ZONA_HORARIA = 'America/Montevideo';
const MAX_DIAS = 366;

function claveFecha(fecha) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(fecha);
}

function inicioDelDia(fecha = new Date()) {
    const copia = new Date(fecha);
    copia.setHours(0, 0, 0, 0);
    return copia;
}

function inicioDeSemana(fecha = new Date()) {
    const copia = inicioDelDia(fecha);
    const dia = copia.getDay();
    copia.setDate(copia.getDate() - (dia === 0 ? 6 : dia - 1));
    return copia;
}

function inicioDeMes(fecha = new Date()) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function rangoSeleccionado(query) {
    const ahora = new Date();
    let desde = parseFecha(query.desde);
    let hasta = parseFecha(query.hasta, true);

    if (!desde && !hasta) {
        desde = inicioDeMes(ahora);
        hasta = ahora;
    } else {
        desde = desde || inicioDeMes(ahora);
        hasta = hasta || ahora;
    }

    if (hasta < desde) [desde, hasta] = [hasta, desde];

    const duracion = hasta.getTime() - desde.getTime();
    const dias = Math.max(1, Math.ceil(duracion / 86400000) + 1);

    if (dias > MAX_DIAS) {
        desde = new Date(hasta.getTime() - (MAX_DIAS - 1) * 86400000);
    }

    const desdeAnterior = new Date(desde.getTime() - duracion - 1);
    const hastaAnterior = new Date(desde.getTime() - 1);

    return { desde, hasta, desdeAnterior, hastaAnterior };
}

function matchVentas(desde, hasta, extra = {}) {
    return {
        createdAt: { $gte: desde, $lte: hasta },
        estado: { $ne: 'cancelado' },
        ...extra,
    };
}

async function resumenPeriodo(desde, hasta) {
    const filas = await Orden.aggregate([
        { $match: matchVentas(desde, hasta) },
        {
            $project: {
                canal: 1,
                total: 1,
                margen: {
                    $reduce: {
                        input: '$items',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                { $multiply: [{ $subtract: ['$$this.precio', '$$this.costo'] }, '$$this.cantidad'] },
                            ],
                        },
                    },
                },
            },
        },
        {
            $group: {
                _id: '$canal',
                ingresos: { $sum: '$total' },
                ventas: { $sum: 1 },
                margen: { $sum: '$margen' },
            },
        },
    ]);

    const salida = {
        online: { ingresos: 0, ventas: 0, margen: 0 },
        presencial: { ingresos: 0, ventas: 0, margen: 0 },
        total: { ingresos: 0, ventas: 0, margen: 0, ticketPromedio: 0 },
    };

    for (const fila of filas) {
        if (!salida[fila._id]) continue;
        salida[fila._id] = {
            ingresos: Math.round(fila.ingresos * 100) / 100,
            ventas: fila.ventas,
            margen: Math.round(fila.margen * 100) / 100,
        };
    }

    salida.total = {
        ingresos: Math.round((salida.online.ingresos + salida.presencial.ingresos) * 100) / 100,
        ventas: salida.online.ventas + salida.presencial.ventas,
        margen: Math.round((salida.online.margen + salida.presencial.margen) * 100) / 100,
    };
    salida.total.ticketPromedio = salida.total.ventas
        ? Math.round((salida.total.ingresos / salida.total.ventas) * 100) / 100
        : 0;

    return salida;
}

function variacion(actual, anterior) {
    if (!anterior) return actual > 0 ? 100 : 0;
    return Math.round(((actual - anterior) / anterior) * 10000) / 100;
}

async function ventasPorDia(desde, hasta) {
    const filas = await Orden.aggregate([
        { $match: matchVentas(desde, hasta) },
        {
            $group: {
                _id: {
                    fecha: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: ZONA_HORARIA } },
                    canal: '$canal',
                },
                ingresos: { $sum: '$total' },
                ventas: { $sum: 1 },
            },
        },
        { $sort: { '_id.fecha': 1 } },
    ]);

    const mapa = new Map();
    const cursor = new Date(desde);

    while (cursor <= hasta) {
        const clave = claveFecha(cursor);
        mapa.set(clave, {
            fecha: clave,
            online: { ingresos: 0, ventas: 0 },
            presencial: { ingresos: 0, ventas: 0 },
            total: { ingresos: 0, ventas: 0 },
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    for (const fila of filas) {
        const dia = mapa.get(fila._id.fecha);
        if (!dia || !dia[fila._id.canal]) continue;
        dia[fila._id.canal] = {
            ingresos: Math.round(fila.ingresos * 100) / 100,
            ventas: fila.ventas,
        };
        dia.total.ingresos = Math.round((dia.online.ingresos + dia.presencial.ingresos) * 100) / 100;
        dia.total.ventas = dia.online.ventas + dia.presencial.ventas;
    }

    return [...mapa.values()];
}

function createDashboardRouter() {
    const router = express.Router();

    router.get('/', async (request, response, next) => {
        try {
            const { desde, hasta, desdeAnterior, hastaAnterior } = rangoSeleccionado(request.query);
            const ahora = new Date();

            const [
                periodo,
                anterior,
                porDia,
                metodosPago,
                topProductos,
                stockBajo,
                pendientes,
                pendientesLista,
                clientesNuevos,
                testimoniosPendientes,
                resumenDia,
                resumenSemana,
                resumenMes,
            ] = await Promise.all([
                resumenPeriodo(desde, hasta),
                resumenPeriodo(desdeAnterior, hastaAnterior),
                ventasPorDia(desde, hasta),
                Orden.aggregate([
                    { $match: matchVentas(desde, hasta) },
                    { $group: { _id: '$metodoPago', total: { $sum: '$total' }, ventas: { $sum: 1 } } },
                    { $sort: { total: -1 } },
                ]),
                Orden.aggregate([
                    { $match: matchVentas(desde, hasta) },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: { productoId: '$items.productoId', nombre: '$items.nombre' },
                            cantidad: { $sum: '$items.cantidad' },
                            ingresos: { $sum: { $multiply: ['$items.precio', '$items.cantidad'] } },
                            margen: {
                                $sum: {
                                    $multiply: [
                                        { $subtract: ['$items.precio', '$items.costo'] },
                                        '$items.cantidad',
                                    ],
                                },
                            },
                        },
                    },
                    { $sort: { cantidad: -1, ingresos: -1 } },
                    { $limit: 10 },
                ]),
                Producto.find({
                    activo: true,
                    $expr: { $lte: ['$stock', '$stockMinimo'] },
                }).sort({ stock: 1, nombre: 1 }).limit(20).lean(),
                Orden.countDocuments({ estado: 'pendiente' }),
                Orden.find({ estado: 'pendiente' }).sort({ createdAt: 1 }).limit(6).lean(),
                User.countDocuments({
                    role: 'cliente',
                    createdAt: { $gte: desde, $lte: hasta },
                }),
                Testimonio.countDocuments({ estado: 'pendiente' }),
                resumenPeriodo(inicioDelDia(ahora), ahora),
                resumenPeriodo(inicioDeSemana(ahora), ahora),
                resumenPeriodo(inicioDeMes(ahora), ahora),
            ]);

            return response.status(200).json({
                rango: {
                    desde: claveFecha(desde),
                    hasta: claveFecha(hasta),
                    anteriorDesde: claveFecha(desdeAnterior),
                    anteriorHasta: claveFecha(hastaAnterior),
                },
                resumenes: {
                    dia: resumenDia,
                    semana: resumenSemana,
                    mes: resumenMes,
                },
                periodo,
                comparacion: {
                    anterior,
                    variacion: {
                        ingresos: variacion(periodo.total.ingresos, anterior.total.ingresos),
                        ventas: variacion(periodo.total.ventas, anterior.total.ventas),
                        online: variacion(periodo.online.ingresos, anterior.online.ingresos),
                        presencial: variacion(periodo.presencial.ingresos, anterior.presencial.ingresos),
                    },
                },
                ventasPorDia: porDia,
                metodosPago: metodosPago.map(fila => ({
                    metodo: fila._id,
                    total: Math.round(fila.total * 100) / 100,
                    ventas: fila.ventas,
                })),
                topProductos: topProductos.map(fila => ({
                    productoId: fila._id.productoId,
                    nombre: fila._id.nombre,
                    cantidad: fila.cantidad,
                    ingresos: Math.round(fila.ingresos * 100) / 100,
                    margen: Math.round(fila.margen * 100) / 100,
                })),
                stockBajo: stockBajo.map(producto => ({
                    id: String(producto._id),
                    productoId: producto.productoId,
                    nombre: producto.nombre,
                    stock: producto.stock,
                    stockMinimo: producto.stockMinimo,
                })),
                pedidosPendientes: {
                    total: pendientes,
                    ultimos: pendientesLista.map(ordenAdmin),
                },
                clientesNuevos,
                testimoniosPendientes,
            });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/export.csv', async (request, response, next) => {
        try {
            const { desde, hasta } = rangoSeleccionado(request.query);
            const ordenes = await Orden.find(matchVentas(desde, hasta))
                .populate('cliente', 'nombre email')
                .sort({ createdAt: -1 })
                .lean();

            const encabezado = [
                'codigo',
                'fecha',
                'canal',
                'estado',
                'metodo_pago',
                'cliente',
                'email',
                'productos',
                'subtotal',
                'descuento',
                'total',
                'margen',
            ];

            const filas = ordenes.map(orden => {
                const margen = orden.items.reduce(
                    (suma, item) => suma + (item.precio - item.costo) * item.cantidad,
                    0
                );

                return [
                    orden.codigo,
                    orden.createdAt.toISOString(),
                    orden.canal,
                    orden.estado,
                    orden.metodoPago,
                    orden.cliente ? orden.cliente.nombre : orden.contacto.nombre,
                    orden.cliente ? orden.cliente.email : orden.contacto.email || '',
                    orden.items.map(item => `${item.nombre} x${item.cantidad}`).join(' | '),
                    orden.subtotal,
                    orden.descuento,
                    orden.total,
                    Math.round(margen * 100) / 100,
                ];
            });

            const csv = [encabezado, ...filas]
                .map(fila => fila.map(valor => {
                    const texto = String(valor ?? '');
                    return /[",\n;]/.test(texto)
                        ? `"${texto.replace(/"/g, '""')}"`
                        : texto;
                }).join(','))
                .join('\r\n');

            response.setHeader('Content-Type', 'text/csv; charset=utf-8');
            response.setHeader(
                'Content-Disposition',
                `attachment; filename="zapi-ventas-${claveFecha(desde)}-${claveFecha(hasta)}.csv"`
            );
            return response.status(200).send('\uFEFF' + csv);
        } catch (error) {
            return next(error);
        }
    });

    return router;
}

module.exports = { createDashboardRouter };
