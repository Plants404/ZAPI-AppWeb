'use strict';

const test = require('node:test');
const { limitesDe } = require('./limites-falsos.js');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('http');
const path = require('node:path');
const { crearApp, validarOrigenes } = require('../app.js');
const { construirOperacionesProductos } = require('../seed.js');

async function conEntorno(valores, ejecutar) {
    const anteriores = new Map();
    for (const [clave, valor] of Object.entries(valores)) {
        anteriores.set(clave, process.env[clave]);
        if (valor === undefined) delete process.env[clave];
        else process.env[clave] = valor;
    }
    try {
        return await ejecutar();
    } finally {
        for (const [clave, valor] of anteriores) {
            if (valor === undefined) delete process.env[clave];
            else process.env[clave] = valor;
        }
    }
}

/* Sesión de cliente válida para los pedidos: la compra exige haber iniciado sesión. */
const COOKIE_CLIENTE = 'sessionId=sesion-cliente';

function sesionesFalsas() {
    return {
        async findOne(filtro) {
            if (filtro._id !== 'sesion-cliente') return null;
            return {
                _id: 'sesion-cliente',
                userId: 'cliente-1',
                email: 'ana@example.com',
                rol: 'cliente',
                nombre: 'Ana',
                expiresAt: new Date(Date.now() + 3600 * 1000)
            };
        }
    };
}

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
                        if (!p) return null;
                        if (filtro.stock && filtro.stock.$gte !== undefined) {
                            if (p.stock >= filtro.stock.$gte) {
                                p.stock += inc;
                                return { ...p };
                            }
                            return null;
                        }
                        if (inc) {
                            p.stock += inc;
                            return { ...p };
                        }
                        return null;
                    }
                };
            }
            if (nombre === 'limites') return limitesDe(this);
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
            if (nombre === 'sessions') return sesionesFalsas();
            if (nombre === 'auditoria') return { async insertOne() { return { insertedId: 'auditoria-falsa' }; } };
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
}

test('health comprueba la conexión a la base de datos', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, database: 'connected' });
});

test('GET /api/depurar llega al handler de cron y exige su secreto', async t => {
    const base = {
        collection(nombre) {
            assert.equal(nombre, 'orders');
            return {
                find() {
                    return { async toArray() { return []; } };
                }
            };
        }
    };

    await conEntorno({ CRON_SECRET: 'secreto-de-prueba' }, async () => {
        const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
        t.after(() => server.close());
        await new Promise(resolve => server.once('listening', resolve));

        const url = `http://127.0.0.1:${server.address().port}/api/depurar`;
        const sinSecreto = await fetch(url);
        assert.equal(sinSecreto.status, 401);

        const autorizado = await fetch(url, {
            headers: { Authorization: 'Bearer secreto-de-prueba' }
        });
        assert.equal(autorizado.status, 200);
        assert.deepEqual(await autorizado.json(), { ok: true, depurados: 0 });
    });
});

test('GET /api/diagnostico-ip exige el secreto y respeta TRUST_PROXY', async t => {
    await conEntorno({ CRON_SECRET: 'secreto-de-prueba', TRUST_PROXY: '2' }, async () => {
        const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
        t.after(() => server.close());
        await new Promise(resolve => server.once('listening', resolve));

        const url = `http://127.0.0.1:${server.address().port}/api/diagnostico-ip`;
        assert.equal((await fetch(url)).status, 401);

        const respuesta = await fetch(url, {
            headers: {
                Authorization: 'Bearer secreto-de-prueba',
                'X-Forwarded-For': '1.1.1.1, 203.0.113.7, 10.0.0.2'
            }
        });
        assert.equal(respuesta.status, 200);
        const cuerpo = await respuesta.json();
        assert.equal(cuerpo.ip, '203.0.113.7');
        assert.equal(cuerpo.trustProxy, 2);
    });
});

test('el catálogo solo expone productos públicos activos', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/products/albahaca`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        product: { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 12 }
    });
});

test('el pedido usa los precios de MongoDB, no los enviados por el cliente', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE_CLIENTE },
        body: JSON.stringify({
            cliente: { nombre: 'Ana', telefono: '098 123 456' },
            lineas: [{ id: 1, cantidad: 2, precio: 1, nombre: 'Producto falso' }],
            usuario: { id: 'falso', email: 'falso@example.com' }
        })
    });

    assert.equal(response.status, 201);
    const { order } = await response.json();
    assert.equal(order.lineas[0].precio, 150);
    assert.equal(order.subtotal, 300);
    assert.equal(order.lineas[0].nombre, 'Albahaca');
    assert.equal(order.historial[0].usuario, 'cliente-1');
});

test('contacto se guarda y devuelve solo una confirmación pública', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
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
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
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
                                return { ...producto };
                            }
                            return null;
                        }
                        if (inc && inc > 0) {
                            producto.stock += inc;
                            restauraciones.push({ id: filtro.id, cantidad: inc });
                            return { ...producto };
                        }
                        return null;
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
            if (nombre === 'limites') return limitesDe(this);
            if (nombre === 'sessions') return sesionesFalsas();
            if (nombre === 'auditoria') return { async insertOne() { return { insertedId: 'auditoria-falsa' }; } };
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
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;
    const cuerpo = {
        cliente: { nombre: 'Ana', telefono: '098 123 456' },
        lineas: [{ id: 1, cantidad: 1 }]
    };

    const primero = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: COOKIE_CLIENTE }, body: JSON.stringify(cuerpo)
    });
    const segundo = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: COOKIE_CLIENTE }, body: JSON.stringify(cuerpo)
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
                                return { ...p };
                            }
                            return null;
                        }
                        if (inc && inc > 0) {
                            p.stock += inc;
                            restauraciones.push({ id: filtro.id, cantidad: inc });
                            return { ...p };
                        }
                        return null;
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
                    async insertOne() { return { insertedId: 'registro-falso' }; }
                };
            }
            if (nombre === 'limites') return limitesDe(this);
            if (nombre === 'sessions') return sesionesFalsas();
            if (nombre === 'auditoria') return { async insertOne() { return { insertedId: 'auditoria-falsa' }; } };
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };

    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE_CLIENTE },
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
            if (nombre === 'limites') return limitesDe(this);
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
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

test('las rutas no leen findOneAndUpdate.value', () => {
    const carpeta = path.join(__dirname, '..', 'routes');
    for (const archivo of fs.readdirSync(carpeta).filter(nombre => nombre.endsWith('.js'))) {
        const fuente = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
        assert.doesNotMatch(fuente, /\.value\b/, `${archivo} no debe leer .value`);
    }
});

test('CORS exige orígenes válidos en producción y usa localhost en desarrollo', async () => {
    await conEntorno({
        NODE_ENV: 'production',
        VERCEL: undefined,
        FRONTEND_ORIGINS: undefined
    }, async () => {
        assert.throws(() => validarOrigenes(), /obligatorio en producción/);
    });

    await conEntorno({
        NODE_ENV: 'production',
        VERCEL: undefined,
        FRONTEND_ORIGINS: 'https://NOMBRE-DEL-PROYECTO.vercel.app'
    }, async () => {
        assert.throws(() => validarOrigenes(), /marcador sin resolver/);
    });

    for (const marcador of ['PEGAR_TOKEN', 'REEMPLAZAR_DOMINIO']) {
        await conEntorno({
            NODE_ENV: 'production',
            VERCEL: undefined,
            FRONTEND_ORIGINS: `https://${marcador}.example`
        }, async () => {
            assert.throws(() => validarOrigenes(), /marcador sin resolver/);
        });
    }

    await conEntorno({
        NODE_ENV: 'test',
        VERCEL: '',
        FRONTEND_ORIGINS: ''
    }, async () => {
        assert.throws(() => validarOrigenes(), /obligatorio en producción/);
    });

    await conEntorno({
        NODE_ENV: 'development',
        VERCEL: undefined,
        FRONTEND_ORIGINS: ''
    }, async () => {
        assert.deepEqual(validarOrigenes(), ['http://localhost:5500', 'http://127.0.0.1:5500']);
    });
});

test('preflight permite PATCH y credenciales solo para auth/admin con origen permitido', async t => {
    await conEntorno({
        NODE_ENV: 'test',
        VERCEL: undefined,
        FRONTEND_ORIGINS: 'https://zapi.example'
    }, async () => {
        const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
        t.after(() => server.close());
        await new Promise(resolve => server.once('listening', resolve));
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const headers = {
            Origin: 'https://zapi.example',
            'Access-Control-Request-Method': 'PATCH',
            'Access-Control-Request-Headers': 'Content-Type'
        };

        const auth = await fetch(`${baseUrl}/api/auth/login`, { method: 'OPTIONS', headers });
        assert.equal(auth.status, 204);
        assert.equal(auth.headers.get('cache-control'), 'no-store');
        assert.match(auth.headers.get('access-control-allow-methods'), /\bPATCH\b/);
        assert.equal(auth.headers.get('access-control-allow-headers'), 'Content-Type');
        assert.equal(auth.headers.get('access-control-allow-credentials'), 'true');

        const eventos = await fetch(`${baseUrl}/api/eventos`, { method: 'OPTIONS', headers });
        assert.equal(eventos.status, 204);
        assert.equal(eventos.headers.get('access-control-allow-credentials'), null);

        const publico = await fetch(`${baseUrl}/api/products`, { method: 'OPTIONS', headers });
        assert.equal(publico.status, 204);
        assert.equal(publico.headers.get('access-control-allow-credentials'), null);

        const rechazado = await fetch(`${baseUrl}/api/admin/resumen`, {
            method: 'OPTIONS',
            headers: { ...headers, Origin: 'https://ajeno.example' }
        });
        assert.equal(rechazado.status, 403);
        assert.equal(rechazado.headers.get('access-control-allow-credentials'), null);
    });
});

test('auth y admin envían Cache-Control no-store', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const auth = await fetch(`${baseUrl}/api/auth/yo`);
    const admin = await fetch(`${baseUrl}/api/admin/resumen`);
    assert.equal(auth.status, 401);
    assert.equal(admin.status, 401);
    assert.equal(auth.headers.get('cache-control'), 'no-store');
    assert.equal(admin.headers.get('cache-control'), 'no-store');
});

test('crear un pedido exige haber iniciado sesión', async t => {
    const server = http.createServer(await crearApp({ getDatabase: crearBaseFalsa })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: { nombre: 'Ana', telefono: '098 123 456' },
            lineas: [{ id: 1, cantidad: 1 }]
        })
    });

    assert.equal(response.status, 401);
});
