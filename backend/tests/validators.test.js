'use strict';
/* Pruebas unitarias del validador de contacto y de la limpieza
   de texto. No necesitan Mongo: son las reglas que comparte el
   navegador (public/js/contacto.js), asi que tienen que dar lo
   mismo. */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validarContacto, esTrampa } = require('../src/validators/contacto.validator');
const { limpiarTexto, soloDigitos } = require('../src/utils/texto');

function consultaValida(extra = {}) {
    return {
        nombre: 'María Gómez',
        correo: 'maria@example.com',
        asunto: 'Presupuesto para el patio',
        telefono: '+598 9 123 4567',
        consulta: 'Quiero un presupuesto para una huerta en el patio.',
        ...extra,
    };
}

test('acepta una consulta completa y devuelve los datos limpios', () => {
    const resultado = validarContacto(consultaValida({ nombre: '  María  ' }));

    assert.equal(resultado.error, undefined);
    assert.equal(resultado.datos.nombre, 'María');
    assert.equal(resultado.datos.correo, 'maria@example.com');
});

test('rechaza nombre corto con el campo nombre', () => {
    const resultado = validarContacto(consultaValida({ nombre: 'M' }));

    assert.equal(resultado.campo, 'nombre');
    assert.ok(resultado.error);
});

test('rechaza correo sin arroba', () => {
    const resultado = validarContacto(consultaValida({ correo: 'maria.example.com' }));

    assert.equal(resultado.campo, 'correo');
});

test('rechaza asunto corto con el campo asunto', () => {
    const resultado = validarContacto(consultaValida({ asunto: 'a' }));

    assert.equal(resultado.campo, 'asunto');
    assert.ok(resultado.error);
});

test('rechaza telefono con menos de 6 digitos', () => {
    const resultado = validarContacto(consultaValida({ telefono: '+598 91' }));

    assert.equal(resultado.campo, 'telefono');
});

test('acepta telefono con guiones y espacios', () => {
    const resultado = validarContacto(consultaValida({ telefono: '098 268-560' }));

    assert.equal(resultado.error, undefined);
});

test('el telefono es opcional: vacio no corta el envio', () => {
    const resultado = validarContacto(consultaValida({ telefono: '' }));

    assert.equal(resultado.error, undefined);
    assert.equal(resultado.datos.telefono, '');
});

test('rechaza consulta corta', () => {
    const resultado = validarContacto(consultaValida({ consulta: 'hola' }));

    assert.equal(resultado.campo, 'consulta');
});

test('rechaza los tipos que no son texto sin tirar', () => {
    const resultado = validarContacto({ nombre: 42, correo: null, telefono: {}, consulta: [] });

    assert.equal(resultado.campo, 'nombre');
});

test('esTrampa detecta el honeypot relleno y vacio', () => {
    assert.equal(esTrampa({ sitio_web: '' }), false);
    assert.equal(esTrampa({}), false);
    assert.equal(esTrampa({ sitio_web: 'http://spam.example' }), true);
});

test('limpiarTexto saca caracteres de control y recorta', () => {
    const sucio = `a\u0000b\u001Fc${'x'.repeat(50)}`;

    const limpio = limpiarTexto(sucio, 10);

    assert.equal(limpio.includes('\u0000'), false);
    assert.ok(limpio.length <= 10);
});

test('soloDigitos ignora todo lo que no sea numero', () => {
    assert.equal(soloDigitos('+598 9-123-4567'), '59891234567');
    assert.equal(soloDigitos(null), '');
});
