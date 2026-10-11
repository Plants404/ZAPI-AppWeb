'use strict';
/* Pruebas del asistente: config, chat por reglas, memoria de FAQ,
   tracking y las ayudas de texto.

   El asistente no llama a ningun servicio externo: responde por
   reglas con los datos del negocio y el catalogo. Igual que el
   resto de las pruebas, el archivo corre en su propio proceso y
   usa un Mongo en memoria. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_LIMITE_ESCRITURA = '10000';
process.env.ZAPI_LIMITE_LECTURA = '10000';
process.env.ZAPI_LIMITE_CHAT = '10000';
process.env.ZAPI_SESSION_SECRET = 'secreto-de-prueba-de-32-bytes-para-tests';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const database = require('../src/config/database');
const { crearApp } = require('../src/app');
const { Faq } = require('../src/models/faq.model');
const { Evento } = require('../src/models/evento.model');
const { sembrarCatalogo } = require('../src/services/catalogo.service');
const { resumirIntereses } = require('../src/services/tracking.service');
const { normalizar, tokenizar, parecido } = require('../src/services/faq.service');
const { respuestaLocal } = require('../src/services/asistente.service');

let app = null;
let contenedor = null;
let motivoSkip = null;

before(async () => {
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        contenedor = await MongoMemoryServer.create();

        await database.conectar({ uri: contenedor.getUri(), reintentos: 1 });
        await sembrarCatalogo();

        app = crearApp();
    } catch (error) {
        motivoSkip = 'MongoDB de pruebas no disponible: ' + error.message;
    }
});

after(async () => {
    await database.cerrar();

    if (contenedor) await contenedor.stop();
});

beforeEach(async () => {
    if (motivoSkip) return;

    await Promise.all([Faq.deleteMany({}), Evento.deleteMany({})]);
});

/* ----------------------- config ----------------------- */

test('GET /api/asistente/config informa el motor y no filtra secretos', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/api/asistente/config');

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.negocio.nombre, 'ZAPI');
    assert.equal(respuesta.body.negocio.contacto.whatsapp, '098268560');
    assert.equal(respuesta.body.asistente.motor, 'reglas');
    assert.ok(!('ia' in respuesta.body));
    assert.ok(Array.isArray(respuesta.body.promociones));
});

/* ----------------------- validacion ----------------------- */

test('POST /api/asistente/chat sin mensaje responde 400 con el campo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/chat')
        .send({ mensaje: '' });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.campo, 'mensaje');
});

/* ----------------------- chat ----------------------- */

test('chat responde por reglas y guarda la FAQ para la proxima', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/chat')
        .send({ mensaje: '¿Hacen envíos a todo el país?' });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.fuente, 'reglas');
    assert.match(respuesta.body.respuesta, /Uruguay/);

    const guardadas = await Faq.countDocuments();

    assert.equal(guardadas, 1);
});

test('chat reutiliza una FAQ guardada sin volver a armarla', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const mensaje = 'Necesito información sobre suculentas y cactus';

    const primera = await request(app).post('/api/asistente/chat').send({ mensaje });

    assert.equal(primera.body.fuente, 'reglas');

    const segunda = await request(app).post('/api/asistente/chat').send({ mensaje });

    assert.equal(segunda.body.fuente, 'faq');
    assert.equal(segunda.body.respuesta, primera.body.respuesta);

    const faq = await Faq.findOne().lean();

    assert.equal(faq.frecuencia, 2);
});

test('chat arma recomendaciones con el catalogo real segun los intereses', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    /* La misma sesion (cookie) para que el chat lea los intereses
       que dejo el evento de navegacion. */
    const cliente = request.agent(app);

    await cliente
        .post('/api/asistente/tracking')
        .send({ tipo: 'ver_producto', productoId: 1, categoria: 'Aromáticas' });

    const respuesta = await cliente
        .post('/api/asistente/chat')
        .send({ mensaje: '¿Hacen envíos a todo el país?' });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.fuente, 'reglas');
    assert.equal(respuesta.body.recomendaciones.length, 1);
    assert.equal(respuesta.body.recomendaciones[0].id, 1);
    assert.equal(respuesta.body.recomendaciones[0].categoria, 'Aromáticas');
});

/* ----------------------- tracking ----------------------- */

test('POST /api/asistente/tracking guarda el evento y alimenta los intereses', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/tracking')
        .send({ tipo: 'ver_producto', productoId: 3, categoria: 'Plantas de interior' });

    assert.equal(respuesta.status, 201);

    const evento = await Evento.findOne().lean();

    assert.equal(evento.tipo, 'ver_producto');
    assert.equal(evento.productoId, 3);

    const resumen = await resumirIntereses(evento.sesion);

    assert.ok(resumen.categorias.includes('Plantas de interior'));
    assert.ok(resumen.productos.includes(3));
});

test('POST /api/asistente/tracking rechaza un tipo desconocido', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/tracking')
        .send({ tipo: 'borrar_todo' });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.campo, 'tipo');
});

/* ----------------------- ayudas de texto ----------------------- */

test('normalizar deja la clave sin acentos ni signos', () => {
    assert.equal(normalizar('¿Envíos?'), 'envios');
    assert.equal(normalizar('  Hola,   Mundo!! '), 'hola mundo');
});

test('parecido mide el solape de tokens', () => {
    const a = tokenizar('hacen envios a todo el pais');
    const b = tokenizar('hacen envios a todo el pais');

    assert.equal(parecido(a, b), 1);
    assert.ok(parecido(a, tokenizar('precios de suculentas')) < 0.3);
});

test('respuestaLocal cubre los temas del negocio y deriva a humano', () => {
    assert.match(respuestaLocal('¿cuál es el horario?').respuesta, /horario/i);
    assert.equal(respuestaLocal('quiero hablar con una persona').derivarHumano, true);
    assert.ok(respuestaLocal('algo rarísimo').respuesta.length > 0);
});
