'use strict';

const test = require('node:test');
const { limitesDe } = require('./limites-falsos.js');
const assert = require('node:assert/strict');
const http = require('http');
const { depurarPedidos, fechaLimite } = require('../depurar.js');

function fechaHaceDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha;
}

function crearBaseFalsaConPedidos(pedidos) {
    const actualizaciones = [];
    return {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'orders') {
                return {
                    async find(filtro) {
                        const ahora = new Date();
                        const limite = new Date(ahora);
                        limite.setDate(limite.getDate() - 365);
                        let resultado = pedidos.filter(p => p.fecha < limite);
                        if (filtro && filtro.$or) {
                            resultado = resultado.filter(p => {
                                return !(p.clienteAnonimizado === true);
                            });
                        }
                        return {
                            async toArray() { return resultado; }
                        };
                    },
                    async updateOne(filtro, actualizacion) {
                        actualizaciones.push({ filtro, actualizacion });
                        const pedido = pedidos.find(p => p.id === filtro.id);
                        if (!pedido) return { matchedCount: 0, modifiedCount: 0 };
                        if (actualizacion.$set) {
                            Object.assign(pedido, actualizacion.$set);
                        }
                        return { matchedCount: 1, modifiedCount: 1 };
                    }
                };
            }
            return {};
        },
        obtenerActualizaciones() {
            return actualizaciones;
        }
    };
}

test('fechaLimite devuelve una fecha hace 365 días', () => {
    const ahora = new Date();
    const limite = fechaLimite();
    const diferencia = ahora - limite;
    const dias = diferencia / (24 * 60 * 60 * 1000);
    assert.ok(dias >= 364 && dias <= 366, `debe ser aprox 365 días, fue ${dias}`);
});

test('depura pedidos viejos (más de 365 días) y anonimiza datos personales', async () => {
    const hace400Dias = fechaHaceDias(400);
    const pedidos = [
        {
            id: 'ZAPI-viejo-1',
            fecha: hace400Dias,
            estado: 'entregado',
            canal: 'web',
            total: 2500,
            cliente: {
                nombre: 'Juan Pérez',
                telefono: '098 123 456',
                email: 'juan@example.com',
                zona: 'Centro',
                notas: 'Llamar antes de pasar'
            },
            lineas: [{ id: 1, nombre: 'Albahaca', precio: 150, cantidad: 2 }]
        }
    ];

    const base = crearBaseFalsaConPedidos(pedidos);
    const depurados = await depurarPedidos(base);

    assert.equal(depurados, 1);
    const pedido = pedidos[0];
    assert.equal(pedido.clienteAnonimizado, true);
    assert.equal(pedido.cliente.nombre, '[Anonimizado]');
    assert.equal(pedido.cliente.telefono, '[Anonimizado]');
    assert.equal(pedido.cliente.email, '[Anonimizado]');
    assert.equal(pedido.cliente.zona, '[Anonimizado]');
    assert.equal(pedido.cliente.notas, '[Anonimizado]');
    /* Estadísticas conservadas */
    assert.equal(pedido.fecha, hace400Dias);
    assert.equal(pedido.estado, 'entregado');
    assert.equal(pedido.canal, 'web');
    assert.equal(pedido.total, 2500);
    assert.deepEqual(pedido.lineas, [{ id: 1, nombre: 'Albahaca', precio: 150, cantidad: 2 }]);
});

test('no toca pedidos recientes (menos de 365 días)', async () => {
    const hace30Dias = fechaHaceDias(30);
    const pedidos = [
        {
            id: 'ZAPI-reciente-1',
            fecha: hace30Dias,
            estado: 'pendiente',
            canal: 'presencial',
            total: 1000,
            cliente: {
                nombre: 'Ana García',
                telefono: '098 987 654',
                email: 'ana@example.com',
                zona: '',
                notas: ''
            },
            lineas: []
        }
    ];

    const base = crearBaseFalsaConPedidos(pedidos);
    const depurados = await depurarPedidos(base);

    assert.equal(depurados, 0);
    const pedido = pedidos[0];
    assert.equal(pedido.clienteAnonimizado, undefined);
    assert.equal(pedido.cliente.nombre, 'Ana García');
});

test('idempotente: no anonimiza dos veces un pedido ya anonimizado', async () => {
    const hace400Dias = fechaHaceDias(400);
    const pedidos = [
        {
            id: 'ZAPI-ya-anonimizado',
            fecha: hace400Dias,
            estado: 'cancelado',
            canal: 'web',
            total: 0,
            cliente: {
                nombre: '[Anonimizado]',
                telefono: '[Anonimizado]',
                email: '[Anonimizado]',
                zona: '[Anonimizado]',
                notas: '[Anonimizado]'
            },
            clienteAnonimizado: true,
            lineas: []
        }
    ];

    const base = crearBaseFalsaConPedidos(pedidos);
    const depurados = await depurarPedidos(base);

    assert.equal(depurados, 0);
    const pedido = pedidos[0];
    assert.equal(pedido.clienteAnonimizado, true);
});

test('las estadísticas no cambian al depurar', async () => {
    const hace400Dias = fechaHaceDias(400);
    const pedidos = [
        {
            id: 'ZAPI-stats-1',
            fecha: hace400Dias,
            estado: 'confirmado',
            canal: 'presencial',
            total: 5000,
            cliente: {
                nombre: 'Luis',
                telefono: '098 111 222',
                email: 'luis@example.com',
                zona: 'Norte',
                notas: 'Sin notas'
            },
            lineas: [
                { id: 1, nombre: 'Cactus', precio: 500, cantidad: 4 },
                { id: 2, nombre: 'Suculenta', precio: 250, cantidad: 2 }
            ]
        }
    ];

    const base = crearBaseFalsaConPedidos(pedidos);
    await depurarPedidos(base);

    const pedido = pedidos[0];
    assert.equal(pedido.estado, 'confirmado');
    assert.equal(pedido.canal, 'presencial');
    assert.equal(pedido.total, 5000);
    assert.deepEqual(pedido.lineas, [
        { id: 1, nombre: 'Cactus', precio: 500, cantidad: 4 },
        { id: 2, nombre: 'Suculenta', precio: 250, cantidad: 2 }
    ]);
    assert.equal(pedido.cliente.nombre, '[Anonimizado]');
});

test('contact.createdAt se guarda como Date al ejecutar la ruta real de contacto', async t => {
    const contactosGuardados = [];
    const { crearApp } = require('../app.js');
    const base = {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'contacts') {
                return {
                    async insertOne(documento) {
                        contactosGuardados.push(documento);
                        return { insertedId: 'contacto-falso' };
                    }
                };
            }
            if (nombre === 'limites') return limitesDe(this);
            return {};
        }
    };
    const app = await crearApp({ getDatabase: () => base });
    const server = http.createServer(app);
    server.listen(0);
    t.after(() => server.close());

    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;

    const respuesta = await fetch(`http://127.0.0.1:${port}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'Ana',
            email: 'ana@example.com',
            asunto: 'Consulta',
            mensaje: 'Hola, quiero saber sobre las plantas.'
        })
    });

    assert.equal(respuesta.status, 201);
    assert.equal(contactosGuardados.length, 1);
    assert.ok(contactosGuardados[0].createdAt instanceof Date, 'createdAt es Date');
    assert.equal(typeof contactosGuardados[0].createdAt.getTime, 'function');
});
