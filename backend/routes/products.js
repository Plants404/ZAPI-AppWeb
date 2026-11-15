'use strict';

const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');
const { registrarAuditoria } = require('../lib/auditoria.js');

const CAMPOS_EDITABLES = ['precioBase', 'stock', 'visible'];

function crearRouter(getDatabase) {
    const router = express.Router();
    const camposPublicos = {
        _id: 0,
        id: 1,
        nombre: 1,
        slug: 1,
        categoria: 1,
        imagen: 1,
        imagenes: 1,
        descripcion: 1,
        precioBase: 1,
        stock: 1,
        destacado: 1,
        infoDeVenta: 1
    };

    router.get('/', async (req, res) => {
        const productos = await getDatabase().collection('products')
            .find({ active: true }, { projection: camposPublicos })
            .sort({ id: 1 })
            .toArray();

        res.json({ products: productos });
    });

    router.get('/:slug', async (req, res) => {
        const producto = await getDatabase().collection('products').findOne(
            { slug: req.params.slug, active: true },
            { projection: camposPublicos }
        );

        if (!producto) throw new HttpError(404, 'No se encontró el producto.');
        res.json({ product: producto });
    });

    return router;
}

function crearRouterAdmin(getDatabase) {
    const router = express.Router();

    /* Alta de producto (solo admin). Escribe en auditoría. */
    router.post('/', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const {
            slug, nombre, categoria, imagen, imagenes, descripcion,
            precioBase, stock, visible, destacado, infoDeVenta
        } = req.body || {};

        if (!slug || typeof slug !== 'string') {
            throw new HttpError(400, 'El campo slug es obligatorio.');
        }
        if (!nombre || typeof nombre !== 'string') {
            throw new HttpError(400, 'El campo nombre es obligatorio.');
        }
        if (typeof precioBase !== 'number' || precioBase < 0) {
            throw new HttpError(400, 'El precio no es válido.');
        }
        if (typeof stock !== 'number' || stock < 0) {
            throw new HttpError(400, 'El stock no es válido.');
        }

        const existente = await db.collection('products').findOne({ slug });
        if (existente) {
            throw new HttpError(409, 'Ya existe un producto con ese slug.');
        }

        const producto = {
            slug,
            nombre,
            categoria: categoria || '',
            imagen: imagen || '',
            imagenes: Array.isArray(imagenes) ? imagenes : [],
            descripcion: descripcion || '',
            precioBase,
            stock,
            visible: visible !== false,
            activo: true,
            destacado: destacado === true,
            infoDeVenta: infoDeVenta || '',
            createdAt: new Date()
        };

        await db.collection('products').insertOne(producto);

        await registrarAuditoria(db, req.usuario, 'producto.alta', null, producto,
            `Producto dado de alta: ${nombre} (${slug})`);

        res.status(201).json({ product: producto });
    });

    /* Edición de producto (solo admin): precio, stock, visible. Escribe en auditoría. */
    router.patch('/:id', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const { id } = req.params;
        const cambios = req.body || {};

        const campos = {};
        for (const campo of CAMPOS_EDITABLES) {
            if (campo in cambios) {
                const valor = cambios[campo];
                if (campo === 'precioBase' && (typeof valor !== 'number' || valor < 0)) {
                    throw new HttpError(400, 'El precio no es válido.');
                }
                if (campo === 'stock' && (typeof valor !== 'number' || valor < 0)) {
                    throw new HttpError(400, 'El stock no es válido.');
                }
                if (campo === 'visible' && typeof valor !== 'boolean') {
                    throw new HttpError(400, 'El campo visible debe ser booleano.');
                }
                campos[campo] = valor;
            }
        }

        if (Object.keys(campos).length === 0) {
            throw new HttpError(400, 'No hay campos para editar.');
        }

        const antes = await db.collection('products').findOne({ id: Number(id) });
        if (!antes) throw new HttpError(404, 'Producto no encontrado.');

        const resultado = await db.collection('products').findOneAndUpdate(
            { id: Number(id) },
            { $set: campos },
            { returnDocument: 'after' }
        );
        if (!resultado) throw new HttpError(404, 'Producto no encontrado.');

        await registrarAuditoria(db, req.usuario, 'producto.editar', antes, resultado,
            `Producto ${id} editado: ${Object.keys(campos).join(', ')}`);

        res.json({ product: resultado });
    });

    return router;
}

module.exports = { crearRouter, crearRouterAdmin };
