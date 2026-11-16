'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validarContenido, comprobarImagenes } = require('../lib/contenido.js');

const ID = 'a'.repeat(24);

test('acepta solo los campos del esquema y limpia los textos', () => {
    const limpio = validarContenido({
        inicio: { portada: { titulo: '  Hola   mundo ', texto: '   ', inventado: 'x' } },
        paginaFalsa: { seccion: { campo: 'x' } }
    });
    assert.deepEqual(limpio, { inicio: { portada: { titulo: 'Hola mundo' } } });
});

test('rechaza textos más largos que el máximo del campo', () => {
    assert.throws(
        () => validarContenido({ inicio: { portada: { titulo: 'x'.repeat(500) } } }),
        /admite hasta/
    );
});

test('acepta una imagen con id válido y su descripción', () => {
    const limpio = validarContenido({ inicio: { portada: { imagen: { id: ID, alt: ' Plantas ' } } } });
    assert.deepEqual(limpio.inicio.portada.imagen, { id: ID, alt: 'Plantas' });
});

test('rechaza una imagen con id inválido', () => {
    assert.throws(() => validarContenido({ inicio: { portada: { imagen: { id: 'no-es-un-id' } } } }), /imagen/);
});

test('sin contenido devuelve un objeto vacío', () => {
    assert.deepEqual(validarContenido(undefined), {});
});

test('comprobarImagenes falla si falta alguna imagen en la biblioteca', async () => {
    const db = { collection: () => ({ countDocuments: async () => 0 }) };
    await assert.rejects(
        comprobarImagenes(db, { inicio: { portada: { imagen: { id: ID, alt: '' } } } }),
        /biblioteca/
    );
});
