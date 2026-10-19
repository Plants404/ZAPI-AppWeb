'use strict';

const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../../backend/app');
const ContactForm = require('../../backend/models/ContactForm');
const Order = require('../../backend/models/Order');
const Stock = require('../../backend/models/Stock');
const Testimonio = require('../../backend/models/Testimonio');
const User = require('../../backend/models/User');

const ORIGIN = 'http://localhost:5500';
const config = {
    nodeEnv: 'test',
    port: 0,
    mongoUri: '',
    jwtSecret: 'test-secret-that-is-at-least-32-bytes-long',
    jwtExpiresIn: '12h',
    frontendOrigins: [ORIGIN],
    cookieName: 'zapi_session',
    cookieSameSite: 'lax',
    cookieSecure: false,
    cookieMaxAgeMs: 12 * 60 * 60 * 1000,
    trustProxy: 0,
};

let mongoServer;
let app;

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp(config);
});

beforeEach(async () => {
    await Promise.all([
        ContactForm.deleteMany({}),
        Order.deleteMany({}),
        Stock.deleteMany({}),
        Testimonio.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

async function createSession(role = 'user') {
    const user = await User.create({
        nombre: 'Ana Zapi',
        email: `${role}@example.com`,
        passwordHash: 'test-password-hash',
        role,
    });
    const token = jwt.sign({}, config.jwtSecret, {
        algorithm: 'HS256',
        subject: String(user._id),
        expiresIn: '12h',
        issuer: 'zapi-api',
        audience: 'zapi-web',
    });
    return `zapi_session=${token}`;
}

function seedProductStock(unidades = 5) {
    return Stock.create({
        productoId: 1,
        nombre: 'Albahaca',
        precioBase: 150,
        unidades,
    });
}

test('crea un pedido con precio del catálogo y descuenta stock', async () => {
    await seedProductStock(5);
    const cookie = await createSession();
    const response = await request(app)
        .post('/api/pedidos')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
            nombre: 'Ana Zapi',
            telefono: '+598 99 123 456',
            email: null,
            zona: null,
            notas: null,
            userId: new mongoose.Types.ObjectId().toString(),
            total: 1,
            items: [{ id: 1, cantidad: 2, precio: 1 }],
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.total, 300);
    assert.equal(response.body.estado, 'pendiente');

    const order = await Order.findById(response.body.id);
    const owner = await User.findOne({ email: 'user@example.com' });
    assert.equal(order.userId.toString(), owner._id.toString());
    assert.equal(order.items[0].precio, 150);
    assert.equal(order.moneda, 'UYU');
    assert.equal(order.envioPendiente, true);
    assert.equal((await Stock.findOne({ productoId: 1 })).unidades, 3);

    const history = await request(app)
        .get('/api/pedidos')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie);
    assert.equal(history.status, 200);
    assert.deepEqual(history.body.pedidos[0].items[0], {
        producto_id: 1,
        nombre: 'Albahaca',
        cantidad: 2,
        precio: 150,
    });
    assert.equal(history.body.pedidos[0].envio_pendiente, true);
});

test('rechaza pedido sin sesión con 401', async () => {
    const response = await request(app)
        .post('/api/pedidos')
        .set('Origin', ORIGIN)
        .send({
            nombre: 'Ana Zapi',
            telefono: '123456',
            items: [{ id: 1, cantidad: 1 }],
        });

    assert.equal(response.status, 401);
});

test('responde 409 con faltantes sin descontar unidades', async () => {
    await seedProductStock(2);
    const cookie = await createSession();
    const response = await request(app)
        .post('/api/pedidos')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
            nombre: 'Ana Zapi',
            telefono: '123456',
            items: [{ id: 1, cantidad: 3 }],
        });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body.shortages, [{
        id: 1,
        nombre: 'Albahaca',
        disponibles: 2,
    }]);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Stock.findOne({ productoId: 1 })).unidades, 2);
});

test('el descuento condicional evita vender stock en compras simultáneas', async () => {
    await seedProductStock(3);
    const cookieA = await createSession();
    const cookieB = await createSession('admin');
    const payload = {
        nombre: 'Ana Zapi',
        telefono: '123456',
        items: [{ id: 1, cantidad: 2 }],
    };

    const responses = await Promise.all([
        request(app).post('/api/pedidos').set('Origin', ORIGIN).set('Cookie', cookieA).send(payload),
        request(app).post('/api/pedidos').set('Origin', ORIGIN).set('Cookie', cookieB).send(payload),
    ]);

    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    assert.equal((await Stock.findOne({ productoId: 1 })).unidades, 1);
    assert.equal(await Order.countDocuments(), 1);
});

test('el honeypot de contacto responde éxito sin guardar', async () => {
    const response = await request(app)
        .post('/api/contacto')
        .set('Origin', ORIGIN)
        .send({ sitio_web: 'spam', consulta: { '$ne': '' } });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, { ok: true });
    assert.equal(await ContactForm.countDocuments(), 0);
});

test('devuelve el campo exacto al validar contacto', async () => {
    const response = await request(app)
        .post('/api/contacto')
        .set('Origin', ORIGIN)
        .send({
            nombre: 'Ana Zapi',
            correo: 'ana@example.com',
            asunto: 'Consulta',
            telefono: 123456,
            consulta: 'Quisiera consultar por una planta.',
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.campo, 'telefono');
    assert.equal(typeof response.body.error, 'string');
});

test('guarda testimonios pendientes y oculta los no aprobados', async () => {
    const unauthenticated = await request(app)
        .post('/api/testimonios')
        .set('Origin', ORIGIN)
        .send({});
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.error, 'Iniciá sesión para dejar tu opinión.');
    const invalidSession = await request(app)
        .post('/api/testimonios')
        .set('Origin', ORIGIN)
        .set('Cookie', 'zapi_session=invalid')
        .send({});
    assert.equal(invalidSession.status, 401);
    assert.equal(invalidSession.body.error, 'Iniciá sesión para dejar tu opinión.');

    const cookie = await createSession();
    const response = await request(app)
        .post('/api/testimonios')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
            autor: 'Ana Zapi',
            lugar: 'Montevideo',
            texto: 'Las plantas llegaron en excelente estado.',
            estrellas: 5,
            verificado: true,
            autorizado: true,
            userId: new mongoose.Types.ObjectId().toString(),
        });

    assert.equal(response.status, 201);
    const saved = await Testimonio.findOne({ autor: 'Ana Zapi' });
    assert.equal(saved.verificado, false);
    assert.equal(saved.autorizado, false);
    const author = await User.findOne({ email: 'user@example.com' });
    assert.equal(saved.userId.toString(), author._id.toString());

    const publicList = await request(app)
        .get('/api/testimonios')
        .set('Origin', ORIGIN);
    assert.equal(publicList.status, 200);
    assert.deepEqual(publicList.body.testimonios, []);
});

test('guarda un contacto válido como anónimo', async () => {
    const response = await request(app)
        .post('/api/contacto')
        .set('Origin', ORIGIN)
        .send({
            nombre: 'Ana Zapi',
            correo: 'ANA@example.com',
            asunto: 'Consulta general',
            telefono: '',
            consulta: 'Quisiera conocer los horarios del vivero.',
            sitio_web: '',
            userId: new mongoose.Types.ObjectId().toString(),
        });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, { ok: true });
    const saved = await ContactForm.findOne({ email: 'ana@example.com' });
    assert.equal(saved.userId, null);
    assert.equal(saved.telefono, undefined);
});

test('solo admin puede actualizar stock y aprobar testimonios', async () => {
    await seedProductStock(4);
    const publicStock = await request(app).get('/api/stock').set('Origin', ORIGIN);
    assert.equal(publicStock.status, 200);
    assert.deepEqual(publicStock.body, { stock: { '1': 4 } });

    const userCookie = await createSession();
    const forbidden = await request(app)
        .put('/api/stock/1')
        .set('Origin', ORIGIN)
        .set('Cookie', userCookie)
        .send({ unidades: 7 });
    assert.equal(forbidden.status, 403);

    const adminCookie = await createSession('admin');
    const update = await request(app)
        .put('/api/stock/1')
        .set('Origin', ORIGIN)
        .set('Cookie', adminCookie)
        .send({ unidades: 7 });
    assert.equal(update.status, 200);
    assert.equal((await Stock.findOne({ productoId: 1 })).unidades, 7);

    const testimony = await Testimonio.create({
        autor: 'Ana Zapi',
        texto: 'Una opinión pendiente para aprobación.',
        estrellas: 5,
        userId: new mongoose.Types.ObjectId(),
    });
    const approved = await request(app)
        .patch(`/api/testimonios/${testimony._id}/aprobar`)
        .set('Origin', ORIGIN)
        .set('Cookie', adminCookie);
    assert.equal(approved.status, 200);
    const visible = await request(app).get('/api/testimonios').set('Origin', ORIGIN);
    assert.equal(visible.body.testimonios.length, 1);
});
