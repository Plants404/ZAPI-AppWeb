'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');
const { registrarAuditoria } = require('../lib/auditoria.js');


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

const MAX_IMAGENES = 12;
const MAX_INFO = 8;
const MAX_BYTES_IMAGEN = 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const RUTA_IMAGEN = /^(public\/img\/[\w.-]{1,120}|\/api\/imagenes\/[a-f0-9]{24}|https:\/\/[^\s"'<>]{4,480})$/;

function texto(valor, campo, max, { obligatorio = false } = {}) {
    if (typeof valor !== 'string') throw new HttpError(400, `El campo ${campo} no es válido.`);
    const limpio = valor.trim();
    if (obligatorio && !limpio) throw new HttpError(400, `El campo ${campo} es obligatorio.`);
    if (limpio.length > max) throw new HttpError(400, `El campo ${campo} supera ${max} caracteres.`);
    return limpio;
}

function listaImagenes(valor) {
    if (!Array.isArray(valor) || valor.length > MAX_IMAGENES) {
        throw new HttpError(400, `Las imágenes deben ser una lista de hasta ${MAX_IMAGENES}.`);
    }
    const limpias = valor.map(item => (typeof item === 'string' ? item.trim() : ''));
    if (limpias.some(item => !RUTA_IMAGEN.test(item))) {
        throw new HttpError(400, 'Una imagen no es válida: usá una imagen subida o una URL https.');
    }
    return [...new Set(limpias)];
}

function listaInfo(valor) {
    if (!Array.isArray(valor) || valor.length > MAX_INFO) {
        throw new HttpError(400, `La información de venta admite hasta ${MAX_INFO} líneas.`);
    }
    return valor.map(item => texto(item, 'infoDeVenta', 160)).filter(Boolean);
}

function numeroNoNegativo(valor, campo, entero) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0
        || (entero && !Number.isInteger(valor))) {
        throw new HttpError(400, entero ? 'El stock no es válido.' : 'El precio no es válido.');
    }
    return valor;
}

function booleano(valor, campo) {
    if (typeof valor !== 'boolean') throw new HttpError(400, `El campo ${campo} debe ser booleano.`);
    return valor;
}

/* Valida los campos recibidos. Con `completo` exige los obligatorios del alta. */
function validarProducto(cuerpo, completo) {
    const c = cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
    const campos = {};
    if ('slug' in c || completo) {
        const slug = texto(c.slug === undefined ? '' : c.slug, 'slug', 120, { obligatorio: true });
        if (!/^[a-z0-9-]+$/.test(slug)) throw new HttpError(400, 'El slug admite minúsculas, números y guiones.');
        campos.slug = slug;
    }
    if ('nombre' in c || completo) campos.nombre = texto(c.nombre === undefined ? '' : c.nombre, 'nombre', 160, { obligatorio: true });
    if ('categoria' in c) campos.categoria = texto(c.categoria, 'categoría', 80);
    if ('descripcion' in c) campos.descripcion = texto(c.descripcion, 'descripción', 1000);
    if ('precioBase' in c || completo) campos.precioBase = numeroNoNegativo(c.precioBase, 'precio', false);
    if ('stock' in c || completo) campos.stock = numeroNoNegativo(c.stock, 'stock', true);
    ['visible', 'active', 'destacado'].forEach(campo => {
        if (campo in c) campos[campo] = booleano(c[campo], campo);
    });
    if ('imagenes' in c) campos.imagenes = listaImagenes(c.imagenes);
    if ('imagen' in c) {
        const imagen = texto(c.imagen, 'imagen', 500);
        if (imagen && !RUTA_IMAGEN.test(imagen)) throw new HttpError(400, 'La imagen principal no es válida.');
        campos.imagen = imagen;
    }
    if ('infoDeVenta' in c) campos.infoDeVenta = listaInfo(c.infoDeVenta);

    /* La imagen principal siempre es la primera de la galería. */
    if (campos.imagenes) {
        campos.imagen = campos.imagen && campos.imagenes.includes(campos.imagen)
            ? campos.imagen
            : (campos.imagenes[0] || '');
        if (campos.imagen) {
            campos.imagenes = [campos.imagen, ...campos.imagenes.filter(item => item !== campos.imagen)];
        }
    }
    return campos;
}

function esImagenValida(buffer, tipo) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    if (tipo === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (tipo === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (tipo === 'image/webp') return buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
    return false;
}

function crearRouterAdmin(getDatabase) {
    const router = express.Router();

    /* Alta de producto (solo admin). Escribe en auditoría. */
    router.post('/', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const campos = validarProducto(req.body, true);

        if (await db.collection('products').findOne({ slug: campos.slug })) {
            throw new HttpError(409, 'Ya existe un producto con ese slug.');
        }

        const [ultimo] = await db.collection('products').find({}).sort({ id: -1 }).limit(1).toArray();
        const ahora = new Date();
        const producto = {
            id: ultimo && Number.isInteger(ultimo.id) ? ultimo.id + 1 : 1,
            categoria: '',
            imagen: '',
            imagenes: [],
            descripcion: '',
            infoDeVenta: [],
            destacado: false,
            visible: true,
            active: true,
            ...campos,
            createdAt: ahora,
            updatedAt: ahora
        };

        await db.collection('products').insertOne(producto);
        await registrarAuditoria(db, req.usuario, 'producto.alta', null, producto,
            `Producto dado de alta: ${producto.nombre} (${producto.slug})`);

        res.status(201).json({ product: producto });
    });

    /* Edición completa de producto (solo admin). Escribe en auditoría. */
    router.patch('/:id', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) throw new HttpError(404, 'Producto no encontrado.');

        const campos = validarProducto(req.body, false);
        if (Object.keys(campos).length === 0) {
            throw new HttpError(400, 'No hay campos para editar.');
        }

        const antes = await db.collection('products').findOne({ id });
        if (!antes) throw new HttpError(404, 'Producto no encontrado.');

        if (campos.slug && campos.slug !== antes.slug
            && await db.collection('products').findOne({ slug: campos.slug })) {
            throw new HttpError(409, 'Ya existe un producto con ese slug.');
        }

        campos.updatedAt = new Date();
        const resultado = await db.collection('products').findOneAndUpdate(
            { id },
            { $set: campos },
            { returnDocument: 'after' }
        );
        if (!resultado) throw new HttpError(404, 'Producto no encontrado.');

        await registrarAuditoria(db, req.usuario, 'producto.editar', antes, resultado,
            `Producto ${id} editado: ${Object.keys(campos).filter(c => c !== 'updatedAt').join(', ')}`);

        res.json({ product: resultado });
    });

    return router;
}

/* Subida de imágenes (admin): cuerpo binario, se guarda en Mongo porque el
   disco de Render es efímero. Se sirven desde GET /api/imagenes/:id. */
function crearRouterImagenesAdmin(getDatabase) {
    const router = express.Router();

    /* Biblioteca: las imágenes subidas, de la más nueva a la más vieja. */
    router.get('/', requerirAdmin(getDatabase), async (req, res) => {
        const imagenes = await getDatabase().collection('imagenes')
            .find({}, { projection: { datos: 0 } })
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray();

        res.json({
            imagenes: imagenes.map(imagen => ({
                id: String(imagen._id),
                url: `/api/imagenes/${imagen._id}`,
                tipo: imagen.tipo,
                bytes: imagen.bytes,
                creada: imagen.createdAt
            }))
        });
    });

    router.post('/', requerirAdmin(getDatabase),
        express.raw({ type: TIPOS_IMAGEN, limit: MAX_BYTES_IMAGEN }),
        async (req, res) => {
            const tipo = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
            if (!TIPOS_IMAGEN.includes(tipo)) {
                throw new HttpError(415, 'Subí una imagen JPG, PNG o WebP.');
            }
            if (!esImagenValida(req.body, tipo)) {
                throw new HttpError(400, 'El archivo no es una imagen válida.');
            }

            const db = getDatabase();
            const documento = { tipo, datos: req.body, bytes: req.body.length, createdAt: new Date() };
            const { insertedId } = await db.collection('imagenes').insertOne(documento);
            const id = String(insertedId);

            await registrarAuditoria(db, req.usuario, 'imagen.subida', null,
                { id, tipo, bytes: documento.bytes }, `Imagen subida (${documento.bytes} bytes)`);

            res.status(201).json({ id, url: `/api/imagenes/${id}`, bytes: documento.bytes });
        });

    return router;
}

function crearRouterImagenes(getDatabase) {
    const router = express.Router();

    router.get('/:id', async (req, res) => {
        if (!/^[a-f0-9]{24}$/.test(req.params.id)) throw new HttpError(404, 'Imagen no encontrada.');
        const imagen = await getDatabase().collection('imagenes').findOne({ _id: new ObjectId(req.params.id) });
        if (!imagen) throw new HttpError(404, 'Imagen no encontrada.');

        const datos = Buffer.isBuffer(imagen.datos) ? imagen.datos : Buffer.from(imagen.datos.buffer);
        res.set('Content-Type', imagen.tipo);
        res.set('Content-Length', String(datos.length));
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.end(datos);
    });

    return router;
}

module.exports = { crearRouter, crearRouterAdmin, crearRouterImagenesAdmin, crearRouterImagenes, validarProducto };
