'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularAnalitica, calcularClientes } = require('../lib/analitica.js');
const { normalizarEvento } = require('../lib/eventos.js');

const AHORA = new Date('2026-11-15T15:00:00Z'); /* domingo 12:00 en Montevideo */
const hace = dias => new Date(AHORA.getTime() - dias * 86400000);

function ev(tipo, idSesion, dias, extra = {}) {
    return { tipo, idSesion, pagina: '/', dispositivo: 'movil', timestamp: hace(dias), ...extra };
}

test('el evento de carrito guarda el producto y los demás no', () => {
    const base = { idSesion: 'abcdefgh-1', pagina: '/catalogo', elemento: 'add-cart', dispositivo: 'movil' };
    assert.equal(normalizarEvento({ ...base, tipo: 'agregar_al_carrito', productoId: 'albahaca' }).productoId, 'albahaca');
    assert.equal(normalizarEvento({ ...base, tipo: 'agregar_al_carrito', productoId: '<script>' }).productoId, undefined);
    assert.equal(normalizarEvento({ ...base, tipo: 'vista_de_pagina', elemento: null, productoId: 'albahaca' }).productoId, undefined);
});

test('analítica cuenta sesiones, compara períodos y mide por dispositivo', () => {
    const eventos = [
        ev('vista_de_pagina', 's1', 1), ev('vista_de_pagina', 's2', 1, { dispositivo: 'computadora' }),
        ev('vista_de_pagina', 's3', 2), ev('agregar_al_carrito', 's2', 1, { dispositivo: 'computadora', productoId: 'albahaca' }),
        ev('inicio_de_pedido', 's2', 1, { dispositivo: 'computadora' }),
        ev('vista_de_pagina', 'p1', 40)
    ];
    const r = calcularAnalitica({ eventos, dias: 30, ahora: AHORA, nombres: new Map([['albahaca', 'Albahaca']]),
        pedidos: [{ fecha: hace(1), lineas: [{ id: 'albahaca', nombre: 'Albahaca', cantidad: 1 }] }] });
    assert.equal(r.indicadores.actual.visitas, 3);
    assert.equal(r.indicadores.previo.visitas, 1);
    assert.equal(r.indicadores.actual.pedidos, 1);
    assert.equal(r.dispositivos.computadora.conversion, 100);
    assert.equal(r.dispositivos.movil.porcentaje, 67);
    assert.equal(r.serie.visitas.length, 30);
    assert.deepEqual(r.productos[0], { id: 'albahaca', nombre: 'Albahaca', agregados: 1, pedidos: 1 });
});

test('el mapa de horarios usa la hora de Montevideo', () => {
    const r = calcularAnalitica({ eventos: [ev('vista_de_pagina', 's1', 0)], dias: 7, ahora: AHORA });
    assert.equal(r.horarios[6][2], 1); /* domingo, franja de 12 a 14 */
});

test('páginas: cuántas sesiones siguen a otra página', () => {
    const eventos = [
        ev('vista_de_pagina', 's1', 1, { pagina: '/' }), ev('vista_de_pagina', 's1', 0.9, { pagina: '/catalogo' }),
        ev('vista_de_pagina', 's2', 1, { pagina: '/' })
    ];
    const inicio = calcularAnalitica({ eventos, dias: 7, ahora: AHORA }).paginas.find(p => p.pagina === '/');
    assert.equal(inicio.siguen, 50);
});

test('clientes: agrupa por teléfono, segmenta y calcula tiempos', () => {
    const pedido = (dias, tel, total, estado = 'entregado') => ({
        fecha: hace(dias), estado, total, cliente: { nombre: 'Ana', telefono: tel },
        lineas: [{ id: 'a', nombre: 'Albahaca', cantidad: 2 }]
    });
    const r = calcularClientes([
        pedido(70, '099 111 222', 100), pedido(40, '099111222', 300), pedido(5, '099-111-222', 200),
        pedido(80, '098 000 000', 50), pedido(3, '097 555 666', 10, 'cancelado')
    ], AHORA);
    assert.equal(r.segmentos.todos, 2);
    const ana = r.clientes.find(c => c.pedidos === 3);
    assert.equal(ana.total, 600);
    assert.equal(ana.estado, 'recurrente');
    assert.equal(ana.entreCompras, 33);
    assert.deepEqual(ana.favoritos, ['Albahaca']);
    assert.equal(r.clientes.find(c => c.pedidos === 1).estado, 'inactivo');
    assert.equal(r.segmentos.inactivos, 1);
});
