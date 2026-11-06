'use strict';

const express = require('express');
const mongoose = require('mongoose');
const MovimientoStock = require('../../models/MovimientoStock');
const Producto = require('../../models/Producto');
const { registrarAuditoria } = require('../../utils/auditoria');
const { productoAdmin } = require('../../utils/catalogo');
const { registrarMovimientoManual } = require('../../utils/stock');
const {
    esIdMongo,
    escaparRegex,
    paginacion,
    slugify,
    texto,
    validarImagen,
} = require('../../utils/validacion');

function leerImagenes(body, actuales = []) {
    const crudas = Array.isArray(body.imagenes)
        ? body.imagenes
        : body.imagen !== undefined
            ? [body.imagen]
            : actuales;

    if (!Array.isArray(crudas) || crudas.length === 0 || crudas.length > 8) {
        return { error: 'El producto debe tener entre 1 y 8 fotos.' };
    }

    const imagenes = [];

    for (const imagen of crudas) {
        const limpia = texto(imagen);

        if (!validarImagen(limpia)) {
            return { error: 'Una de las fotos no es una ruta o URL válida.' };
        }

        if (!imagenes.includes(limpia)) imagenes.push(limpia);
    }

    return { imagenes };
}

function leerInfoDeVenta(body, actual = []) {
    const valor = body.infoDeVenta === undefined ? actual : body.infoDeVenta;

    if (!Array.isArray(valor) || valor.length > 8) {
        return { error: 'La información de venta debe ser una lista de hasta 8 elementos.' };
    }

    const items = [];

    for (const item of valor) {
        const limpio = texto(item);

        if (!limpio || limpio.length > 200) {
            return { error: 'Cada ventaja debe tener entre 1 y 200 caracteres.' };
        }

        items.push(limpio);
    }

    return { infoDeVenta: items };
}

function validarProducto(body, actual = null) {
    const nombre = texto(body.nombre !== undefined ? body.nombre : actual?.nombre);
    const categoria = texto(body.categoria !== undefined ? body.categoria : actual?.categoria);
    const descripcion = texto(body.descripcion !== undefined ? body.descripcion : actual?.descripcion);
    const precio = Number(body.precio !== undefined ? body.precio : actual?.precio);
    const costo = Number(body.costo !== undefined ? body.costo : actual?.costo ?? 0);
    const stock = Number(body.stock !== undefined ? body.stock : actual?.stock ?? 0);
    const stockMinimo = Number(body.stockMinimo !== undefined ? body.stockMinimo : actual?.stockMinimo ?? 3);
    const destacado = body.destacado === undefined ? Boolean(actual?.destacado) : body.destacado;
    const activo = body.activo === undefined ? (actual ? Boolean(actual.activo) : true) : body.activo;

    if (nombre.length < 2 || nombre.length > 200) {
        return { error: 'El nombre debe tener entre 2 y 200 caracteres.', campo: 'nombre' };
    }

    if (categoria.length < 2 || categoria.length > 80) {
        return { error: 'La categoría debe tener entre 2 y 80 caracteres.', campo: 'categoria' };
    }

    if (descripcion.length < 10 || descripcion.length > 1200) {
        return { error: 'La descripción debe tener entre 10 y 1200 caracteres.', campo: 'descripcion' };
    }

    if (!Number.isFinite(precio) || precio <= 0) {
        return { error: 'El precio debe ser mayor a cero.', campo: 'precio' };
    }

    if (!Number.isFinite(costo) || costo < 0) {
        return { error: 'El costo no puede ser negativo.', campo: 'costo' };
    }

    if (!Number.isSafeInteger(stock) || stock < 0) {
        return { error: 'El stock debe ser un entero no negativo.', campo: 'stock' };
    }

    if (!Number.isSafeInteger(stockMinimo) || stockMinimo < 0) {
        return { error: 'El stock mínimo debe ser un entero no negativo.', campo: 'stockMinimo' };
    }

    if (typeof destacado !== 'boolean') {
        return { error: 'El campo destacado debe ser verdadero o falso.', campo: 'destacado' };
    }

    if (typeof activo !== 'boolean') {
        return { error: 'El campo activo debe ser verdadero o falso.', campo: 'activo' };
    }

    const imagenes = leerImagenes(body, actual?.imagenes || []);
    if (imagenes.error) return { error: imagenes.error, campo: 'imagenes' };

    const info = leerInfoDeVenta(body, actual?.infoDeVenta || []);
    if (info.error) return { error: info.error, campo: 'infoDeVenta' };

    return {
        datos: {
            nombre,
            categoria,
            descripcion,
            precio: Math.round(precio * 100) / 100,
            costo: Math.round(costo * 100) / 100,
            stock,
            stockMinimo,
            destacado,
            activo,
            imagenes: imagenes.imagenes,
            infoDeVenta: info.infoDeVenta,
        },
    };
}

async function slugDisponible(nombre, excluirId = null) {
    const base = slugify(nombre) || 'producto';
    let candidato = base;
    let sufijo = 2;

    while (await Producto.exists({ slug: candidato, ...(excluirId ? { _id: { $ne: excluirId } } : {}) })) {
        candidato = `${base}-${sufijo}`;
        sufijo += 1;
    }

    return candidato;
}

async function buscarProducto(id) {
    if (!esIdMongo(id)) return null;
    return Producto.findById(id);
}

function createProductosRouter() {
    const router = express.Router();

    router.get('/categorias', async (request, response, next) => {
        try {
            const categorias = await Producto.distinct('categoria');
            return response.status(200).json({ categorias: categorias.sort((a, b) => a.localeCompare(b, 'es')) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/', async (request, response, next) => {
        try {
            const { pagina, limite, salto } = paginacion(request.query);
            const filtro = {};

            if (request.query.activo === '1' || request.query.activo === 'true') filtro.activo = true;
            if (request.query.activo === '0' || request.query.activo === 'false') filtro.activo = false;

            const categoria = texto(request.query.categoria);
            if (categoria) filtro.categoria = categoria;

            if (request.query.stockBajo === '1' || request.query.stockBajo === 'true') {
                filtro.$expr = { $lte: ['$stock', '$stockMinimo'] };
            }

            const busqueda = texto(request.query.q);

            if (busqueda) {
                const patron = new RegExp(escaparRegex(busqueda), 'i');
                filtro.$or = [{ nombre: patron }, { categoria: patron }, { descripcion: patron }];
            }

            const [productos, total] = await Promise.all([
                Producto.find(filtro).sort({ activo: -1, nombre: 1 }).skip(salto).limit(limite).lean(),
                Producto.countDocuments(filtro),
            ]);

            return response.status(200).json({
                productos: productos.map(productoAdmin),
                total,
                pagina,
                paginas: Math.max(1, Math.ceil(total / limite)),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.post('/', async (request, response, next) => {
        const session = await mongoose.startSession();

        try {
            const validacion = validarProducto(request.body || {});

            if (validacion.error) {
                return response.status(400).json({ error: validacion.error, campo: validacion.campo });
            }

            const ultimo = await Producto.findOne().sort({ productoId: -1 }).select('productoId').lean();
            const productoId = (ultimo ? ultimo.productoId : 0) + 1;
            const slug = await slugDisponible(validacion.datos.nombre);
            let creado;

            await session.withTransaction(async () => {
                [creado] = await Producto.create([{
                    ...validacion.datos,
                    productoId,
                    slug,
                }], { session });

                if (creado.stock > 0) {
                    await MovimientoStock.create([{
                        producto: creado._id,
                        productoId: creado.productoId,
                        tipo: 'entrada',
                        cantidad: creado.stock,
                        stockAnterior: 0,
                        stockNuevo: creado.stock,
                        motivo: 'Stock inicial',
                        usuario: request.user._id,
                    }], { session });
                }
            });

            await registrarAuditoria({
                actor: request.user,
                accion: 'crear',
                entidad: 'producto',
                entidadId: creado._id,
                detalle: { nombre: creado.nombre, precio: creado.precio, stock: creado.stock },
            });

            return response.status(201).json({ producto: productoAdmin(creado) });
        } catch (error) {
            return next(error);
        } finally {
            await session.endSession();
        }
    });

    router.get('/:id', async (request, response, next) => {
        try {
            const producto = await buscarProducto(request.params.id);

            if (!producto) return response.status(404).json({ error: 'Producto no encontrado.' });

            return response.status(200).json({ producto: productoAdmin(producto) });
        } catch (error) {
            return next(error);
        }
    });

    router.put('/:id', async (request, response, next) => {
        const session = await mongoose.startSession();

        try {
            const producto = await buscarProducto(request.params.id);

            if (!producto) return response.status(404).json({ error: 'Producto no encontrado.' });

            const validacion = validarProducto(request.body || {}, producto);

            if (validacion.error) {
                return response.status(400).json({ error: validacion.error, campo: validacion.campo });
            }

            const datos = validacion.datos;
            const slug = datos.nombre !== producto.nombre
                ? await slugDisponible(datos.nombre, producto._id)
                : producto.slug;
            const stockAnterior = producto.stock;
            let actualizado;

            await session.withTransaction(async () => {
                actualizado = await Producto.findByIdAndUpdate(
                    producto._id,
                    { $set: { ...datos, slug } },
                    { returnDocument: 'after', runValidators: true, session }
                );

                if (actualizado.stock !== stockAnterior) {
                    await MovimientoStock.create([{
                        producto: actualizado._id,
                        productoId: actualizado.productoId,
                        tipo: 'ajuste',
                        cantidad: actualizado.stock - stockAnterior,
                        stockAnterior,
                        stockNuevo: actualizado.stock,
                        motivo: 'Ajuste desde la edición del producto',
                        usuario: request.user._id,
                    }], { session });
                }
            });

            await registrarAuditoria({
                actor: request.user,
                accion: 'actualizar',
                entidad: 'producto',
                entidadId: actualizado._id,
                detalle: { nombre: actualizado.nombre, stockAnterior, stock: actualizado.stock },
            });

            return response.status(200).json({ producto: productoAdmin(actualizado) });
        } catch (error) {
            return next(error);
        } finally {
            await session.endSession();
        }
    });

    router.delete('/:id', async (request, response, next) => {
        try {
            const producto = await buscarProducto(request.params.id);

            if (!producto) return response.status(404).json({ error: 'Producto no encontrado.' });

            producto.activo = false;
            await producto.save();

            await registrarAuditoria({
                actor: request.user,
                accion: 'desactivar',
                entidad: 'producto',
                entidadId: producto._id,
                detalle: { nombre: producto.nombre },
            });

            return response.status(200).json({ producto: productoAdmin(producto) });
        } catch (error) {
            return next(error);
        }
    });

    router.get('/:id/movimientos', async (request, response, next) => {
        try {
            const producto = await buscarProducto(request.params.id);

            if (!producto) return response.status(404).json({ error: 'Producto no encontrado.' });

            const { pagina, limite, salto } = paginacion(request.query);
            const filtro = { producto: producto._id };
            const [movimientos, total] = await Promise.all([
                MovimientoStock.find(filtro)
                    .populate('usuario', 'nombre email')
                    .sort({ createdAt: -1 })
                    .skip(salto)
                    .limit(limite)
                    .lean(),
                MovimientoStock.countDocuments(filtro),
            ]);

            return response.status(200).json({
                movimientos: movimientos.map(movimiento => ({
                    id: String(movimiento._id),
                    tipo: movimiento.tipo,
                    cantidad: movimiento.cantidad,
                    stockAnterior: movimiento.stockAnterior,
                    stockNuevo: movimiento.stockNuevo,
                    motivo: movimiento.motivo,
                    fecha: movimiento.createdAt,
                    usuario: movimiento.usuario
                        ? { nombre: movimiento.usuario.nombre, email: movimiento.usuario.email }
                        : null,
                })),
                total,
                pagina,
                paginas: Math.max(1, Math.ceil(total / limite)),
            });
        } catch (error) {
            return next(error);
        }
    });

    router.post('/:id/movimientos', async (request, response, next) => {
        const session = await mongoose.startSession();

        try {
            const producto = await buscarProducto(request.params.id);

            if (!producto) return response.status(404).json({ error: 'Producto no encontrado.' });

            const body = request.body || {};
            const tipo = texto(body.tipo);
            const motivo = texto(body.motivo);

            if (!['entrada', 'ajuste', 'merma'].includes(tipo)) {
                return response.status(400).json({ error: 'El tipo de movimiento no es válido.', campo: 'tipo' });
            }

            if (motivo.length < 3 || motivo.length > 300) {
                return response.status(400).json({
                    error: 'El motivo debe tener entre 3 y 300 caracteres.',
                    campo: 'motivo',
                });
            }

            let resultado;

            await session.withTransaction(async () => {
                resultado = await registrarMovimientoManual({
                    producto,
                    tipo,
                    cantidad: Number(body.cantidad),
                    stockNuevo: Number(body.stockNuevo),
                    motivo,
                    usuario: request.user,
                    session,
                });
            });

            await registrarAuditoria({
                actor: request.user,
                accion: 'movimiento-stock',
                entidad: 'producto',
                entidadId: producto._id,
                detalle: { tipo, motivo, stock: resultado.producto.stock },
            });

            return response.status(201).json({
                producto: productoAdmin(resultado.producto),
                movimiento: {
                    tipo,
                    cantidad: resultado.movimiento.cantidad,
                    stockAnterior: resultado.movimiento.stockAnterior,
                    stockNuevo: resultado.movimiento.stockNuevo,
                    motivo,
                },
            });
        } catch (error) {
            return next(error);
        } finally {
            await session.endSession();
        }
    });

    return router;
}

module.exports = { createProductosRouter };
