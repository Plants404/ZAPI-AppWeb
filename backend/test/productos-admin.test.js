'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { ObjectId } = require('mongodb');
const { crearApp } = require('../app.js');

function coincide(item, filtro) {
    return Object.entries(filtro).every(([campo, valor]) => item[campo] === valor || (valor instanceof ObjectId && String(item[campo]) === String(valor)));
}

function crearBase({ products = [] } = {}) {
    const colecciones = {
        products,
        imagenes: [],
        auditoria: [],
        sessions: [{ _id: 'adm', userId: 'u1', email: 'a@zapi.uy', rol: 'admin', nombre: 'A', expiresAt: new Date(Date.now() + 3600000) }]
    };
    return {
        colecciones,
        async command() { return { ok: 1 }; },
        collection(nombre) {
            const items = colecciones[nombre] || (colecciones[nombre] = []);
            return {
                async insertOne(doc) {
                    if (!doc._id) doc._id = new ObjectId();
                    items.push(doc);
                    return { insertedId: doc._id };
                },
                async findOne(filtro) { return items.find(i => coincide(i, filtro)) || null; },
                find(filtro) {
                    let r = items.filter(i => coincide(i, filtro || {}));
                    return {
                        sort(orden) {
                            const [[campo, dir]] = Object.entries(orden);
                            r = [...r].sort((a, b) => (a[campo] - b[campo]) * dir);
                            return this;
                        },
                        limit(n) { r = r.slice(0, n); return this; },
                        async toArray() { return r; }
                    };
                },
                async findOneAndUpdate(filtro, { $set }) {
                    const doc = items.find(i => coincide(i, filtro));
                    if (!doc) return null;
                    Object.assign(doc, $set);
                    return doc;
                }
            };
        }
    };
}

async function iniciar(base) {
    const app = await crearApp({ getDatabase: () => base });
    const server = http.createServer(app);
    server.listen(0);
    await new Promise(r => server.once('listening', r));
    return { server, url: `http://127.0.0.1:${server.address().port}` };
}

function enviar(url, ruta, metodo, cuerpo, { sesion = 'adm', tipo = 'application/json' } = {}) {
    const headers = { 'Content-Type': tipo };
    if (sesion) headers.Cookie = `sessionId=${sesion}`;
    return fetch(url + ruta, {
        method: metodo,
        headers,
        body: tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo
    });
}

const base1 = () => ({ id: 1, slug: 'albahaca', nombre: 'Albahaca', categoria: 'Aromáticas', precioBase: 150, stock: 8, active: true, visible: true, imagenes: [], imagen: '' });

test('crear producto asigna id, active y audita', async t => {
    const base = crearBase({ products: [base1()] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const r = await enviar(url, '/api/admin/productos', 'POST', { slug: 'menta', nombre: 'Menta', precioBase: 100, stock: 8, categoria: 'Aromáticas', imagenes: ['public/img/menta.opt.jpg'] });
    assert.equal(r.status, 201);
    const { product } = await r.json();
    assert.equal(product.id, 2);
    assert.equal(product.active, true);
    assert.equal(product.imagen, 'public/img/menta.opt.jpg');
    assert.equal(base.colecciones.auditoria[0].accion, 'producto.alta');
});

test('crear rechaza slug repetido, datos inválidos y falta de sesión', async t => {
    const { server, url } = await iniciar(crearBase({ products: [base1()] }));
    t.after(() => server.close());

    assert.equal((await enviar(url, '/api/admin/productos', 'POST', { slug: 'albahaca', nombre: 'X', precioBase: 1, stock: 1 })).status, 409);
    assert.equal((await enviar(url, '/api/admin/productos', 'POST', { slug: 'Mal Slug', nombre: 'X', precioBase: 1, stock: 1 })).status, 400);
    assert.equal((await enviar(url, '/api/admin/productos', 'POST', { slug: 'ok', nombre: 'X', precioBase: -1, stock: 1 })).status, 400);
    assert.equal((await enviar(url, '/api/admin/productos', 'POST', { slug: 'ok', nombre: 'X', precioBase: 1, stock: 1 }, { sesion: null })).status, 401);
});

test('editar producto actualiza campos, imágenes y audita', async t => {
    const base = crearBase({ products: [base1()] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const r = await enviar(url, '/api/admin/productos/1', 'PATCH', {
        nombre: 'Albahaca genovesa', descripcion: 'Nueva', stock: 5, active: false, destacado: true,
        imagenes: ['public/img/a.opt.jpg', '/api/imagenes/0123456789abcdef01234567'],
        infoDeVenta: ['Mata de 20 cm', '']
    });
    assert.equal(r.status, 200);
    const { product } = await r.json();
    assert.equal(product.nombre, 'Albahaca genovesa');
    assert.equal(product.active, false);
    assert.equal(product.imagen, 'public/img/a.opt.jpg');
    assert.deepEqual(product.infoDeVenta, ['Mata de 20 cm']);
    assert.equal(base.colecciones.auditoria[0].accion, 'producto.editar');
});

test('editar rechaza imágenes peligrosas, producto inexistente y cuerpo vacío', async t => {
    const { server, url } = await iniciar(crearBase({ products: [base1()] }));
    t.after(() => server.close());

    assert.equal((await enviar(url, '/api/admin/productos/1', 'PATCH', { imagenes: ['javascript:alert(1)'] })).status, 400);
    assert.equal((await enviar(url, '/api/admin/productos/1', 'PATCH', { imagenes: ['http://sitio.com/a.jpg'] })).status, 400);
    assert.equal((await enviar(url, '/api/admin/productos/99', 'PATCH', { stock: 1 })).status, 404);
    assert.equal((await enviar(url, '/api/admin/productos/1', 'PATCH', {})).status, 400);
    assert.equal((await enviar(url, '/api/admin/productos/1', 'PATCH', { stock: 1.5 })).status, 400);
});

test('subir y servir una imagen', async t => {
    const { server, url } = await iniciar(crearBase());
    t.after(() => server.close());

    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
    const r = await enviar(url, '/api/admin/imagenes', 'POST', jpg, { tipo: 'image/jpeg' });
    assert.equal(r.status, 201);
    const { url: ruta } = await r.json();
    assert.match(ruta, /^\/api\/imagenes\/[a-f0-9]{24}$/);

    const g = await fetch(url + ruta);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await g.arrayBuffer()), jpg);
});

test('subida rechaza archivos falsos, tipos no admitidos y sin sesión', async t => {
    const { server, url } = await iniciar(crearBase());
    t.after(() => server.close());

    const falso = Buffer.from('<script>alert(1)</script>');
    assert.equal((await enviar(url, '/api/admin/imagenes', 'POST', falso, { tipo: 'image/jpeg' })).status, 400);
    assert.equal((await enviar(url, '/api/admin/imagenes', 'POST', falso, { tipo: 'text/html' })).status, 415);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64)]);
    assert.equal((await enviar(url, '/api/admin/imagenes', 'POST', jpg, { tipo: 'image/jpeg', sesion: null })).status, 401);
    assert.equal((await fetch(url + '/api/imagenes/zzz')).status, 404);
});
