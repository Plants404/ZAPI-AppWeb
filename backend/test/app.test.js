'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../app.js');
const { construirOperacionesProductos } = require('../seed.js');

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
                    },
                    async findOneAndUpdate(filtro, actualizacion) {
                        const inc = actualizacion.$inc && actualizacion.$inc.stock;
                        const p = productos.find(item => item.id === filtro.id && item.active);
                        if (!p) return { value: null };
                        if (filtro.stock && filtro.stock.$gte !== undefined) {
                            if (p.stock >= filtro.stock.$gte) {
                                p.stock += inc;
                                return { value: { ...p } };
                            }
                            return { value: null };
                        }
                        if (inc) {
                            p.stock += inc;
                            return { value: { ...p } };
                        }
                        return { value: null };
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

function crearBaseFalsaConStock() {
    const producto = { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 1, active: true };
    const restauraciones = [];

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
                                return producto.active && (!filtro.id || filtro.id.$in.includes(producto.id)) ? [producto] : [];
                            }
                        };
                    },
                    async findOneAndUpdate(filtro, actualizacion) {
                        const inc = actualizacion.$inc && actualizacion.$inc.stock;
                        if (filtro.stock && filtro.stock.$gte !== undefined) {
                            if (producto.stock >= filtro.stock.$gte) {
                                producto.stock += inc;
                                return { value: { ...producto } };
                            }
                            return { value: null };
                        }
                        if (inc && inc > 0) {
                            producto.stock += inc;
                            restauraciones.push({ id: filtro.id, cantidad: inc });
                            return { value: { ...producto } };
                        }
                        return { value: null };
                    },
                    async findOne(filtro, opciones) {
                        if (filtro.id === producto.id && producto.active) {
                            return Object.fromEntries(
                                Object.keys(opciones.projection || {})
                                    .filter(campo => campo !== '_id' && producto[campo] !== undefined)
                                    .map(campo => [campo, producto[campo]])
                            );
                        }
                        return null;
                    }
                };
            }
            if (nombre === 'orders') {
                return {
                    async insertOne() {
                        return { insertedId: 'registro-falso' };
                    }
                };
            }
            throw new Error(`Colección inesperada: ${nombre}`);
        },
        obtenerStock() {
            return producto.stock;
        },
        obtenerRestauraciones() {
            return restauraciones;
        }
    };
}

test('dos pedidos por el ultimo stock no venden de mas', async t => {
    const base = crearBaseFalsaConStock();
    const server = crearApp({ getDatabase: () => base }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;
    const cuerpo = {
        cliente: { nombre: 'Ana', telefono: '098 123 456' },
        lineas: [{ id: 1, cantidad: 1 }]
    };

    const primero = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
    });
    const segundo = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
    });

    const estados = [primero.status, segundo.status].sort();
    assert.deepEqual(estados, [201, 409]);
    assert.equal(base.obtenerStock(), 0);
});

test('el rollback devuelve el stock cuando una linea falla', async t => {
    const productoA = { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 5, active: true };
    const productoB = { id: 2, slug: 'cactus', nombre: 'Cactus', precioBase: 100, stock: 0, active: true };
    const restauraciones = [];

    const base = {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'products') {
                return {
                    find(filtro) {
                        return {
                            sort() { return this; },
                            async toArray() {
                                return [productoA, productoB].filter(p =>
                                    p.active && (!filtro.id || filtro.id.$in.includes(p.id))
                                );
                            }
                        };
                    },
                    async findOneAndUpdate(filtro, actualizacion) {
                        const inc = actualizacion.$inc && actualizacion.$inc.stock;
                        const p = [productoA, productoB].find(item => item.id === filtro.id);
                        if (filtro.stock && filtro.stock.$gte !== undefined) {
                            if (p && p.stock >= filtro.stock.$gte) {
                                p.stock += inc;
                                return { value: { ...p } };
                            }
                            return { value: null };
                        }
                        if (inc && inc > 0) {
                            p.stock += inc;
                            restauraciones.push({ id: filtro.id, cantidad: inc });
                            return { value: { ...p } };
                        }
                        return { value: null };
                    },
                    async findOne(filtro, opciones) {
                        const p = [productoA, productoB].find(item => item.id === filtro.id && item.active);
                        if (!p) return null;
                        return Object.fromEntries(
                            Object.keys(opciones.projection || {})
                                .filter(campo => campo !== '_id' && p[campo] !== undefined)
                                .map(campo => [campo, p[campo]])
                        );
                    }
                };
            }
            if (nombre === 'orders') {
                return {
                    async insertOne() {
                        return { insertedId: 'registro-falso' };
                    }
                };
            }
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };

    const server = crearApp({ getDatabase: () => base }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: { nombre: 'Ana', telefono: '098 123 456' },
            lineas: [
                { id: 1, cantidad: 2 },
                { id: 2, cantidad: 1 }
            ]
        })
    });

    assert.equal(respuesta.status, 409);
    assert.equal(productoA.stock, 5, 'el stock de la primera linea se restaura');
    assert.equal(productoB.stock, 0, 'el stock de la segunda linea no se toco');
});

test('el limitador responde 429 tras superar el umbral por IP', async t => {
    const base = {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'contacts') {
                return {
                    async insertOne() { return { insertedId: 'registro-falso' }; }
                };
            }
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
    const server = crearApp({ getDatabase: () => base }).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/contact`;
    const cuerpo = {
        nombre: 'Ana',
        email: 'ana@example.com',
        asunto: 'Consulta',
        mensaje: 'Mensaje de prueba para el limitador.'
    };

    let sesentaYUno = null;
    for (let i = 0; i < 21; i++) {
        const respuesta = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
        });
        if (i === 20) sesentaYUno = respuesta;
    }

    assert.equal(sesentaYUno.status, 429);
});

test('el seed no pisa el stock de productos existentes', () => {
    const ahora = new Date();
    const operaciones = construirOperacionesProductos(
        [{ id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 99, active: true }],
        ahora
    );

    const operacion = operaciones[0].updateOne.update;
    assert.ok('$set' in operacion);
    assert.ok('$setOnInsert' in operacion);
    assert.equal(operacion.$set.stock, undefined, 'el stock no va en $set de actualizacion');
    assert.equal(operacion.$setOnInsert.stock, 99, 'el stock solo se asigna al insertar');
});
