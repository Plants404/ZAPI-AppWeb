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

/* El token de admin que piden las rutas de testimonios. Se fija
   antes de requerir el backend porque config/env.js lo lee una sola
   vez, al cargarse. */
process.env.ZAPI_ADMIN_TOKEN = 'token-admin-de-prueba';

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

/* El mismo que ZAPI_ADMIN_TOKEN de arriba. */
const TOKEN = 'token-admin-de-prueba';

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

test('sembrarTestimonios conserva el producto_id de la fuente', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const { TESTIMONIOS } = require('../../datos/testimonios.js');

    await sembrarTestimonios();

    const respuesta = await request(app).get('/api/testimonios');

    assert.equal(respuesta.status, 200);

    /* La opinion de María Gómez apunta a Albahaca (id 1) y la de la
       Familia Bentancor al kit (id 7): el producto_id tiene que
       sobrevivir la siembra y la serializacion. */
    const maria = respuesta.body.testimonios.find(x => x.autor === 'María Gómez');

    assert.equal(maria.producto_id, 1);

    /* Y las opiniones sin producto salen con null, no con el campo
       ausente, para que el front no tenga que adivinar. */
    const lucia = respuesta.body.testimonios.find(x => x.autor === 'Lucía Sánchez');

    assert.equal(lucia.producto_id, null);

    assert.ok(TESTIMONIOS.some(x => x.producto_id === 7));
});

test('GET /api/testimonios/todos exige el token de admin', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const sinToken = await request(app).get('/api/testimonios/todos');

    assert.equal(sinToken.status, 403);

    const conToken = await request(app)
        .get('/api/testimonios/todos')
        .set('x-zapi-token', TOKEN);

    assert.equal(conToken.status, 200);
    assert.ok(Array.isArray(conToken.body.testimonios));
});

test('PATCH /api/testimonios/:id publica y despublica con el token', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await sembrarTestimonios();

    /* La lista de admin trae las ocultas y trae el id, que es lo que
       la publica no da. */
    const todos = await request(app)
        .get('/api/testimonios/todos')
        .set('x-zapi-token', TOKEN);

    const maria = todos.body.testimonios.find(x => x.autor === 'María Gómez');

    assert.ok(maria.id);
    assert.equal(maria.publicado, true);

    const despublicar = await request(app)
        .patch('/api/testimonios/' + maria.id)
        .set('x-zapi-token', TOKEN)
        .send({ publicado: false });

    assert.equal(despublicar.status, 200);
    assert.equal(despublicar.body.testimonio.publicado, false);

    /* Ya no sale en la lista publica. */
    const publicas = await request(app).get('/api/testimonios');

    assert.ok(!publicas.body.testimonios.some(x => x.autor === 'María Gómez'));

    /* Y volver a correr la siembra (un reinicio) NO la republica:
       el $setOnInsert de publicado respeta la decision del admin. */
    await sembrarTestimonios();

    const publicas2 = await request(app).get('/api/testimonios');

    assert.ok(!publicas2.body.testimonios.some(x => x.autor === 'María Gómez'));

    const republicar = await request(app)
        .patch('/api/testimonios/' + maria.id)
        .set('x-zapi-token', TOKEN)
        .send({ publicado: true });

    assert.equal(republicar.status, 200);
    assert.equal(republicar.body.testimonio.publicado, true);
});

test('PATCH /api/testimonios/:id valida token, cuerpo e id', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const sinToken = await request(app)
        .patch('/api/testimonios/000000000000000000000000')
        .send({ publicado: false });

    assert.equal(sinToken.status, 403);

    const cuerpoMalo = await request(app)
        .patch('/api/testimonios/000000000000000000000000')
        .set('x-zapi-token', TOKEN)
        .send({ publicado: 'si' });

    assert.equal(cuerpoMalo.status, 400);

    const idInexistente = await request(app)
        .patch('/api/testimonios/000000000000000000000000')
        .set('x-zapi-token', TOKEN)
        .send({ publicado: false });

    assert.equal(idInexistente.status, 404);
});

test('GET /api/testimonios muestra como máximo 10 opiniones', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const documentos = [];

    for (let i = 0; i < 12; i++) {
        documentos.push({
            autor: 'Autor ' + i,
            lugar: '',
            texto: 'Opinión número ' + i + ' con el texto suficiente.',
            estrellas: 5,
            fecha: new Date(Date.now() - i * 86400000),
            publicado: true,
        });
    }

    await Testimonio.create(documentos);

    const respuesta = await request(app).get('/api/testimonios');

    assert.equal(respuesta.body.testimonios.length, 10);
    /* Las más nuevas primero: la de i=0 es la fecha más reciente. */
    assert.equal(respuesta.body.testimonios[0].autor, 'Autor 0');
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
