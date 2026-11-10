'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../app.js');

function crearBaseFalsa() {
    const productos = [
        { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 12, active: true }
    ];
    const registros = {
        orders: [],
        contacts: [],
        testimonials: [
            { estado: 'approved', autor: 'Publicado', lugar: '', texto: 'Opinión publicada.', estrellas: 5, productoId: null },
            { estado: 'pending', autor: 'Pendiente', lugar: '', texto: 'Opinión en revisión.', estrellas: 4, productoId: null }
        ]
    };

    return {
        async command() {
            return { ok: 1 };
        },
        collection(nombre) {
            if (nombre === 'products') {
                return {
                    find(filtro) {
                        return {
                            sort() { return this; },
                            async toArray() {
                                return productos.filter(producto => producto.active && (!filtro.id
                                    || filtro.id.$in.includes(producto.id)));
                            }
                        };
                    },
                    async findOne(filtro, opciones) {
                        const producto = productos.find(item => item.active
                            && (filtro.slug ? item.slug === filtro.slug : item.id === filtro.id));
                        if (!producto) return null;
                        if (opciones && opciones.projection && opciones.projection._id === 1) {
                            return { _id: 'producto-falso' };
                        }
                        return Object.fromEntries(Object.keys(opciones.projection)
                            .filter(campo => campo !== '_id' && producto[campo] !== undefined)
                            .map(campo => [campo, producto[campo]]));
                    }
                };
            }
            if (registros[nombre]) {
                return {
                    async insertOne(documento) {
                        registros[nombre].push(documento);
                        return { insertedId: 'registro-falso' };
                    },
                    find(filtro, opciones) {
                        return {
                            sort() { return this; },
                            async toArray() {
                                return registros[nombre]
                                    .filter(item => item.estado === filtro.estado)
                                    .map(item => Object.fromEntries(
                                        Object.keys(opciones.projection || {})
                                            .filter(campo => campo !== '_id' && item[campo] !== undefined)
                                            .map(campo => [campo, item[campo]])
                                    ));
                            }
                        };
                    }
                };
            }
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
}

test('health comprueba la conexión a la base de datos', async t => {
    const server = crearApp({ getDatabase: crearBaseFalsa }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, database: 'connected' });
});

test('el catálogo solo expone productos públicos activos', async t => {
    const server = crearApp({ getDatabase: crearBaseFalsa }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/products/albahaca`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        product: { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 12 }
    });
});

test('el pedido usa los precios de MongoDB, no los enviados por el cliente', async t => {
    const server = crearApp({ getDatabase: crearBaseFalsa }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: { nombre: 'Ana', telefono: '098 123 456' },
            lineas: [{ id: 1, cantidad: 2, precio: 1, nombre: 'Producto falso' }]
        })
    });

    assert.equal(response.status, 201);
    const { order } = await response.json();
    assert.equal(order.lineas[0].precio, 150);
    assert.equal(order.subtotal, 300);
    assert.equal(order.lineas[0].nombre, 'Albahaca');
});

test('contacto se guarda y devuelve solo una confirmación pública', async t => {
    const server = crearApp({ getDatabase: crearBaseFalsa }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'Ana',
            email: 'ana@example.com',
            asunto: 'Consulta',
            mensaje: 'Quisiera conocer las plantas disponibles.'
        })
    });

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(await response.json()).sort(), ['id', 'message']);
});

test('solo publica testimonios aprobados y recibe nuevos como pendientes', async t => {
    const server = crearApp({ getDatabase: crearBaseFalsa }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/testimonials`;

    const publicados = await fetch(base);
    assert.deepEqual(await publicados.json(), {
        testimonials: [{
            autor: 'Publicado',
            lugar: '',
            texto: 'Opinión publicada.',
            estrellas: 5,
            productoId: null
        }]
    });

    const nuevo = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            autor: 'Ana',
            texto: 'Tuve una experiencia excelente.',
            estrellas: 5
        })
    });
    assert.equal(nuevo.status, 201);
});
