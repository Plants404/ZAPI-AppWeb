'use strict';
/* ==========================================================
   SERVICIO: CATALOGO
   ------------------------------------------------------------
   Sembrar el catalogo desde public/data/productos.json y leerlo
   con el stock pegado. LEFT JOIN y no INNER porque un producto
   sin stock cargado igual tiene que aparecer: "precio sin
   confirmar stock" no es lo mismo que "no existe".
   ========================================================== */

const { Producto } = require('../models/producto.model');
const { Stock } = require('../models/stock.model');
const { leerProductos, aDocumento } = require('../utils/catalogo');
const log = require('../utils/log');

/* Al arrancar. Upsert de los productos del JSON, y los que ya no
   estan en el catalogo se desactivan (no se borran: un pedido
   viejo que los referencie conserva sus lineas). */
async function sembrarCatalogo() {
    const documentos = leerProductos().map(aDocumento);
    const presentes = new Set(documentos.map(d => d._id));

    await Producto.bulkWrite(documentos.map(d => {
        const { _id, ...campos } = d;

        return {
            updateOne: {
                filter: { _id },
                /* _id no va en $set (Mongo no lo permite); va en
                   $setOnInsert para la fila nueva. */
                update: { $set: campos, $setOnInsert: { _id } },
                upsert: true,
            },
        };
    }));

    await Producto.updateMany(
        { _id: { $nin: [...presentes] }, activo: true },
        { $set: { activo: false } }
    );

    log.info('catalogo sembrado', { productos: presentes.size });
}

/* Une cada producto activo con su stock. */
async function productosConStock() {
    const productos = await Producto
        .find({ activo: true })
        .sort({ nombre: 1 })
        .lean();

    const stock = await Stock.find({
        producto_id: { $in: productos.map(p => p._id) },
    }).lean();

    const porId = new Map(stock.map(s => [s.producto_id, s]));

    return productos.map(p => {
        const s = porId.get(p._id);

        return {
            id: p._id,
            nombre: p.nombre,
            slug: p.slug,
            categoria: p.categoria,
            precio: p.precio,
            /* unidades === null significa "no hay stock cargado";
               el front lo muestra distinto de 0. */
            unidades: s ? s.unidades : null,
            stockActualizado: s ? (s.actualizado || null) : null,
            ...p.detalle,
        };
    });
}

/* Por id numerico o por slug: por URL llegan las dos formas. */
async function verProducto(dato) {
    const numero = Number(dato);

    const filtro = Number.isInteger(numero) && numero > 0
        ? { _id: numero, activo: true }
        : { slug: dato, activo: true };

    const producto = await Producto.findOne(filtro).lean();

    if (!producto) return null;

    const s = await Stock.findOne({ producto_id: producto._id }).lean();

    return {
        id: producto._id,
        nombre: producto.nombre,
        slug: producto.slug,
        categoria: producto.categoria,
        precio: producto.precio,
        unidades: s ? s.unidades : null,
        stockActualizado: s ? (s.actualizado || null) : null,
        ...producto.detalle,
    };
}

module.exports = { sembrarCatalogo, productosConStock, verProducto };