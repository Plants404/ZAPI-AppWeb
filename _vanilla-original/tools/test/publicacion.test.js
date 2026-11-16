'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerPublicacion } = require('../lib/publicacion.js');

const PUBLICACION = {
    catalogo: [{
        id: 1,
        slug: 'albahaca',
        nombre: 'Albahaca',
        categoria: 'Aromáticas',
        imagen: 'public/img/albahaca.jpg',
        imagenes: ['public/img/albahaca.jpg'],
        descripcion: 'Planta aromática.',
        precioBase: 150,
        stock: 12,
        infoDeVenta: []
    }],
    estilo: { titulo: 'ZAPI' }
};

test('obtiene lo publicado con una sola solicitud y timeout', async () => {
    let solicitud;
    const resultado = await obtenerPublicacion({
        entorno: { ZAPI_API_URL: 'https://zapi.vercel.app/' },
        fetchImpl: async (url, opciones) => {
            solicitud = { url, opciones };
            return { ok: true, json: async () => PUBLICACION };
        },
        advertir: () => assert.fail('no debe advertir ante una respuesta válida')
    });

    assert.equal(solicitud.url, 'https://zapi.vercel.app/api/publicado');
    assert.ok(solicitud.opciones.signal instanceof AbortSignal);
    assert.deepEqual(resultado, PUBLICACION);
});

test('sin URL o durante verificación no hace solicitudes', async () => {
    const fetchImpl = async () => assert.fail('no debe hacer fetch');

    assert.equal(await obtenerPublicacion({ entorno: {}, fetchImpl }), null);
    assert.equal(await obtenerPublicacion({
        revisar: true,
        entorno: { ZAPI_API_URL: 'https://zapi.vercel.app' },
        fetchImpl
    }), null);
});

test('ante error HTTP o respuesta inválida advierte y permite fallback local', async () => {
    const advertencias = [];
    const opciones = {
        entorno: { ZAPI_API_URL: 'https://zapi.vercel.app' },
        advertir: mensaje => advertencias.push(mensaje)
    };

    assert.equal(await obtenerPublicacion({
        ...opciones,
        fetchImpl: async () => ({ ok: false, status: 404 })
    }), null);
    assert.equal(await obtenerPublicacion({
        ...opciones,
        fetchImpl: async () => ({ ok: true, json: async () => ({}) })
    }), null);
    assert.equal(advertencias.length, 2);
    assert.ok(advertencias.every(mensaje => mensaje.includes('Se usarán los datos locales.')));
});

test('ante timeout de fetch advierte y permite fallback local', async () => {
    let advertencia;
    const error = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    const resultado = await obtenerPublicacion({
        entorno: { ZAPI_API_URL: 'https://zapi.vercel.app' },
        fetchImpl: async () => { throw error; },
        advertir: mensaje => { advertencia = mensaje; }
    });

    assert.equal(resultado, null);
    assert.match(advertencia, /tiempo de espera/);
});

test('rechaza slugs inseguros para usar el catálogo local', async () => {
    let advertencia;
    const resultado = await obtenerPublicacion({
        entorno: { ZAPI_API_URL: 'https://zapi.vercel.app' },
        fetchImpl: async () => ({
            ok: true,
            json: async () => ({
                catalogo: [{ ...PUBLICACION.catalogo[0], slug: '../otro' }]
            })
        }),
        advertir: mensaje => { advertencia = mensaje; }
    });

    assert.equal(resultado, null);
    assert.match(advertencia, /datos locales/);
});
