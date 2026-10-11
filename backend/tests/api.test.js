'use strict';
/* Pruebas de integracion HTTP de la API.

   Antes de requerir cualquier modulo del backend se fija
   NODE_ENV=test y se suben los limites: asi la app no cachea los
   estaticos y el rate limit no corta la suite. El archivo se
   ejecuta en su propio proceso (lo aisla el runner de Node), asi
   que estos valores no se filtran a otras pruebas.

   La base es una instancia efimera en memoria
   (mongodb-memory-server): no toca ningun Mongo real ni los datos
   de produccion. Si la instancia no se puede levantar (por
   ejemplo, sin permiso para descargar el binario), las pruebas de
   base se saltan con un motivo, en vez de dar falso verde. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_LIMITE_ESCRITURA = '10000';
process.env.ZAPI_LIMITE_LECTURA = '10000';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const database = require('../src/config/database');
const { crearApp } = require('../src/app');
const { Mensaje } = require('../src/models/mensaje.model');
const { Testimonio } = require('../src/models/testimonio.model');
const { sembrarTestimonios } = require('../src/services/testimonios.service');

let app = null;
let contenedor = null;
let motivoSkip = null;

const CONSULTA = {
    nombre: 'María Gómez',
    correo: 'maria@example.com',
    telefono: '+598 9 123 4567',
    consulta: 'Quiero un presupuesto para una huerta en el patio.',
};

before(async () => {
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        contenedor = await MongoMemoryServer.create();

        await database.conectar({ uri: contenedor.getUri(), reintentos: 1 });

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

    await Promise.all([
        Mensaje.deleteMany({}),
        Testimonio.deleteMany({}),
    ]);
});

test('POST /api/contacto guarda la consulta y responde 201', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/contacto')
        .send(CONSULTA);

    assert.equal(respuesta.status, 201);
    assert.deepEqual(respuesta.body, { ok: true });

    const guardados = await Mensaje.find().lean();

    assert.equal(guardados.length, 1);
    assert.equal(guardados[0].correo, 'maria@example.com');
    assert.equal(guardados[0].estado, 'nuevo');
});

test('POST /api/contacto invalido responde 400 con el campo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/contacto')
        .send({ ...CONSULTA, correo: 'no-es-un-correo' });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.campo, 'correo');
    assert.ok(respuesta.body.error);

    assert.equal(await Mensaje.countDocuments(), 0);
});

test('POST /api/contacto descarta el honeypot sin guardar', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/contacto')
        .send({ ...CONSULTA, sitio_web: 'http://spam.example' });

    assert.equal(respuesta.status, 201);
    assert.equal(await Mensaje.countDocuments(), 0);
});

test('POST /api/contacto con JSON roto responde 400', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/contacto')
        .set('Content-Type', 'application/json')
        .send('{"nombre": ');

    assert.equal(respuesta.status, 400);
    assert.ok(respuesta.body.error);
});

test('GET /api/salud responde 200 y conectado', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/api/salud');

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.ok, true);
    assert.equal(respuesta.body.mongo, 'conectado');
});

test('GET /api/testimonios devuelve solo las publicadas', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await Testimonio.create([
        {
            autor: 'Ana', lugar: 'Salto', texto: 'Muy bueno todo.', estrellas: 5,
            fecha: new Date('2026-05-11'), publicado: true,
        },
        {
            autor: 'Oculto', texto: 'No deberia salir.', estrellas: 1,
            fecha: new Date('2026-06-11'), publicado: false,
        },
    ]);

    const respuesta = await request(app).get('/api/testimonios');

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.testimonios.length, 1);
    assert.equal(respuesta.body.testimonios[0].autor, 'Ana');
});

test('sembrarTestimonios carga el JSON y no duplica al correr de nuevo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const { TESTIMONIOS } = require('../../datos/testimonios.js');

    await sembrarTestimonios();

    const primeraVez = await Testimonio.countDocuments();

    assert.equal(primeraVez, TESTIMONIOS.length);

    /* Correr el arranque dos veces (un reinicio) no puede duplicar
       las opiniones: el upsert va por autor + fecha. */
    await sembrarTestimonios();

    assert.equal(await Testimonio.countDocuments(), TESTIMONIOS.length);

    const respuesta = await request(app).get('/api/testimonios');

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.testimonios.length, TESTIMONIOS.length);

    /* Salen las mas nuevas primero: la fuente tiene la de agosto
       antes que la de mayo. */
    const fechas = respuesta.body.testimonios.map(t => new Date(t.fecha).getTime());

    assert.deepEqual(fechas, [...fechas].sort((a, b) => b - a));
});

test('una ruta de API inexistente responde 404 JSON', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/api/no-existe');

    assert.equal(respuesta.status, 404);
    assert.equal(respuesta.body.error, 'Ruta de API inexistente');
});

test('el codigo del backend no se sirve por HTTP', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/backend/src/server.js');

    assert.equal(respuesta.status, 404);
});

test('la home se sirve desde la raiz', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/');

    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers['content-type'], /html/);
});
