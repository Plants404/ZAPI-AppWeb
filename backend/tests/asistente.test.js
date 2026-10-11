'use strict';
/* Pruebas del asistente: config, chat con DeepSeek mockeado,
   memoria de FAQ, degradado sin red, tracking y las ayudas de
   texto.

   DeepSeek NO se llama de verdad: se reemplaza globalThis.fetch por
   una respuesta armada. Asi la suite no depende de la red, no gasta
   tokens y no necesita una API key real. La key falsa de aca arriba
   solo hace que config.deepseek.configurado quede en true.

   Igual que el resto de las pruebas, el archivo corre en su propio
   proceso y usa un Mongo en memoria. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_LIMITE_ESCRITURA = '10000';
process.env.ZAPI_LIMITE_LECTURA = '10000';
process.env.ZAPI_LIMITE_IA = '10000';
process.env.ASISTENTE_REINTENTOS = '0';
process.env.ASISTENTE_TIMEOUT = '1500';
process.env.DEEPSEEK_API_KEY = 'clave-de-prueba';
process.env.DEEPSEEK_BASE_URL = 'https://api.deepseek.test';

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const database = require('../src/config/database');
const { crearApp } = require('../src/app');
const { Faq } = require('../src/models/faq.model');
const { Evento } = require('../src/models/evento.model');
const { sembrarCatalogo } = require('../src/services/catalogo.service');
const { resumirIntereses } = require('../src/services/tracking.service');
const { normalizar, tokenizar, parecido } = require('../src/services/faq.service');
const { respuestaLocal, parsearRespuesta } = require('../src/services/asistente.service');

let app = null;
let contenedor = null;
let motivoSkip = null;

const fetchOriginal = globalThis.fetch;

function respuestaJson(cuerpo, estado = 200) {
    return new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/json' },
    });
}

function esVerificacion(cuerpo) {
    return Boolean(
        cuerpo
        && Array.isArray(cuerpo.messages)
        && typeof cuerpo.messages[0].content === 'string'
        && cuerpo.messages[0].content.includes('clasificador')
    );
}

/* Simula una respuesta de chat del modelo. Detecta la llamada de
   verificacion de FAQ (por el system del clasificador) y contesta
   en consecuencia. */
function mockDeepSeek({ contenido, verificacion = '{"responde": true}', contador } = {}) {
    globalThis.fetch = async (url, opciones) => {
        const cuerpo = JSON.parse(opciones.body);

        if (esVerificacion(cuerpo)) {
            return respuestaJson({
                choices: [{ message: { content: verificacion }, finish_reason: 'stop' }],
            });
        }

        if (contador) contador.generaciones++;

        return respuestaJson({
            model: 'deepseek-flash',
            choices: [{
                message: {
                    content: typeof contenido === 'string'
                        ? contenido
                        : JSON.stringify(contenido),
                },
                finish_reason: 'stop',
            }],
            usage: { total_tokens: 42 },
        });
    };
}

before(async () => {
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        contenedor = await MongoMemoryServer.create();

        await database.conectar({ uri: contenedor.getUri(), reintentos: 1 });
        await sembrarCatalogo();

        app = crearApp();
    } catch (error) {
        motivoSkip = 'MongoDB de pruebas no disponible: ' + error.message;
    }
});

after(async () => {
    globalThis.fetch = fetchOriginal;
    await database.cerrar();

    if (contenedor) await contenedor.stop();
});

beforeEach(async () => {
    if (motivoSkip) return;

    await Promise.all([Faq.deleteMany({}), Evento.deleteMany({})]);
});

afterEach(() => {
    globalThis.fetch = fetchOriginal;
});

/* ----------------------- config ----------------------- */

test('GET /api/asistente/config informa la IA activa sin filtrar la key', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/api/asistente/config');

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.negocio.nombre, 'ZAPI');
    assert.equal(respuesta.body.negocio.contacto.whatsapp, '098268560');
    assert.equal(respuesta.body.ia.configurado, true);
    assert.ok(!('key' in respuesta.body.ia));
    assert.ok(Array.isArray(respuesta.body.promociones));
});

/* ----------------------- validacion ----------------------- */

test('POST /api/asistente/chat sin mensaje responde 400 con el campo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/chat')
        .send({ mensaje: '' });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.campo, 'mensaje');
});

/* ----------------------- chat ----------------------- */

test('chat responde con el modelo y descarta recomendaciones inventadas', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    mockDeepSeek({
        contenido: {
            respuesta: 'Te recomiendo la <strong>Albahaca</strong>.',
            intencion: 'producto',
            productos: [1, 999999],
            derivarHumano: false,
        },
    });

    const respuesta = await request(app)
        .post('/api/asistente/chat')
        .send({ mensaje: '¿Qué planta me recomendás para empezar?', historial: [], carrito: [] });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.fuente, 'modelo');
    assert.match(respuesta.body.respuesta, /Albahaca/);
    assert.equal(respuesta.body.recomendaciones.length, 1);
    assert.equal(respuesta.body.recomendaciones[0].id, 1);

    const guardadas = await Faq.countDocuments();

    assert.equal(guardadas, 1);
});

test('chat reutiliza una FAQ guardada sin volver a generar', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const contador = { generaciones: 0 };

    mockDeepSeek({
        contenido: {
            respuesta: 'Las suculentas necesitan muy poca agua.',
            intencion: 'cuidado',
            productos: [],
            derivarHumano: false,
        },
        contador,
    });

    const mensaje = 'Necesito información sobre suculentas y cactus';

    const primera = await request(app).post('/api/asistente/chat').send({ mensaje });

    assert.equal(primera.body.fuente, 'modelo');
    assert.equal(contador.generaciones, 1);

    const segunda = await request(app).post('/api/asistente/chat').send({ mensaje });

    assert.equal(segunda.body.fuente, 'faq');
    assert.equal(contador.generaciones, 1);
    assert.match(segunda.body.respuesta, /suculentas/i);

    const faq = await Faq.findOne().lean();

    assert.equal(faq.frecuencia, 2);
});

test('chat cae a modo degradado si el modelo falla', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    globalThis.fetch = async () => {
        throw new Error('sin red');
    };

    const respuesta = await request(app)
        .post('/api/asistente/chat')
        .send({ mensaje: '¿Hacen envíos a todo el país?' });

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.fuente, 'degradado');
    assert.match(respuesta.body.respuesta, /Uruguay/);
    assert.ok(Array.isArray(respuesta.body.recomendaciones));
});

test('un 402 de DeepSeek se mapea al codigo saldo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    globalThis.fetch = async () => respuestaJson(
        { error: { message: 'Insufficient Balance', code: 'invalid_request_error' } },
        402
    );

    const { chat } = require('../src/services/deepseek.service');

    await assert.rejects(
        () => chat({ mensajes: [{ role: 'user', content: 'hola' }] }),
        (error) => {
            assert.equal(error.codigo, 'saldo');
            assert.equal(error.estado, 402);
            return true;
        }
    );
});

/* ----------------------- tracking ----------------------- */

test('POST /api/asistente/tracking guarda el evento y alimenta los intereses', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/tracking')
        .send({ tipo: 'ver_producto', productoId: 3, categoria: 'Plantas de interior' });

    assert.equal(respuesta.status, 201);

    const evento = await Evento.findOne().lean();

    assert.equal(evento.tipo, 'ver_producto');
    assert.equal(evento.productoId, 3);

    const resumen = await resumirIntereses(evento.sesion);

    assert.ok(resumen.categorias.includes('Plantas de interior'));
    assert.ok(resumen.productos.includes(3));
});

test('POST /api/asistente/tracking rechaza un tipo desconocido', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app)
        .post('/api/asistente/tracking')
        .send({ tipo: 'borrar_todo' });

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.campo, 'tipo');
});

/* ----------------------- ayudas de texto ----------------------- */

test('normalizar deja la clave sin acentos ni signos', () => {
    assert.equal(normalizar('¿Envíos?'), 'envios');
    assert.equal(normalizar('  Hola,   Mundo!! '), 'hola mundo');
});

test('parecido mide el solape de tokens', () => {
    const a = tokenizar('hacen envios a todo el pais');
    const b = tokenizar('hacen envios a todo el pais');

    assert.equal(parecido(a, b), 1);
    assert.ok(parecido(a, tokenizar('precios de suculentas')) < 0.3);
});

test('respuestaLocal cubre los temas del negocio y deriva a humano', () => {
    assert.match(respuestaLocal('¿cuál es el horario?').respuesta, /horario/i);
    assert.equal(respuestaLocal('quiero hablar con una persona').derivarHumano, true);
    assert.ok(respuestaLocal('algo rarísimo').respuesta.length > 0);
});

test('parsearRespuesta tolera JSON, JSON con texto alrededor y texto plano', () => {
    const directo = parsearRespuesta('{"respuesta":"hola","intencion":"saludo","productos":[1],"derivarHumano":false}', 'x');

    assert.equal(directo.respuesta, 'hola');
    assert.equal(directo.intencion, 'saludo');
    assert.deepEqual(directo.productos, [1]);

    const envuelto = parsearRespuesta('claro: {"respuesta":"ok"} listo', 'x');

    assert.equal(envuelto.respuesta, 'ok');

    const plano = parsearRespuesta('no soy json', 'x');

    assert.equal(plano.respuesta, 'no soy json');
    assert.equal(plano.intencion, 'otro');
});
