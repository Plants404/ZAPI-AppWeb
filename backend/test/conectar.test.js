'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { explicarError, revisarCadena } = require('../conectar.js');

test('conectar: detecta una cadena ausente, mal formada o con marcadores', () => {
    assert.match(revisarCadena(''), /Falta MONGODB_URI/);
    assert.match(revisarCadena(undefined), /Falta MONGODB_URI/);
    assert.match(revisarCadena('http://algo'), /mongodb\+srv/);
    assert.match(revisarCadena('mongodb+srv://u:<password>@c.mongodb.net/'), /marcador/);
    assert.match(revisarCadena('"mongodb+srv://u:p@c.mongodb.net/"'), /comillas/);
    assert.match(revisarCadena('mongodb+srv://u:p@ss@c.mongodb.net/'), /@ sin codificar/);
});

test('conectar: acepta una cadena bien formada', () => {
    assert.equal(revisarCadena('mongodb+srv://usuario:clave123@cluster0.abc.mongodb.net/?retryWrites=true'), null);
});

test('conectar: traduce los errores comunes y nunca devuelve el mensaje original', () => {
    const secreto = 'clave-super-secreta';
    const autenticacion = Object.assign(new Error(`bad auth ${secreto}`), { code: 18, codeName: 'AuthenticationFailed' });
    const dns = Object.assign(new Error(`querySrv ENOTFOUND ${secreto}`), { name: 'MongoAPIError' });
    const red = Object.assign(new Error(`timeout ${secreto}`), { name: 'MongoServerSelectionError' });
    const permisos = Object.assign(new Error(`not authorized ${secreto}`), { code: 13 });
    const otro = new Error(`algo raro ${secreto}`);

    assert.match(explicarError(autenticacion), /contraseña incorrectos/);
    assert.match(explicarError(dns), /encontrar el cluster/);
    assert.match(explicarError(red), /Network Access/);
    assert.match(explicarError(permisos), /readWrite/);
    for (const error of [autenticacion, dns, red, permisos, otro]) {
        assert.ok(!explicarError(error).includes(secreto), 'el texto no debe incluir el mensaje original');
    }
});
