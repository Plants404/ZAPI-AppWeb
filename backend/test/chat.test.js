'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { crearApp } = require('../app.js');
const { validarMensajes, armarInstrucciones, consultarGemini } = require('../lib/chat.js');
const { limitesDe } = require('./limites-falsos.js');

function baseFalsa() {
    const productos = [
        { id: 1, nombre: 'Albahaca', categoria: 'Aromáticas', precioBase: 150, stock: 12, active: true }
    ];
    return {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'products') {
                return { find() { return { sort() { return this; }, async toArray() { return productos; } }; } };
            }
            if (nombre === 'limites') return limitesDe(this);
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
}

async function servidor(t, opciones) {
    const server = http.createServer(await crearApp({ getDatabase: baseFalsa, ...opciones })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    return `http://127.0.0.1:${server.address().port}/api/chat`;
}

const enviar = (url, cuerpo) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
});

test('validarMensajes recorta, ordena y exige que el último sea del visitante', () => {
    const largo = 'a'.repeat(900);
    const lista = validarMensajes({ mensajes: [
        { rol: 'bot', texto: 'Hola' },
        { rol: 'user', texto: largo }
    ] });
    assert.equal(lista.length, 1);
    assert.equal(lista[0].texto.length, 500);
    assert.throws(() => validarMensajes({ mensajes: [{ rol: 'bot', texto: 'Hola' }] }));
    assert.throws(() => validarMensajes({ mensajes: [] }));
    assert.throws(() => validarMensajes({}));
    assert.throws(() => validarMensajes({ mensajes: [{ rol: 'user', texto: '   ' }] }));
});

test('las instrucciones incluyen el catálogo y las reglas', () => {
    const texto = armarInstrucciones(
        [{ nombre: 'Albahaca', categoria: 'Aromáticas', precioBase: 150, stock: 0 }],
        { whatsappVisible: '098 268 560', direccion: 'Montevideo', envioGratis: 2500 }
    );
    assert.match(texto, /Albahaca/);
    assert.match(texto, /sin stock/);
    assert.match(texto, /no lo inventes/);
});

test('consultarGemini manda la clave en un encabezado y lee el texto', async () => {
    let pedido;
    const texto = await consultarGemini({
        apiKey: 'clave-falsa',
        instrucciones: 'Sos un bot',
        mensajes: [{ rol: 'user', texto: 'Hola' }],
        fetchImpl: async (url, opciones) => {
            pedido = { url, opciones };
            return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hola, ¿qué tal?' }] } }] }) };
        }
    });
    assert.equal(texto, 'Hola, ¿qué tal?');
    assert.equal(pedido.opciones.headers['x-goog-api-key'], 'clave-falsa');
    assert.ok(!pedido.url.includes('clave-falsa'));
    assert.equal(JSON.parse(pedido.opciones.body).contents[0].role, 'user');
});

test('/api/chat responde 503 si no hay clave configurada', async t => {
    const anterior = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    t.after(() => { if (anterior !== undefined) process.env.GEMINI_API_KEY = anterior; });
    const url = await servidor(t);
    const respuesta = await enviar(url, { mensajes: [{ rol: 'user', texto: 'Hola' }] });
    assert.equal(respuesta.status, 503);
});

test('/api/chat devuelve la respuesta de la IA y valida el cuerpo', async t => {
    process.env.GEMINI_API_KEY = 'clave-falsa';
    t.after(() => { delete process.env.GEMINI_API_KEY; });
    let recibido;
    const url = await servidor(t, {
        consultarChat: async datos => { recibido = datos; return 'Tenemos albahaca.'; }
    });

    const ok = await enviar(url, { mensajes: [{ rol: 'user', texto: '¿Tienen albahaca?' }] });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { respuesta: 'Tenemos albahaca.' });
    assert.match(recibido.instrucciones, /Albahaca/);

    const mal = await enviar(url, { mensajes: [] });
    assert.equal(mal.status, 400);
});

test('/api/chat devuelve 502 si Gemini falla', async t => {
    process.env.GEMINI_API_KEY = 'clave-falsa';
    t.after(() => { delete process.env.GEMINI_API_KEY; });
    const { HttpError } = require('../lib/http-error.js');
    const url = await servidor(t, { consultarChat: async () => { throw new HttpError(502, 'caído'); } });
    const respuesta = await enviar(url, { mensajes: [{ rol: 'user', texto: 'Hola' }] });
    assert.equal(respuesta.status, 502);
});
