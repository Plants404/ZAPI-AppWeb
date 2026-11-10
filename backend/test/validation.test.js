'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validarContacto, validarPedido, validarTestimonio } = require('../lib/validation.js');

test('valida y normaliza una consulta de contacto', () => {
    const contacto = validarContacto({
        nombre: '  Ana  ',
        email: 'ana@example.com',
        asunto: '  Consulta de plantas ',
        telefono: '',
        mensaje: 'Quisiera conocer las plantas disponibles.'
    });

    assert.equal(contacto.nombre, 'Ana');
    assert.equal(contacto.asunto, 'Consulta de plantas');
});

test('rechaza correo inválido y campos demasiado largos', () => {
    assert.throws(() => validarContacto({
        nombre: 'Ana',
        email: 'no-es-correo',
        asunto: 'Consulta',
        mensaje: 'Quisiera conocer las plantas.'
    }), { status: 400 });
});

test('acepta pedidos solo con identificadores y cantidades válidas', () => {
    const pedido = validarPedido({
        cliente: { nombre: 'Ana', telefono: '098 123 456' },
        lineas: [{ id: 1, cantidad: 2 }, { id: 1, cantidad: 1 }]
    });

    assert.equal(pedido.cantidades.get(1), 3);
    assert.throws(() => validarPedido({
        cliente: { nombre: 'Ana', telefono: '098 123 456' },
        lineas: [{ id: 1, cantidad: 0 }]
    }), { status: 400 });
});

test('los testimonios requieren puntuación válida y se normalizan', () => {
    const testimonio = validarTestimonio({
        autor: '  Ana  ',
        texto: 'Una experiencia excelente con las plantas.',
        estrellas: 5
    });

    assert.equal(testimonio.autor, 'Ana');
    assert.equal(testimonio.productoId, null);
    assert.throws(() => validarTestimonio({
        autor: 'Ana',
        texto: 'Una experiencia excelente.',
        estrellas: 6
    }), { status: 400 });
});
