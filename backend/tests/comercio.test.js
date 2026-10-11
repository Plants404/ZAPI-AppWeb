'use strict';
/* Pruebas de integracion del modulo de comercio: catalogo, stock,
   carrito y pedidos.

   Igual que api.test.js: entorno de test, limites altos y Mongo en
   memoria. El catalogo se SIEMBRA del JSON real del sitio
   (public/data/productos.json), asi las pruebas corren sobre los
   mismos 7 productos que ve el navegador y no sobre un fixture
   que nadie mantiene.

   El carrito usa la cookie de sesion: los flujos se hacen con un
   agente de Supertest, que conserva la cookie entre peticiones. */

process.env.NODE_ENV = 'test';
process.env.ZAPI_LIMITE_ESCRITURA = '10000';
process.env.ZAPI_LIMITE_LECTURA = '10000';
process.env.ZAPI_SESSION_SECRET = 'secreto-de-prueba-de-32-bytes-para-tests';
process.env.ZAPI_ADMIN_TOKEN = 'token-de-admin-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const database = require('../src/config/database');
const { crearApp } = require('../src/app');
const { sembrarCatalogo } = require('../src/services/catalogo.service');
const { Stock } = require('../src/models/stock.model');
const { Carrito } = require('../src/models/carrito.model');
const { Pedido } = require('../src/models/pedido.model');

let app = null;
let contenedor = null;
let motivoSkip = null;

before(async () => {
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        contenedor = await MongoMemoryServer.create();

        await database.conectar({ uri: contenedor.getUri(), reintentos: 1 });

        /* Con esto las pruebas corren contra el catalogo real. */
        await sembrarCatalogo();

        app = crearApp();
    } catch (error) {
        motivoSkip = 'MongoDB de pruebas no disponible: ' + error.message;
    }
});

after(async () => {
    await database.cerrar();

    if (contenedor) await contenedor.stop();
});

beforeEach(async () => {
    if (motivoSkip) return;

    await Promise.all([
        Stock.deleteMany({}),
        Carrito.deleteMany({}),
        Pedido.deleteMany({}),
    ]);
});

async function cargarStock(productoId, unidades) {
    const app2 = app;
    const token = process.env.ZAPI_ADMIN_TOKEN;

    return request(app2)
        .put(`/api/stock/${productoId}`)
        .set('x-zapi-token', token)
        .send({ unidades });
}

test('GET /api/productos devuelve el catalogo sembrado del JSON', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const respuesta = await request(app).get('/api/productos');

    assert.equal(respuesta.status, 200);
    assert.ok(respuesta.body.productos.length >= 1);

    const primero = respuesta.body.productos[0];

    assert.ok(Number.isInteger(primero.id));
    assert.ok(primero.nombre);
    assert.ok(typeof primero.precio === 'number');
    /* Sin stock cargado las unidades son null, no 0. */
    assert.equal(primero.unidades, null);
});

test('GET /api/productos/:id funciona con id numerico y con slug', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const lista = await request(app).get('/api/productos');
    const catalogo = lista.body.productos;

    const porId = await request(app).get(`/api/productos/${catalogo[0].id}`);

    assert.equal(porId.status, 200);
    assert.equal(porId.body.producto.id, catalogo[0].id);

    const porSlug = await request(app).get(`/api/productos/${catalogo[0].slug}`);

    assert.equal(porSlug.status, 200);
    assert.equal(porSlug.body.producto.id, catalogo[0].id);

    const inexistente = await request(app).get('/api/productos/9999');

    assert.equal(inexistente.status, 404);
});

test('PUT /api/stock/:id exige el token y guarda unidades', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const sinToken = await request(app).put('/api/stock/1').send({ unidades: 10 });

    assert.equal(sinToken.status, 403);

    const malToken = await request(app)
        .put('/api/stock/1')
        .set('x-zapi-token', 'incorrecto')
        .send({ unidades: 10 });

    assert.equal(malToken.status, 403);

    const conToken = await cargarStock(1, 10);

    assert.equal(conToken.status, 200);
    assert.ok(conToken.body.ok);

    const stock = await request(app).get('/api/stock');

    assert.equal(stock.status, 200);
    assert.equal(stock.body.stock['1'], 10);
});

test('el carrito suma, fija, quita y usa el precio del catalogo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const cliente = request.agent(app);

    await cargarStock(1, 10);

    const catalogo = (await request(app).get('/api/productos')).body.productos;
    const precioUno = catalogo.find(p => p.id === 1).precio;

    const agregar = await cliente
        .post('/api/carrito')
        .send({ id: 1, cantidad: 2 });

    assert.equal(agregar.status, 201);

    await cliente.post('/api/carrito').send({ id: 1, cantidad: 3 });

    let carrito = await cliente.get('/api/carrito');

    assert.equal(carrito.status, 200);
    assert.equal(carrito.body.items.length, 1);
    assert.equal(carrito.body.items[0].cantidad, 5);
    assert.equal(carrito.body.items[0].precio, precioUno);
    assert.equal(carrito.body.total, precioUno * 5);

    const fijar = await cliente.patch('/api/carrito/1').send({ cantidad: 4 });

    assert.equal(fijar.status, 200);

    carrito = await cliente.get('/api/carrito');

    assert.equal(carrito.body.items[0].cantidad, 4);
    assert.equal(carrito.body.total, precioUno * 4);

    const quitar = await cliente.delete('/api/carrito/1');

    assert.equal(quitar.status, 200);

    carrito = await cliente.get('/api/carrito');

    assert.equal(carrito.body.items.length, 0);
    assert.equal(carrito.body.total, 0);
});

test('carrito rechaza producto inexistente y cantidad invalida', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const cliente = request.agent(app);

    const inexistente = await cliente.post('/api/carrito').send({ id: 9999 });

    assert.equal(inexistente.status, 404);

    const cero = await cliente.post('/api/carrito').send({ id: 1, cantidad: 0 });

    assert.equal(cero.status, 400);

    await cliente.post('/api/carrito').send({ id: 1 });

    const fijarCero = await cliente.patch('/api/carrito/1').send({ cantidad: 0 });

    assert.equal(fijarCero.status, 400);
});

test('POST /api/pedidos descuenta stock, cobra del catalogo y vacia el carrito', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await cargarStock(1, 10);
    await cargarStock(2, 10);

    const catalogo = (await request(app).get('/api/productos')).body.productos;
    const precioUno = catalogo.find(p => p.id === 1).precio;
    const precioDos = catalogo.find(p => p.id === 2).precio;

    const cliente = request.agent(app);

    await cliente.post('/api/carrito').send({ id: 1, cantidad: 2 });
    await cliente.post('/api/carrito').send({ id: 2, cantidad: 3 });

    const pedido = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Perez',
        telefono: '+598 99 123 456',
        email: 'ana@example.com',
        zona: 'Centro',
        notas: 'Llamar antes de llegar',
    });

    assert.equal(pedido.status, 201);
    assert.equal(pedido.body.ok, true);
    assert.match(pedido.body.id, /^Z-\d{8}-[A-F0-9]{6}$/);
    assert.equal(pedido.body.total, precioUno * 2 + precioDos * 3);

    const stock = await request(app).get('/api/stock');

    assert.equal(stock.body.stock['1'], 8);
    assert.equal(stock.body.stock['2'], 7);

    const guardado = await Pedido.findOne({ id: pedido.body.id }).lean();

    assert.ok(guardado);
    assert.equal(guardado.telefono, '+598 99 123 456');
    assert.equal(guardado.estado, 'pendiente');

    const carrito = await cliente.get('/api/carrito');

    assert.equal(carrito.body.items.length, 0);
});

test('sin stock suficiente responde 409 y no toca el stock', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await cargarStock(1, 1);

    const cliente = request.agent(app);

    await cliente.post('/api/carrito').send({ id: 1, cantidad: 5 });

    const pedido = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Perez',
        telefono: '+598 99 123 456',
    });

    assert.equal(pedido.status, 409);
    assert.equal(pedido.body.shortages.length, 1);
    assert.equal(pedido.body.shortages[0].id, 1);
    assert.equal(pedido.body.shortages[0].pedido, 5);
    assert.equal(pedido.body.shortages[0].disponibles, 1);

    const stock = await request(app).get('/api/stock');

    assert.equal(stock.body.stock['1'], 1);

    const carrito = await cliente.get('/api/carrito');

    /* El pedido no se cerro: el carrito sigue igual para que el
       visitante baje la cantidad y reintente. */
    assert.equal(carrito.body.items.length, 1);
});

test('POST /api/pedidos acepta items del cuerpo y cobra el precio del catalogo', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await cargarStock(2, 5);

    const catalogo = (await request(app).get('/api/productos')).body.productos;
    const precioDos = catalogo.find(p => p.id === 2).precio;

    /* El front manda el carrito de localStorage en el cuerpo. El
       precio manipulado de la peticion se ignora: se cobra el del
       catalogo. */
    const pedido = await request(app).post('/api/pedidos').send({
        nombre: 'Sofia Lopez',
        telefono: '091987654',
        items: [{ id: 2, cantidad: 2 }],
        precioFalso: precioDos * 100,
    });

    assert.equal(pedido.status, 201);
    assert.equal(pedido.body.total, precioDos * 2);
    assert.match(pedido.body.id, /^Z-\d{8}-[A-F0-9]{6}$/);

    const stock = await request(app).get('/api/stock');

    assert.equal(stock.body.stock['2'], 3);

    const guardado = await Pedido.findOne({ id: pedido.body.id }).lean();

    assert.equal(guardado.items[0].nombre, catalogo.find(p => p.id === 2).nombre);
    assert.equal(guardado.items[0].precio, precioDos);
});

test('POST /api/pedidos rechaza items mal formados o inexistentes', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await cargarStock(1, 10);

    const malFormado = await request(app).post('/api/pedidos').send({
        nombre: 'Ana Perez',
        telefono: '+598 99 123 456',
        items: [{ id: 1 }],
    });

    assert.equal(malFormado.status, 400);

    const inexistente = await request(app).post('/api/pedidos').send({
        nombre: 'Ana Perez',
        telefono: '+598 99 123 456',
        items: [{ id: 9999, cantidad: 1 }],
    });

    assert.equal(inexistente.status, 400);
    assert.equal(inexistente.body.error, 'Producto no encontrado');
});

test('un pedido sin nombre ni telefono no se acepta', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    await cargarStock(1, 10);

    const cliente = request.agent(app);

    await cliente.post('/api/carrito').send({ id: 1 });

    const sinNombre = await cliente.post('/api/pedidos').send({ telefono: '091234567' });

    assert.equal(sinNombre.status, 400);
    assert.equal(sinNombre.body.campo, 'nombre');

    const sinTelefono = await cliente.post('/api/pedidos').send({ nombre: 'Ana' });

    assert.equal(sinTelefono.status, 400);
    assert.equal(sinTelefono.body.campo, 'telefono');
});

test('un pedido con el carrito vacio responde 400', async (t) => {
    if (motivoSkip) return t.skip(motivoSkip);

    const cliente = request.agent(app);

    const pedido = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Perez',
        telefono: '+598 99 123 456',
    });

    assert.equal(pedido.status, 400);
    assert.equal(pedido.body.error, 'El carrito está vacío');
});