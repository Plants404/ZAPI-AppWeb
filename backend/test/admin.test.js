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

function crearBaseFalsa({ orders = [], products = [], sessions = [], users = [], eventos = [] } = {}) {
    return {
        async command() {
            return { ok: 1 };
        },
        collection(nombre) {
            const items = nombre === 'orders' ? orders
                : nombre === 'products' ? products
                : nombre === 'sessions' ? sessions
                : nombre === 'users' ? users
                : nombre === 'eventos' ? eventos
                : [];

            return {
                async insertOne(documento) {
                    items.push(documento);
                    return { insertedId: documento._id };
                },
                async findOne(filtro) {
                    return items.find(item => coincide(item, filtro)) || null;
                },
                find(filtro) {
                    let resultado = items;
                    if (filtro) {
                        resultado = resultado.filter(item => coincide(item, filtro));
                    }
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
                            return r;
                        }
                    };
                },
                async countDocuments(filtro) {
                    return filtro ? items.filter(item => coincide(item, filtro)).length : items.length;
                }
            };
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

async function fetchAdmin(url, path, sessionId, query = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
        headers.Cookie = `sessionId=${sessionId}`;
    }
    return fetch(`${url}/api/admin${path}${query}`, { headers });
}

test('resumen sin sesión responde 401', async t => {
    const base = crearBaseFalsa();
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/resumen');
    assert.equal(respuesta.status, 401);
});

test('resumen con sesión de cliente responde 403', async t => {
    const base = crearBaseFalsa();
    base.collection('sessions').insertOne(sesion('cliente-1', 'cliente'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/resumen', 'cliente-1');
    assert.equal(respuesta.status, 403);
});

test('resumen con sesión de admin devuelve métricas del panel', async t => {
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: new Date('2026-01-10'), estado: 'confirmado', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 1000 },
            { id: 2, fecha: new Date('2026-01-10'), estado: 'entregado', canal: 'presencial', cliente: { nombre: 'Luis' }, lineas: [], total: 2000 },
            { id: 3, fecha: new Date('2026-01-10'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 500 },
            { id: 4, fecha: new Date('2026-01-10'), estado: 'cancelado', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 100 }
        ],
        products: [
            { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 2, active: true },
            { id: 2, slug: 'cactus', nombre: 'Cactus', precioBase: 100, stock: 0, active: true },
            { id: 3, slug: 'menta', nombre: 'Menta', precioBase: 80, stock: 5, active: true },
            { id: 4, slug: 'tomate', nombre: 'Tomate', precioBase: 90, stock: 1, active: false }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/resumen', 'admin-1');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.ventas, 3000);
    assert.equal(datos.ticketPromedio, 1500);
    assert.equal(datos.ventasPorSemana.length, 8);
    assert.ok(Array.isArray(datos.stockBajo));
    assert.equal(datos.pedidosPorConfirmar, 1);
    assert.equal(datos.conversion, null);
    assert.equal(datos.visitantesUnicos, 0);
    assert.equal(datos.stockBajo.length, 2);
    assert.equal(datos.stockBajo[0].id, 4);
    assert.equal(datos.stockBajo[0].stock, 1);
    assert.equal(datos.stockBajo[1].id, 1);
    assert.equal(datos.stockBajo[1].stock, 2);
});

test('pedidos sin sesión responde 401', async t => {
    const base = crearBaseFalsa();
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos');
    assert.equal(respuesta.status, 401);
});

test('pedidos con sesión de admin devuelve paginación correcta', async t => {
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: new Date('2026-01-03'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 100 },
            { id: 2, fecha: new Date('2026-01-02'), estado: 'confirmado', canal: 'presencial', cliente: { nombre: 'Luis' }, lineas: [], total: 200 },
            { id: 3, fecha: new Date('2026-01-01'), estado: 'entregado', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 300 }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos', 'admin-1');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 3);
    assert.equal(datos.pagina, 1);
    assert.equal(datos.porPagina, 20);
    assert.equal(datos.totalPaginas, 1);
    assert.equal(datos.pedidos.length, 3);
});

test('pedidos con filtro estado=pendiente solo devuelve pendientes', async t => {
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: new Date('2026-01-03'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 100 },
            { id: 2, fecha: new Date('2026-01-02'), estado: 'confirmado', canal: 'presencial', cliente: { nombre: 'Luis' }, lineas: [], total: 200 },
            { id: 3, fecha: new Date('2026-01-01'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 300 }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos', 'admin-1', '?estado=pendiente');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 2);
    assert.equal(datos.pedidos.length, 2);
    for (const pedido of datos.pedidos) {
        assert.equal(pedido.estado, 'pendiente');
    }
});

test('pedidos con filtro canal=presencial solo devuelve presencial', async t => {
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: new Date('2026-01-03'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 100 },
            { id: 2, fecha: new Date('2026-01-02'), estado: 'confirmado', canal: 'presencial', cliente: { nombre: 'Luis' }, lineas: [], total: 200 },
            { id: 3, fecha: new Date('2026-01-01'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 300 }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos', 'admin-1', '?canal=presencial');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 1);
    assert.equal(datos.pedidos.length, 1);
    assert.equal(datos.pedidos[0].canal, 'presencial');
});

test('pedidos con paginación page=2 limit=1 devuelve solo 1 pedido', async t => {
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: new Date('2026-01-03'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 100 },
            { id: 2, fecha: new Date('2026-01-02'), estado: 'confirmado', canal: 'presencial', cliente: { nombre: 'Luis' }, lineas: [], total: 200 },
            { id: 3, fecha: new Date('2026-01-01'), estado: 'pendiente', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 300 }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/pedidos', 'admin-1', '?page=2&limit=1');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 3);
    assert.equal(datos.pagina, 2);
    assert.equal(datos.porPagina, 1);
    assert.equal(datos.totalPaginas, 3);
    assert.equal(datos.pedidos.length, 1);
});

test('productos sin sesión responde 401', async t => {
    const base = crearBaseFalsa();
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos');
    assert.equal(respuesta.status, 401);
});

test('productos con sesión de admin incluye productos inactivos', async t => {
    const base = crearBaseFalsa({
        products: [
            { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 12, active: true, categoria: 'Hierbas' },
            { id: 2, slug: 'cactus', nombre: 'Cactus', precioBase: 100, stock: 0, active: false, categoria: 'Suculentas' }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchAdmin(url, '/productos', 'admin-1');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.products.length, 2);
    const inactivo = datos.products.find(p => p.id === 2);
    assert.ok(inactivo);
    assert.equal(inactivo.active, false);
    assert.equal(inactivo.stock, 0);
});

test('resumen calcula visitantes únicos y conversión desde la analítica', async t => {
    const ahora = new Date();
    const base = crearBaseFalsa({
        orders: [
            { id: 1, fecha: ahora, estado: 'entregado', canal: 'web', cliente: { nombre: 'Ana' }, lineas: [], total: 1000 }
        ],
        eventos: [
            { tipo: 'vista_de_pagina', idSesion: 's1', timestamp: ahora },
            { tipo: 'vista_de_pagina', idSesion: 's1', timestamp: ahora },
            { tipo: 'vista_de_pagina', idSesion: 's2', timestamp: ahora },
            { tipo: 'vista_de_pagina', idSesion: 's3', timestamp: ahora },
            { tipo: 'vista_de_pagina', idSesion: 's4', timestamp: ahora }
        ]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const datos = await (await fetchAdmin(url, '/resumen', 'admin-1')).json();
    assert.equal(datos.visitantesUnicos, 4);
    assert.equal(datos.conversion, 0.25);
});

test('analítica y clientes responden con datos calculados para el admin', async t => {
    const ahora = new Date();
    const base = crearBaseFalsa({
        orders: [{ id: 1, fecha: ahora, estado: 'entregado', canal: 'web', total: 500, cliente: { nombre: 'Ana', telefono: '099111222' }, lineas: [{ id: 'a', nombre: 'Albahaca', cantidad: 1 }] }],
        eventos: [{ tipo: 'vista_de_pagina', idSesion: 's1', pagina: '/', dispositivo: 'movil', timestamp: ahora }]
    });
    base.collection('sessions').insertOne(sesion('admin-1', 'admin'));
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const analitica = await (await fetch(`${url}/api/admin/analitica?dias=7`, { headers: { Cookie: 'sessionId=admin-1' } })).json();
    assert.equal(analitica.dias, 7);
    assert.equal(analitica.indicadores.actual.visitas, 1);
    const clientes = await (await fetch(`${url}/api/admin/clientes`, { headers: { Cookie: 'sessionId=admin-1' } })).json();
    assert.equal(clientes.segmentos.todos, 1);
    const sinSesion = await fetch(`${url}/api/admin/clientes`);
    assert.equal(sinSesion.status, 401);
});
