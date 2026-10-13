'use strict';
/* Pruebas de robustez ante entradas malformadas que antes
   provocaban un 500: una ruta con % incompleto y cookies con firma
   o codificacion invalida. No necesitan Mongo: no tocan la base. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_SESSION_SECRET = 'secreto-de-prueba-de-32-bytes-para-tests';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { crearApp } = require('../src/app');
const { firmar, verificar, parsearCookies, sesion } = require('../src/middlewares/sesion');

test('una ruta con % mal codificado responde 404, no 500', async () => {
    const respuesta = await request(crearApp()).get('/%');

    assert.equal(respuesta.status, 404);
});

test('firmar y verificar redondean el id de sesion', () => {
    assert.equal(verificar(firmar('sesion-de-prueba')), 'sesion-de-prueba');
});

test('verificar devuelve null (sin tirar) ante cookies manipuladas', () => {
    assert.equal(verificar('payload.firma-corta'), null);
    assert.equal(verificar('a.b.c'), null);
    assert.equal(verificar('sin-punto'), null);
    assert.equal(verificar(''), null);
    assert.equal(verificar(undefined), null);
});

test('parsearCookies no tira con un valor % mal codificado', () => {
    const cookies = parsearCookies({ headers: { cookie: 'zapi_sesion=%; otra=ok' } });

    assert.equal(cookies.otra, 'ok');
    /* El valor no se pudo decodificar y queda crudo, pero no rompe. */
    assert.equal(cookies.zapi_sesion, '%');
});

test('el middleware de sesion no tira con una cookie manipulada', () => {
    const req = { headers: { cookie: 'zapi_sesion=a.b' } };
    const res = { cookie() {}, setHeader() {} };
    let siguiente = false;

    sesion(req, res, () => { siguiente = true; });

    assert.equal(siguiente, true);
    /* Sin cookie valida se crea una sesion nueva en el acto. */
    assert.equal(typeof req.sesion, 'string');
});
