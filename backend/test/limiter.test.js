'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { POLITICAS, verificarLimite } = require('../lib/limiter.js');
const { crearLimitesFalsos } = require('./limites-falsos.js');

function baseCon(limites) {
    return { collection: () => limites.coleccion };
}

test('limiter: permite hasta el límite y bloquea el siguiente con Retry-After', async () => {
    const limites = crearLimitesFalsos();
    const db = baseCon(limites);
    const { limite } = POLITICAS.contacto;

    for (let i = 0; i < limite; i += 1) {
        assert.equal((await verificarLimite(db, 'contacto', '1.2.3.4')).permitido, true);
    }
    const bloqueado = await verificarLimite(db, 'contacto', '1.2.3.4');
    assert.equal(bloqueado.permitido, false);
    assert.ok(bloqueado.retryAfter >= 1);
});

test('limiter: reinicia el contador cuando vence la ventana, sin esperar al TTL', async () => {
    const limites = crearLimitesFalsos();
    const db = baseCon(limites);
    const { limite } = POLITICAS.contacto;

    for (let i = 0; i <= limite; i += 1) await verificarLimite(db, 'contacto', '1.2.3.4');
    limites.documentos[0].expiraEn = new Date(Date.now() - 1000);

    assert.equal((await verificarLimite(db, 'contacto', '1.2.3.4')).permitido, true);
    assert.equal(limites.documentos[0].count, 1);
    assert.ok(limites.documentos[0].expiraEn > new Date());
});

test('limiter: cuenta por separado cada IP y cada política', async () => {
    const limites = crearLimitesFalsos();
    const db = baseCon(limites);

    await verificarLimite(db, 'contacto', '1.2.3.4');
    await verificarLimite(db, 'contacto', '1.2.3.4');
    await verificarLimite(db, 'contacto', '5.6.7.8');
    await verificarLimite(db, 'pedidos', '1.2.3.4');

    const cuentas = Object.fromEntries(limites.documentos.map(d => [d.clave, d.count]));
    assert.deepEqual(cuentas, {
        'contacto:1.2.3.4': 2,
        'contacto:5.6.7.8': 1,
        'pedidos:1.2.3.4': 1
    });
});

test('limiter: si otra petición abrió la ventana a la vez, suma sobre la suya', async () => {
    const limites = crearLimitesFalsos({ carrera: true });
    const db = baseCon(limites);

    const resultado = await verificarLimite(db, 'contacto', '1.2.3.4');

    assert.equal(resultado.permitido, true);
    assert.equal(limites.documentos.length, 1);
    assert.equal(limites.documentos[0].count, 2);
});

test('limiter: falla cerrado, un error de Mongo no deja pasar la petición', async () => {
    const db = {
        collection: () => ({
            async findOneAndUpdate() {
                throw new Error('Mongo no responde');
            }
        })
    };

    await assert.rejects(() => verificarLimite(db, 'login', '1.2.3.4'), /Mongo no responde/);
});

test('limiter: una política desconocida es un error, no un permiso', async () => {
    const db = baseCon(crearLimitesFalsos());
    await assert.rejects(() => verificarLimite(db, 'inventada', 'x'), /desconocida/);
});

test('limites falsos: rechazan operadores en conflicto como lo hace MongoDB', async () => {
    const { coleccion } = crearLimitesFalsos();
    await assert.rejects(
        () => coleccion.findOneAndUpdate(
            { clave: 'a' },
            { $set: { expiraEn: new Date() }, $setOnInsert: { expiraEn: new Date() } },
            { upsert: true }
        ),
        /Conflicto/
    );
});
