'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { INDICES } = require('../indices.js');

function buscar(coleccion, campo) {
    return INDICES.find(i => i.coleccion === coleccion && Object.keys(i.clave).join() === campo);
}

const UN_ANIO = 365 * 24 * 60 * 60;

test('índices: contacts y testimonials rechazados vencen al año', () => {
    assert.equal(buscar('contacts', 'createdAt').opciones.expireAfterSeconds, UN_ANIO);
    assert.equal(buscar('testimonials', 'rechazadoEn').opciones.expireAfterSeconds, UN_ANIO);
});

test('índices: los TTL son de un solo campo, que es lo que MongoDB admite', () => {
    const conTtl = INDICES.filter(i => 'expireAfterSeconds' in i.opciones);
    assert.ok(conTtl.length > 0);
    for (const indice of conTtl) {
        assert.equal(Object.keys(indice.clave).length, 1, `${indice.coleccion} tiene un TTL compuesto`);
    }
});

test('índices: limites tiene clave única y TTL sobre expiraEn', () => {
    assert.equal(buscar('limites', 'clave').opciones.unique, true);
    assert.equal(buscar('limites', 'expiraEn').opciones.expireAfterSeconds, 0);
});

test('índices: eventos vence por su campo ttl y sesiones por expiresAt', () => {
    assert.equal(buscar('eventos', 'ttl').opciones.expireAfterSeconds, 0);
    assert.equal(buscar('sessions', 'expiresAt').opciones.expireAfterSeconds, 0);
});

test('índices: usuarios y pedidos tienen claves únicas', () => {
    assert.equal(buscar('users', 'email').opciones.unique, true);
    assert.equal(buscar('orders', 'id').opciones.unique, true);
});
