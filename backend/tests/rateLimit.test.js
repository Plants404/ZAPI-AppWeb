'use strict';
/* Prueba del limitador, sin servidor ni base: se le pasan req/res
   de mentira y se mira si deja pasar o corta con 429. */

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
    crearLimite, reiniciar, usarAlmacen, crearAlmacenEnMemoria,
} = require('../src/middlewares/rateLimit');

/* El contador vive en el modulo y se comparte entre casos: sin
   esto, el segundo test arrancaria con las cuentas del primero. */
beforeEach(() => reiniciar());

function reqFalso(ip) {
    return { ip };
}

function resFalso() {
    return {
        statusCode: 0,
        headers: {},
        cuerpo: null,
        setHeader(clave, valor) { this.headers[clave] = valor; },
        status(codigo) { this.statusCode = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; },
    };
}

test('deja pasar hasta el maximo y despues corta con 429', () => {
    const limite = crearLimite(60000, 2);

    const primera = resFalso();
    const segunda = resFalso();
    const tercera = resFalso();

    let pasaron = 0;

    limite(reqFalso('1.1.1.1'), primera, () => { pasaron++; });
    limite(reqFalso('1.1.1.1'), segunda, () => { pasaron++; });
    limite(reqFalso('1.1.1.1'), tercera, () => { pasaron++; });

    assert.equal(pasaron, 2);
    assert.equal(tercera.statusCode, 429);
    assert.ok(tercera.cuerpo.error);
    assert.ok(tercera.headers['Retry-After']);
});

test('cada IP tiene su propia cuenta', () => {
    const limite = crearLimite(60000, 1);

    const a1 = resFalso();
    const b1 = resFalso();
    const a2 = resFalso();

    let pasaron = 0;
    const seguir = () => { pasaron++; };

    limite(reqFalso('1.1.1.1'), a1, seguir);
    limite(reqFalso('2.2.2.2'), b1, seguir);
    limite(reqFalso('1.1.1.1'), a2, seguir);

    assert.equal(pasaron, 2);
    assert.equal(a2.statusCode, 429);
});

/* Dos limites distintos con la misma IP no pueden compartir el
   contador: si lo hicieran, una racha de lecturas gastaria el cupo
   del login (y al reves). */
test('dos limites distintos no comparten cuenta para la misma IP', () => {
    const lectura = crearLimite(60000, 100);
    const auth = crearLimite(60000, 1);

    for (let i = 0; i < 5; i++) {
        lectura(reqFalso('1.1.1.1'), resFalso(), () => {});
    }

    const acceso = resFalso();

    auth(reqFalso('1.1.1.1'), acceso, () => {});

    assert.equal(acceso.statusCode, 0, 'el login no debe quedar cortado por las lecturas');
});

/* El contador se puede mover a un almacen externo. Se inyecta uno
   que responde con promesa para cubrir el camino asincrono (el que
   usaria un adaptador sobre Redis). */
test('el limitador usa el almacen inyectado, tambien si es asincrono', async () => {
    const llamadas = [];

    usarAlmacen({
        consumir(opciones) {
            llamadas.push(opciones.clave);

            return Promise.resolve({ permitido: llamadas.length <= 1 });
        },
    });

    try {
        const limite = crearLimite(60000, 5, 'inyectado');

        const primera = resFalso();
        const segunda = resFalso();

        let pasaron = 0;

        await limite(reqFalso('9.9.9.9'), primera, () => { pasaron++; });
        await limite(reqFalso('9.9.9.9'), segunda, () => { pasaron++; });

        assert.equal(pasaron, 1);
        assert.equal(segunda.statusCode, 429);
        assert.ok(segunda.headers['Retry-After']);
        assert.equal(llamadas.length, 2);
    } finally {
        usarAlmacen(crearAlmacenEnMemoria());
    }
});
