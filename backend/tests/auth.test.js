'use strict';
/* Pruebas de integracion de las cuentas: registro, login, logout y
   la proteccion de las rutas que exigen sesion.

   Igual que el resto: entorno de test, limites altos y Mongo en
   memoria. Antes de requerir cualquier modulo del backend se fija
   NODE_ENV y se suben los limites, para que la app no cachee
   estaticos y el rate limit no corte la suite. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_LIMITE_ESCRITURA = '10000';
process.env.ZAPI_LIMITE_LECTURA = '10000';
process.env.ZAPI_LIMITE_AUTH = '10000';
process.env.ZAPI_SESSION_SECRET = 'secreto-de-prueba-de-32-bytes-para-tests';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const database = require('../src/config/database');
const { crearApp } = require('../src/app');
const { Usuario } = require('../src/models/usuario.model');
const { Sesion } = require('../src/models/sesion.model');

let app = null;
let contenedor = null;
let motivoSkip = null;

const CUENTA = {
    nombre: 'Ana Pérez',
    email: 'ana@example.com',
    clave: 'secreto123',
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
        Usuario.deleteMany({}),
        Sesion.deleteMany({}),
    ]);
});

test('registro crea la cuenta, no guarda la clave y abre sesion', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const agente = request.agent(app);

    const respuesta = await agente.post('/api/auth/registro').send(CUENTA);

    assert.equal(respuesta.status, 201);
    assert.equal(respuesta.body.usuario.email, 'ana@example.com');
    assert.equal(respuesta.body.usuario.nombre, 'Ana Pérez');
    assert.ok(respuesta.body.usuario.id);
    /* La clave nunca vuelve ni se guarda. */
    assert.equal(respuesta.body.usuario.clave, undefined);

    const guardado = await Usuario.findOne({ email: 'ana@example.com' }).lean();

    assert.ok(guardado);
    assert.equal(guardado.clave, undefined);
    assert.ok(guardado.hash && guardado.salt);
    assert.notEqual(guardado.hash, CUENTA.clave);

    const yo = await agente.get('/api/auth/yo');

    assert.equal(yo.status, 200);
    assert.equal(yo.body.usuario.email, 'ana@example.com');
});

test('registro rechaza correo invalido, clave corta y correo repetido', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const malCorreo = await request(app)
        .post('/api/auth/registro')
        .send({ ...CUENTA, email: 'sin-arroba' });

    assert.equal(malCorreo.status, 400);
    assert.equal(malCorreo.body.campo, 'email');

    const claveCorta = await request(app)
        .post('/api/auth/registro')
        .send({ ...CUENTA, clave: '123' });

    assert.equal(claveCorta.status, 400);
    assert.equal(claveCorta.body.campo, 'clave');

    await request(app).post('/api/auth/registro').send(CUENTA);

    const repetido = await request(app).post('/api/auth/registro').send(CUENTA);

    assert.equal(repetido.status, 409);
    assert.equal(repetido.body.campo, 'email');
});

test('login acepta la clave correcta y rechaza la incorrecta', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await request(app).post('/api/auth/registro').send(CUENTA);

    const ok = await request(app)
        .post('/api/auth/login')
        .send({ email: CUENTA.email, clave: CUENTA.clave });

    assert.equal(ok.status, 200);
    assert.equal(ok.body.usuario.email, CUENTA.email);

    const correoCualquiera = await request(app)
        .post('/api/auth/login')
        .send({ email: 'otro@example.com', clave: CUENTA.clave });

    const claveMal = await request(app)
        .post('/api/auth/login')
        .send({ email: CUENTA.email, clave: 'equivocada' });

    assert.equal(correoCualquiera.status, 401);
    assert.equal(claveMal.status, 401);
    /* Mismo mensaje: no hay que revelar que correos existen. */
    assert.equal(correoCualquiera.body.error, claveMal.body.error);
});

test('logout borra la sesion y /yo vuelve a null', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const agente = request.agent(app);

    await agente.post('/api/auth/registro').send(CUENTA);

    assert.equal((await agente.get('/api/auth/yo')).body.usuario.email, CUENTA.email);

    const salir = await agente.post('/api/auth/logout');

    assert.equal(salir.status, 200);
    assert.equal((await agente.get('/api/auth/yo')).body.usuario, null);
    assert.equal(await Sesion.countDocuments({}), 0);
});

test('POST /api/pedidos exige una cuenta', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/pedidos')
        .send({ nombre: 'Ana Perez', telefono: '099123456' });

    assert.equal(respuesta.status, 401);
    assert.equal(respuesta.body.codigo, 'sin-sesion');
});
