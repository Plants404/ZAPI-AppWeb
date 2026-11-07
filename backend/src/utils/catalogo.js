'use strict';

function productoPublico(producto) {
    return {
        id: producto.productoId,
        productoId: producto.productoId,
        slug: producto.slug,
        nombre: producto.nombre,
        categoria: producto.categoria,
        descripcion: producto.descripcion,
        precioBase: producto.precio,
        precio: producto.precio,
        imagen: producto.imagenes[0],
        imagenes: producto.imagenes,
        infoDeVenta: producto.infoDeVenta,
        stock: producto.stock,
        destacado: producto.destacado,
    };
}

function productoAdmin(producto) {
    return {
        id: String(producto._id),
        productoId: producto.productoId,
        slug: producto.slug,
        nombre: producto.nombre,
        categoria: producto.categoria,
        descripcion: producto.descripcion,
        precio: producto.precio,
        costo: producto.costo,
        imagen: producto.imagenes[0],
        imagenes: producto.imagenes,
        infoDeVenta: producto.infoDeVenta,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo,
        destacado: producto.destacado,
        activo: producto.activo,
        creado: producto.createdAt,
        actualizado: producto.updatedAt,
    };
}

module.exports = { productoAdmin, productoPublico };
