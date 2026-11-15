'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { crearApp } = require('../app.js');

const EXPIRA_EN = new Date(Date.now() + 8 * 60 * 60 * 1000);

function sesion(id, rol, expiresAt = EXPIRA_EN) {
    return {
        _id: id,
        userId: 'usuario-' + id,
        email: id + '@zapi.uy',
        rol,
        nombre: 'Usuario ' + id,
        expiresAt
    };
}

function valorAnidado(obj, ruta) {
    return ruta.split('.').reduce(
        (acc, parte) => (acc && acc[parte] !== undefined) ? acc[parte] : undefined,
        obj
    );
}

function coincide(item, filtro) {
    for (const [campo, valor] of Object.entries(filtro)) {
        if (campo === '$or') {
            if (!Array.isArray(valor) || !valor.some(sub => coincide(item, sub))) {
                return false;
            }
            continue;
        }
        const actual = valorAnidado(item, campo);
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
            if ('$gte' in valor && !(actual >= valor.$gte)) return false;
            if ('$lte' in valor && !(actual <= valor.$lte)) return false;
            if ('$regex' in valor) {
                const re = new RegExp(valor.$regex, valor.$options || '');
                if (!re.test(String(actual))) return false;
            }
            if ('$in' in valor && !valor.$in.includes(actual)) return false;
        } else if (actual !== valor) {
            return false;
        }
    }
    return true;
}

function crearBaseFalsa({ orders = [], products = [], sessions = [], auditoria = [] } = {}) {
    function coleccionMutable(items) {
        return {
            async insertOne(documento) {
                items.push(documento);
                return { insertedId: documento._id };
            },
            async findOne(filtro) {
                return items.find(item => coincide(item, filtro)) || null;
            },
            async findOneAndUpdate(filtro, actualizacion, opciones) {
                const idx = items.findIndex(item => coincide(item, filtro));
                if (idx === -1) return null;
                const original = items[idx];
                const clonado = { ...original };
                if (actualizacion.$set) Object.assign(clonado, actualizacion.$set);
                if (actualizacion.$inc) {
                    for (const [campo, delta] of Object.entries(actualizacion.$inc)) {
                        clonado[campo] = (Number(clonado[campo]) || 0) + delta;
                    }
                }
                if (actualizacion.$push) {
                    for (const [campo, valor] of Object.entries(actualizacion.$push)) {
                        if (!Array.isArray(clonado[campo])) clonado[campo] = [];
                        clonado[campo].push(valor);
                    }
                }
                items[idx] = clonado;
                const valor = (opciones && opciones.returnDocument === 'after') ? clonado : original;
                return valor;
            },
            find(filtro) {
                let resultado = items;
                if (filtro) resultado = resultado.filter(item => coincide(item, filtro));
                let omitir = 0;
                let limite = null;
                return {
                    sort() { return this; },
                    skip(n) { omitir = n; return this; },
                    limit(n) { limite = n; return this; },
                    async toArray() {
                        let r = resultado;
                        if (omitir) r = r.slice(omitir);
                        if (limite !== null) r = r.slice(0, limite);
                        return r.map(item => ({ ...item }));
                    }
                };
            },
            async countDocuments(filtro) {
                return filtro ? items.filter(item => coincide(item, filtro)).length : items.length;
            }
        };
    }

    return {
        async command() {
            return { ok: 1 };
        },
        collection(nombre) {
            const items = nombre === 'orders' ? orders
                : nombre === 'products' ? products
                : nombre === 'sessions' ? sessions
                : nombre === 'auditoria' ? auditoria
                : [];
            return coleccionMutable(items);
        }
    };
}

async function iniciar(base) {
    const app = await crearApp({ getDatabase: () => base });
    const server = http.createServer(app);
    server.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    return {
        server,
        url: `http://127.0.0.1:${server.address().port}`
    };
}

async function fetchAdmin(url, path, sessionId, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
        headers.Cookie = `sessionId=${sessionId}`;
    }
    const init = { method, headers };
    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }
    return fetch(`${url}/api/admin${path}`, init);
}

function producto(id = 1, sobre = {}) {
    return {
        id,
        slug: `prod-${id}`,
        nombre: `Producto ${id}`,
        categoria: '',
        precioBase: 150,
        stock: 10,
        active: true,
        visible: true,
        ...sobre
    };
}

const clienteValido = {
    nombre: 'Ana',
    telefono: '098 123 456'
};

test('A1: venta presencial sin sesión responde 401', async t => {
    const base = crearBaseFalsa({ products: [producto(1, { stock: 10 })] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/presencial', undefined, {
        method: 'POST',
        body: { cliente: clienteValido, lineas: [{ id: 1, cantidad: 2 }] }
    });

    assert.equal(respuesta.status, 401);
});

test('A2: venta presencial con sesión de cliente responde 403', async t => {
    const base = crearBaseFalsa({ products: [producto(1, { stock: 10 })] });
    base.collection('sessions').insertOne(sesion('cliente-1', 'cliente'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/presencial', 'cliente-1', {
        method: 'POST',
        body: { cliente: clienteValido, lineas: [{ id: 1, cantidad: 2 }] }
    });

    assert.equal(respuesta.status, 403);
});

test('A3: venta presencial con sesión de admin crea pedido, descuenta stock y audita', async t => {
    const base = crearBaseFalsa({ products: [producto(1, { stock: 10 })] });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/presencial', 'admin-1', {
        method: 'POST',
        body: {
            cliente: clienteValido,
            lineas: [{ id: 1, cantidad: 2 }],
            usuario: { id: 'falso', email: 'falso@example.com' }
        }
    });

    assert.equal(respuesta.status, 201);
    const { order } = await respuesta.json();
    assert.equal(order.canal, 'presencial');
    assert.equal(order.estado, 'pendiente');
    assert.equal(order.lineas[0].id, 1);
    assert.equal(order.lineas[0].cantidad, 2);
    assert.equal(order.lineas[0].precio, 150, 'el precio viene de la base de datos');
    assert.equal(order.total, 300);
    assert.equal(order.historial[0].usuario, 'usuario-admin-1');
    assert.equal(order.historial[0].email, 'admin-1@zapi.uy');

    const productoActualizado = await base.collection('products').findOne({ id: 1 });
    assert.equal(productoActualizado.stock, 8, 'se descuenta el stock de las líneas');

    const entradas = await base.collection('auditoria').find().toArray();
    assert.ok(entradas.some(e => e.accion === 'pedido.crear' && e.usuario === 'usuario-admin-1'),
        'se escribe en auditoría');
});

test('B1: cambiar estado de pedido sin sesión responde 401', async t => {
    const base = crearBaseFalsa({
        orders: [{
            id: 'PED-1',
            fecha: new Date(),
            estado: 'pendiente',
            canal: 'web',
            cliente: { nombre: 'Ana' },
            lineas: [{ id: 1, cantidad: 2 }],
            total: 300,
            historial: [{ estado: 'pendiente', fecha: new Date(), usuario: 'sistema', resumen: 'Pedido creado' }]
        }]
    });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/PED-1/estado', undefined, {
        method: 'PATCH',
        body: { estado: 'confirmado' }
    });

    assert.equal(respuesta.status, 401);
});

test('B2: cambiar estado de pedido con sesión de cliente responde 403', async t => {
    const base = crearBaseFalsa({
        orders: [{
            id: 'PED-2',
            fecha: new Date(),
            estado: 'pendiente',
            canal: 'web',
            cliente: { nombre: 'Ana' },
            lineas: [],
            total: 0,
            historial: []
        }]
    });
    base.collection('sessions').insertOne(sesion('cliente-1', 'cliente'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/PED-2/estado', 'cliente-1', {
        method: 'PATCH',
        body: { estado: 'confirmado' }
    });

    assert.equal(respuesta.status, 403);
});

test('B3: admin cambia estado a confirmado y agrega entrada al historial', async t => {
    const base = crearBaseFalsa({
        orders: [{
            id: 'PED-3',
            fecha: new Date(),
            estado: 'pendiente',
            canal: 'web',
            cliente: { nombre: 'Ana' },
            lineas: [],
            total: 0,
            historial: [{ estado: 'pendiente', fecha: new Date(), usuario: 'sistema', resumen: 'Pedido creado' }]
        }]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/PED-3/estado', 'admin-1', {
        method: 'PATCH',
        body: {
            estado: 'confirmado',
            usuario: { id: 'falso', email: 'falso@example.com' }
        }
    });

    assert.equal(respuesta.status, 200);
    const { order } = await respuesta.json();
    assert.equal(order.estado, 'confirmado');
    assert.equal(order.historial.length, 2);
    assert.equal(order.historial[1].estado, 'confirmado');
    assert.equal(order.historial[1].resumen, 'Estado cambiado a confirmado');
    assert.equal(order.historial[1].usuario, 'usuario-admin-1');
    assert.equal(order.historial[1].email, 'admin-1@zapi.uy');

    const entradas = await base.collection('auditoria').find().toArray();
    assert.ok(entradas.some(e => e.accion === 'pedido.estado' && e.usuario === 'usuario-admin-1'),
        'se escribe en auditoría');
});

test('B4: cambiar a cancelado devuelve el stock de las líneas', async t => {
    const base = crearBaseFalsa({
        products: [producto(1, { stock: 10 })],
        orders: [{
            id: 'PED-4',
            fecha: new Date(),
            estado: 'pendiente',
            canal: 'presencial',
            cliente: { nombre: 'Luis' },
            lineas: [{ id: 1, cantidad: 3 }],
            total: 450,
            historial: [{ estado: 'pendiente', fecha: new Date(), usuario: 'sistema', resumen: 'Pedido creado' }]
        }]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos/PED-4/estado', 'admin-1', {
        method: 'PATCH',
        body: { estado: 'cancelado' }
    });

    assert.equal(respuesta.status, 200);
    const { order } = await respuesta.json();
    assert.equal(order.estado, 'cancelado');
    assert.equal(order.historial.length, 2);
    assert.equal(order.historial[1].estado, 'cancelado');

    const productoActualizado = await base.collection('products').findOne({ id: 1 });
    assert.equal(productoActualizado.stock, 13, 'el stock sube al cancelar');
});

test('B5: cancelar dos veces devuelve 409 y no altera historial ni stock', async t => {
    const base = crearBaseFalsa({
        products: [producto(1, { stock: 10 })],
        orders: [{
            id: 'PED-5',
            fecha: new Date(),
            estado: 'pendiente',
            canal: 'web',
            cliente: { nombre: 'Ana' },
            lineas: [{ id: 1, cantidad: 2 }],
            total: 300,
            historial: [{ estado: 'pendiente', fecha: new Date(), usuario: 'sistema', resumen: 'Pedido creado' }]
        }]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const primera = await fetchAdmin(url, '/pedidos/PED-5/estado', 'admin-1', {
        method: 'PATCH',
        body: { estado: 'cancelado' }
    });
    assert.equal(primera.status, 200);
    const pedidoCancelado = await primera.json();
    const despuesPrimera = await base.collection('products').findOne({ id: 1 });
    assert.equal(despuesPrimera.stock, 12);

    const segunda = await fetchAdmin(url, '/pedidos/PED-5/estado', 'admin-1', {
        method: 'PATCH',
        body: { estado: 'cancelado' }
    });
    assert.equal(segunda.status, 409);
    const despuesSegunda = await base.collection('products').findOne({ id: 1 });
    assert.equal(despuesSegunda.stock, 12, 'el stock no se devuelve dos veces');
    const pedidoFinal = await base.collection('orders').findOne({ id: 'PED-5' });
    assert.equal(pedidoFinal.historial.length, pedidoCancelado.order.historial.length);
});

test('B6: confirmado puede pasar a entregado o cancelado', async () => {
    for (const siguiente of ['entregado', 'cancelado']) {
        const base = crearBaseFalsa({
            products: [producto(1, { stock: 8 })],
            orders: [{
                id: 'PED-6',
                estado: 'confirmado',
                lineas: [{ id: 1, cantidad: 2 }],
                historial: [{ estado: 'confirmado' }]
            }]
        });
        base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
        const { server, url } = await iniciar(base);

        const respuesta = await fetchAdmin(url, '/pedidos/PED-6/estado', 'admin-1', {
            method: 'PATCH',
            body: { estado: siguiente }
        });
        await new Promise(resolve => server.close(resolve));

        assert.equal(respuesta.status, 200);
        assert.equal((await respuesta.json()).order.estado, siguiente);
        const stockEsperado = siguiente === 'cancelado' ? 10 : 8;
        assert.equal((await base.collection('products').findOne({ id: 1 })).stock, stockEsperado);
    }
});

test('B7: transiciones repetidas o no permitidas no cambian pedido ni stock', async () => {
    const estados = ['pendiente', 'confirmado', 'entregado', 'cancelado'];
    const permitidas = new Set([
        'pendiente:confirmado',
        'pendiente:cancelado',
        'confirmado:entregado',
        'confirmado:cancelado'
    ]);

    for (const anterior of estados) {
        for (const siguiente of estados) {
            if (permitidas.has(`${anterior}:${siguiente}`)) continue;
            const base = crearBaseFalsa({
                products: [producto(1, { stock: 10 })],
                orders: [{
                    id: 'PED-TRANSICION',
                    estado: anterior,
                    lineas: [{ id: 1, cantidad: 2 }],
                    historial: [{ estado: anterior }]
                }]
            });
            base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
            const { server, url } = await iniciar(base);
            const respuesta = await fetchAdmin(url, '/pedidos/PED-TRANSICION/estado', 'admin-1', {
                method: 'PATCH',
                body: { estado: siguiente }
            });
            await new Promise(resolve => server.close(resolve));

            assert.equal(respuesta.status, 409, `${anterior} -> ${siguiente}`);
            const pedido = await base.collection('orders').findOne({ id: 'PED-TRANSICION' });
            assert.equal(pedido.estado, anterior);
            assert.equal(pedido.historial.length, 1);
            assert.equal((await base.collection('products').findOne({ id: 1 })).stock, 10);
        }
    }
});

test('B8: dos cancelaciones simultáneas solo devuelven el stock una vez', async t => {
    const base = crearBaseFalsa({
        products: [producto(1, { stock: 8 })],
        orders: [{
            id: 'PED-CARRERA',
            estado: 'pendiente',
            lineas: [{ id: 1, cantidad: 2 }],
            historial: [{ estado: 'pendiente' }]
        }]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const cancelar = () => fetchAdmin(url, '/pedidos/PED-CARRERA/estado', 'admin-1', {
        method: 'PATCH',
        body: { estado: 'cancelado' }
    });
    const respuestas = await Promise.all([cancelar(), cancelar()]);
    assert.deepEqual(respuestas.map(respuesta => respuesta.status).sort(), [200, 409]);
    assert.equal((await base.collection('products').findOne({ id: 1 })).stock, 10);
    assert.equal((await base.collection('orders').findOne({ id: 'PED-CARRERA' })).historial.length, 2);
});

test('C1: alta de producto sin sesión responde 401', async t => {
    const base = crearBaseFalsa();
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos', undefined, {
        method: 'POST',
        body: { slug: 'menta', nombre: 'Menta', precioBase: 200, stock: 5, visible: true }
    });

    assert.equal(respuesta.status, 401);
});

test('C2: alta de producto con sesión de admin crea producto y audita', async t => {
    const base = crearBaseFalsa();
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos', 'admin-1', {
        method: 'POST',
        body: { slug: 'menta', nombre: 'Menta', precioBase: 200, stock: 5, visible: true }
    });

    assert.equal(respuesta.status, 201);
    const { product } = await respuesta.json();
    assert.equal(product.slug, 'menta');
    assert.equal(product.nombre, 'Menta');
    assert.equal(product.precioBase, 200);
    assert.equal(product.stock, 5);
    assert.equal(product.visible, true);
    assert.equal(product.active, true);

    const guardado = await base.collection('products').findOne({ slug: 'menta' });
    assert.ok(guardado, 'el producto se persiste');

    const entradas = await base.collection('auditoria').find().toArray();
    assert.ok(entradas.some(e => e.accion === 'producto.alta' && e.usuario === 'usuario-admin-1'),
        'se escribe en auditoría');
});

test('C3: slug duplicado en alta de producto responde 409', async t => {
    const base = crearBaseFalsa({ products: [producto(1, { slug: 'albahaca' })] });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos', 'admin-1', {
        method: 'POST',
        body: { slug: 'albahaca', nombre: 'Otra albahaca', precioBase: 10, stock: 1, visible: true }
    });

    assert.equal(respuesta.status, 409);
});

test('D1: editar producto sin sesión responde 401', async t => {
    const base = crearBaseFalsa({ products: [producto(1)] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos/1', undefined, {
        method: 'PATCH',
        body: { precioBase: 180 }
    });

    assert.equal(respuesta.status, 401);
});

test('D2: admin edita precio, stock y visible, y audita', async t => {
    const base = crearBaseFalsa({ products: [producto(1, { precioBase: 150, stock: 10, visible: true })] });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos/1', 'admin-1', {
        method: 'PATCH',
        body: { precioBase: 180, stock: 7, visible: false }
    });

    assert.equal(respuesta.status, 200);
    const { product } = await respuesta.json();
    assert.equal(product.precioBase, 180);
    assert.equal(product.stock, 7);
    assert.equal(product.visible, false);

    const guardado = await base.collection('products').findOne({ id: 1 });
    assert.equal(guardado.precioBase, 180);
    assert.equal(guardado.stock, 7);
    assert.equal(guardado.visible, false);

    const entradas = await base.collection('auditoria').find().toArray();
    assert.ok(entradas.some(e => e.accion === 'producto.editar' && e.usuario === 'usuario-admin-1'),
        'se escribe en auditoría');
});

test('D3: editar producto no existente responde 404', async t => {
    const base = crearBaseFalsa({ products: [producto(1)] });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos/999', 'admin-1', {
        method: 'PATCH',
        body: { precioBase: 180 }
    });

    assert.equal(respuesta.status, 404);
});

test('E1: auditoría sin sesión responde 401', async t => {
    const base = crearBaseFalsa({ auditoria: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/auditoria');

    assert.equal(respuesta.status, 401);
});

test('E2: auditoría con sesión de admin devuelve hasta 20 entradas', async t => {
    const entradas = [];
    for (let i = 0; i < 25; i += 1) {
        entradas.push({
            usuario: `usuario-${i}`,
            accion: 'prueba',
            resumen: `resumen ${i}`,
            createdAt: new Date()
        });
    }
    const base = crearBaseFalsa({ auditoria: entradas });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/auditoria', 'admin-1');

    assert.equal(respuesta.status, 200);
    const { auditoria } = await respuesta.json();
    assert.ok(Array.isArray(auditoria));
    assert.equal(auditoria.length, 20, 'se limita a las últimas 20 entradas');
});
