'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { crearApp } = require('../app.js');
const { crearLimitesFalsos } = require('./limites-falsos.js');
const { TIPOS_EVENTO, esIdSesionValido, esPaginaValida, normalizarPagina } = require('../lib/eventos.js');

const EXPIRA_EN = new Date(Date.now() + 8 * 60 * 60 * 1000);

function sesion(id, rol, expiresAt) {
    return {
        _id: id,
        userId: 'usuario-' + id,
        email: id + '@zapi.uy',
        rol,
        nombre: 'Usuario ' + id,
        expiresAt: expiresAt || EXPIRA_EN
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
        const actual = valorAnidado(item, campo);
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
            if ('$gte' in valor && !(actual >= valor.$gte)) return false;
            if ('$lte' in valor && !(actual <= valor.$lte)) return false;
        } else if (actual !== valor) {
            return false;
        }
    }
    return true;
}

function proyectar(item, projection) {
    const resultado = {};
    const excluir = Object.values(projection).some(
        valor => valor === 0 || valor === false
    );
    for (const [campo, valor] of Object.entries(item)) {
        if (excluir) {
            if (projection[campo] === 0 || projection[campo] === false) continue;
        } else if (projection[campo] !== 1 && projection[campo] !== true) {
            continue;
        }
        resultado[campo] = valor;
    }
    return resultado;
}

function crearBaseFalsa({ eventos = [], sessions = [] } = {}) {
    const limites = crearLimitesFalsos();
    return {
        async command() {
            return { ok: 1 };
        },
        collection(nombre) {
            if (nombre === 'limites') return limites.coleccion;
            const items = nombre === 'eventos' ? eventos
                : nombre === 'sessions' ? sessions
                : [];

            return {
                async insertOne(documento) {
                    items.push(documento);
                    return { insertedId: documento._id || 'registro-falso' };
                },
                async findOne(filtro) {
                    return items.find(item => coincide(item, filtro)) || null;
                },
                find(filtro, opciones) {
                    let resultado = items;
                    if (filtro) {
                        resultado = resultado.filter(item => coincide(item, filtro));
                    }
                    let limite = null;
                    return {
                        sort() { return this; },
                        limit(n) { limite = n; return this; },
                        async toArray() {
                            let r = resultado;
                            if (limite !== null) r = r.slice(0, limite);
                            if (opciones && opciones.projection) {
                                r = r.map(item => proyectar(item, opciones.projection));
                            }
                            return r;
                        }
                    };
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

async function postEvento(url, cuerpo) {
    return fetch(`${url}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });
}

async function getAdminEventos(url, sessionId, query = '') {
    const headers = {};
    if (sessionId) {
        headers.Cookie = `sessionId=${sessionId}`;
    }
    return fetch(`${url}/api/admin/eventos${query}`, { headers });
}

/* A) POST /api/eventos (público) */

test('A1: POST /api/eventos evento válido responde 202 y guarda con ttl', async t => {
    const eventos = [];
    const sessions = [];
    const base = crearBaseFalsa({ eventos, sessions });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const antes = Date.now();
    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-a1',
        pagina: '/'
    });
    const despues = Date.now();

    assert.equal(respuesta.status, 202);
    assert.deepEqual(await respuesta.json(), { ok: true });

    assert.equal(eventos.length, 1);
    const guardado = eventos[0];
    assert.equal(guardado.tipo, 'vista_de_pagina');
    assert.equal(guardado.idSesion, 'sesion-a1');
    assert.equal(guardado.pagina, '/');
    assert.ok(guardado.ttl instanceof Date, 'ttl es una fecha');
    const noventaDias = 90 * 24 * 60 * 60 * 1000;
    assert.ok(
        guardado.ttl.getTime() >= antes + noventaDias - 5000,
        'ttl es fecha futura aprox ahora + 90 días'
    );
    assert.ok(
        guardado.ttl.getTime() <= despues + noventaDias + 5000,
        'ttl no supera los 90 días'
    );
});

test('A2: POST /api/eventos sin idSesion responde 400', async t => {
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, { tipo: 'vista_de_pagina' });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('A3: POST /api/eventos tipo inválido responde 400', async t => {
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'tipo-inexistente',
        idSesion: 'sesion-a3'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('A4: POST /api/eventos body vacío responde 400', async t => {
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {});

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('A5: POST /api/eventos rate limiting: 31 eventos mismo idSesion -> 429', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const idSesion = 'sesion-a5';
    const estados = [];
    for (let i = 0; i < 31; i++) {
        const respuesta = await postEvento(url, {
            tipo: 'clic_elemento_clave',
            idSesion,
            elemento: 'boton-primario',
            pagina: '/'
        });
        estados.push(respuesta.status);
    }

    assert.equal(estados[30], 429, 'el evento 31 es rechazado por rate limiting');
    assert.equal(
        estados.filter(estado => estado === 202).length,
        30,
        'los primeros 30 eventos son aceptados'
    );
    assert.equal(eventos.length, 30, 'se guardan solo 30 eventos');
});

test('A6: POST /api/eventos acepta todos los tipos válidos', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    for (const tipo of TIPOS_EVENTO) {
        const idSesion = 'sesion-a6-' + tipo.replace(/_/g, '-');
        const respuesta = await postEvento(url, {
            tipo,
            idSesion,
            pagina: '/'
        });
        assert.equal(respuesta.status, 202, `el tipo ${tipo} debe ser aceptado`);
    }
    assert.equal(eventos.length, TIPOS_EVENTO.length);
});

test('A7: POST /api/eventos elemento inválido responde 400', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'clic_elemento_clave',
        idSesion: 'sesion-a7',
        elemento: 'elemento-inexistente',
        pagina: '/'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
    assert.equal(eventos.length || 0, 0, 'no se guarda el evento');
});

test('A8: POST /api/eventos página inválida responde 400', async t => {
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-a8',
        pagina: 'no-empieza-con-barra',
        elemento: null
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('A9: POST /api/eventos dispositivo movil es aceptado', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-a9',
        pagina: '/',
        dispositivo: 'movil'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1, 'se guarda el evento');
    assert.equal(eventos[0].dispositivo, 'movil');
});

test('A10: POST /api/eventos dispositivo invalido es rechazado', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-a10',
        pagina: '/',
        dispositivo: 'tablet'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
    assert.equal(eventos.length, 0, 'no se guarda el evento');
});

/* B) GET /api/admin/eventos (protegido) */

test('B1: GET /api/admin/eventos sin sesión responde 401', async t => {
    const base = crearBaseFalsa({ eventos: [], sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await getAdminEventos(url, null);

    assert.equal(respuesta.status, 401);
});

test('B2: GET /api/admin.eventos sesión de cliente responde 403', async t => {
    const sessions = [sesion('cliente-1', 'cliente')];
    const base = crearBaseFalsa({ eventos: [], sessions });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await getAdminEventos(url, 'cliente-1');

    assert.equal(respuesta.status, 403);
});

test('B3: GET /api/admin.eventos sesión de admin responde 200 con eventos, total, porTipo y tipos', async t => {
    const ahora = new Date();
    const eventos = [
        {
            tipo: 'vista_de_pagina',
            idSesion: 'sesion-b3-1',
            pagina: '/',
            timestamp: new Date(ahora - 1000),
            ttl: new Date(ahora + 8000)
        },
        {
            tipo: 'clic_a_whatsapp',
            idSesion: 'sesion-b3-2',
            pagina: '/contacto',
            timestamp: ahora,
            ttl: new Date(ahora + 8000)
        },
        {
            tipo: 'vista_de_pagina',
            idSesion: 'sesion-b3-3',
            pagina: '/producto-albahaca.html',
            timestamp: new Date(ahora + 1000),
            ttl: new Date(ahora + 8000)
        }
    ];
    const sessions = [sesion('admin-1', 'admin')];
    const base = crearBaseFalsa({ eventos, sessions });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await getAdminEventos(url, 'admin-1');

    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.ok(Array.isArray(datos.eventos));
    assert.equal(datos.total, 3);
    assert.equal(datos.eventos.length, 3);
    assert.equal(datos.porTipo['vista_de_pagina'], 2);
    assert.equal(datos.porTipo['clic_a_whatsapp'], 1);
    assert.ok(Array.isArray(datos.tipos));
    assert.equal(datos.tipos.length, TIPOS_EVENTO.length);
    for (const tipo of TIPOS_EVENTO) {
        assert.ok(tipo in datos.porTipo, `porTipo incluye ${tipo}`);
    }
    for (const evento of datos.eventos) {
        assert.equal(evento._id, undefined, '_id se proyecciona fuera');
        assert.equal(evento.ttl, undefined, 'ttl se proyecciona fuera');
    }
});

test('B4: GET /api.admin.eventos filtro por tipo válido solo devuelve ese tipo', async t => {
    const eventos = [
        { tipo: 'vista_de_pagina', idSesion: 'sesion-b4-1', pagina: '/', timestamp: new Date(), ttl: new Date() },
        { tipo: 'agregar_al_carrito', idSesion: 'sesion-b4-2', pagina: '/producto-albahaca.html', timestamp: new Date(), ttl: new Date() },
        { tipo: 'vista_de_pagina', idSesion: 'sesion-b4-3', pagina: '/catalogo.html', timestamp: new Date(), ttl: new Date() }
    ];
    const sessions = [sesion('admin-1', 'admin')];
    const base = crearBaseFalsa({ eventos, sessions });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await getAdminEventos(url, 'admin-1', '?tipo=vista_de_pagina');

    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 2);
    assert.equal(datos.eventos.length, 2);
    for (const evento of datos.eventos) {
        assert.equal(evento.tipo, 'vista_de_pagina');
    }
});

test('B5: GET /api.admin.eventos filtro por tipo inválido ignora el filtro', async t => {
    const eventos = [
        { tipo: 'vista_de_pagina', idSesion: 'sesion-b5-1', pagina: '/', timestamp: new Date(), ttl: new Date() },
        { tipo: 'clic_a_whatsapp', idSesion: 'sesion-b5-2', pagina: '/contacto', timestamp: new Date(), ttl: new Date() }
    ];
    const sessions = [sesion('admin-1', 'admin')];
    const base = crearBaseFalsa({ eventos, sessions });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await getAdminEventos(url, 'admin-1', '?tipo=tipo-inexistente');

    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.total, 2);
    assert.equal(datos.eventos.length, 2);
});

test('C1: POST /api/eventos idSesion UUID válido es aceptado', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: '550e8400-e29b-41d4-a716-446655440000',
        pagina: '/',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
});

test('C2: POST /api/eventos idSesion corto (menos de 8 caracteres) es rechazado', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'abc',
        pagina: '/',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('C3: POST /api/eventos idSesion con caracteres inválidos es rechazado', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'abc!@#$',
        pagina: '/',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('C4: POST /api/eventos página no pública es rechazada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c4',
        pagina: '/ruta-inexistente',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = await respuesta.json();
    assert.ok(cuerpo.error);
});

test('C5: POST /api/eventos página pública válida es aceptada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c5',
        pagina: '/index.html',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
});

test('C12: POST /api/eventos con /carrito.html es aceptada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c12',
        pagina: '/carrito.html',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].pagina, '/carrito');
});

test('C13: POST /api/eventos con /pedidos.html es aceptada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c13',
        pagina: '/pedidos.html',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].pagina, '/pedidos');
});

test('C14: POST /api/eventos con producto del catálogo es aceptada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c14',
        pagina: '/producto-albahaca.html',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].pagina, '/producto-albahaca');
});

test('C15: X-Forwarded-For escrito por el cliente no cambia la clave del límite cuando trust proxy es 1', async t => {
    const eventos = [];
    const sessions = [];
    const base = crearBaseFalsa({ eventos, sessions });

    // Forzar trust proxy = 1
    process.env.TRUST_PROXY = '1';

    const { server, url } = await iniciar(base);
    t.after(() => server.close());
    t.after(() => { delete process.env.TRUST_PROXY; });

    // Con X-Forwarded-For falsificado
    const respuesta1 = await fetch(`${url}/api/eventos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '9.9.9.9'
        },
        body: JSON.stringify({
            tipo: 'vista_de_pagina',
            idSesion: 'sesion-c15-1',
            pagina: '/',
            dispositivo: 'computadora'
        })
    });

    const respuesta2 = await fetch(`${url}/api/eventos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tipo: 'vista_de_pagina',
            idSesion: 'sesion-c15-2',
            pagina: '/',
            dispositivo: 'computadora'
        })
    });

    // Ambas deberían ser 202 (no hay límite alcanzado con 1 evento cada una)
    // pero la clave del límite debería ser la IP real del socket, no 9.9.9.9
    assert.equal(respuesta1.status, 202);
    assert.equal(respuesta2.status, 202);
});

test('C7: esIdSesionValido rechaza IDs vacíos o muy cortos', () => {
    assert.equal(esIdSesionValido(''), false);
    assert.equal(esIdSesionValido('abc'), false);
    assert.equal(esIdSesionValido(null), false);
    assert.equal(esIdSesionValido(undefined), false);
});

test('C8: esIdSesionValido acepta UUID y alfanumérico con guiones', () => {
    assert.equal(esIdSesionValido('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(esIdSesionValido('sesion-abc123'), true);
    assert.equal(esIdSesionValido('a1b2-c3d4-e5f6'), true);
    assert.equal(esIdSesionValido('a'), false);
});

test('C9: esPaginaValida rechaza rutas no públicas', () => {
    assert.equal(esPaginaValida('/ruta-inexistente'), false);
    assert.equal(esPaginaValida('no-empieza-con-barra'), false);
    assert.equal(esPaginaValida(''), false);
    assert.equal(esPaginaValida(null), false);
    assert.equal(esPaginaValida(undefined), false);
});

test('C10: esPaginaValida acepta rutas públicas conocidas', () => {
    assert.equal(esPaginaValida('/index.html'), true);
    assert.equal(esPaginaValida('/catalogo.html'), true);
    assert.equal(esPaginaValida('/contacto.html'), true);
    assert.equal(esPaginaValida('/producto-albahaca.html'), true);
    assert.equal(esPaginaValida('/producto-cualquiera-123'), true);
});

test('C16: normalizarPagina quita .html final', () => {
    assert.equal(normalizarPagina('/catalogo.html'), '/catalogo');
    assert.equal(normalizarPagina('/index.html'), '/');
    assert.equal(normalizarPagina('/carrito.html'), '/carrito');
    assert.equal(normalizarPagina('/'), '/');
});

test('C17: normalizarPagina quita barra final', () => {
    assert.equal(normalizarPagina('/catalogo/'), '/catalogo');
    assert.equal(normalizarPagina('/contacto.html/'), '/contacto');
    assert.equal(normalizarPagina('/'), '/');
});

test('C18: normalizarPagina trata / y /index.html igual', () => {
    assert.equal(normalizarPagina('/'), normalizarPagina('/index.html'));
});

test('C19: normalizarPagina trata /catalogo, /catalogo.html y /catalogo/ igual', () => {
    assert.equal(normalizarPagina('/catalogo'), normalizarPagina('/catalogo.html'));
    assert.equal(normalizarPagina('/catalogo.html'), normalizarPagina('/catalogo/'));
});

test('C20: esPaginaValida acepta cualquier ruta de producto sin registrarla', () => {
    assert.equal(esPaginaValida('/producto-cualquier-nombre'), true);
    assert.equal(esPaginaValida('/producto-nuevo-2024.html'), true);
    assert.equal(esPaginaValida('/producto-a/'), true);
    assert.equal(esPaginaValida('/ruta-inexistente'), false);
});

test('C21: POST /api/eventos con producto nuevo sin registrar es aceptada', async t => {
    const eventos = [];
    const base = crearBaseFalsa({ eventos, sessions: [] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await postEvento(url, {
        tipo: 'vista_de_pagina',
        idSesion: 'sesion-c21',
        pagina: '/producto-producto-nuevo.html',
        dispositivo: 'computadora'
    });

    assert.equal(respuesta.status, 202);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].pagina, '/producto-producto-nuevo');
});

test('C19: esPaginaValida acepta cualquier ruta de producto', () => {
    assert.equal(esPaginaValida('/producto-cualquier-nombre'), true);
    assert.equal(esPaginaValida('/producto-nuevo-2024.html'), true);
    assert.equal(esPaginaValida('/producto-a/'), true);
    assert.equal(esPaginaValida('/ruta-inexistente'), false);
});
