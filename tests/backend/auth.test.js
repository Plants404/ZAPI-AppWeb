'use strict';

const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const ContactForm = require('../../backend/models/ContactForm');
const Order = require('../../backend/models/Order');
const User = require('../../backend/models/User');
const { createApp } = require('../../backend/app');

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
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test('registra usuarios como user y establece cookie HttpOnly', async () => {
    const response = await request(app)
        .post('/api/auth/registro')
        .set('Origin', ORIGIN)
        .send({
            nombre: 'Ana Zapi',
            email: 'ANA@EXAMPLE.COM',
            clave: 'clave-segura-2026',
            role: 'admin',
        });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.usuario, {
        id: response.body.usuario.id,
        nombre: 'Ana Zapi',
        email: 'ana@example.com',
        role: 'user',
    });
    assert.match(response.headers['set-cookie'][0], /HttpOnly/i);
    assert.match(response.headers['set-cookie'][0], /zapi_session=/);

    const savedUser = await User.findOne({ email: 'ana@example.com' }).select('+passwordHash');
    assert.notEqual(savedUser.passwordHash, 'clave-segura-2026');
});

test('valida el teléfono opcional del usuario', async () => {
    const user = new User({
        nombre: 'Ana Zapi',
        email: 'ana@example.com',
        telefono: '+54 11 5555-1234',
        passwordHash: 'hash',
    });

    await user.validate();
    user.telefono = 'teléfono inválido';
    await assert.rejects(user.validate(), error => Boolean(error.errors.telefono));
});

test('acepta formularios de contacto anónimos y vinculados a una cuenta', async () => {
    const user = await User.create({
        nombre: 'Ana Zapi',
        email: 'ana@example.com',
        passwordHash: 'hash',
    });
    const anonymousForm = new ContactForm({
        nombre: 'Visitante',
        email: 'visitante@example.com',
        asunto: 'Consulta general',
        mensaje: 'Quisiera recibir información del vivero.',
    });
    const registeredForm = new ContactForm({
        userId: user._id,
        nombre: user.nombre,
        email: user.email,
        asunto: 'Consulta de pedido',
        mensaje: 'Quisiera consultar por el estado de mi pedido.',
    });

    await anonymousForm.validate();
    assert.equal(anonymousForm.userId, null);
    await registeredForm.validate();
    assert.equal(registeredForm.estado, 'nuevo');
});

test('valida pedidos con snapshot histórico de productos y dirección incrustada', async () => {
    const order = new Order({
        userId: new mongoose.Types.ObjectId(),
        items: [{
            productId: new mongoose.Types.ObjectId(),
            nombre: 'Albahaca',
            cantidad: 2,
            precioUnitario: 1200,
        }],
        total: 2400,
        metodoPago: 'transferencia',
        direccionEnvio: {
            nombreDestinatario: 'Ana Zapi',
            telefono: '+54 11 5555-1234',
            calle: 'Calle Verde',
            numero: '123',
            ciudad: 'Buenos Aires',
            provincia: 'Buenos Aires',
            codigoPostal: '1000',
        },
    });

    await order.validate();
    assert.equal(order.estado, 'pendiente');
    assert.equal(order.moneda, 'ARS');
    assert.equal(order.items[0].precioUnitario, 1200);
    assert.ok(order.items[0].schema.path('precioUnitario').options.immutable);
});

test('rechaza pedidos sin productos o con cantidades fraccionarias', async () => {
    const emptyOrder = new Order({
        userId: new mongoose.Types.ObjectId(),
        items: [],
        total: 0,
        metodoPago: 'efectivo',
        direccionEnvio: {},
    });
    const fractionalOrder = new Order({
        userId: new mongoose.Types.ObjectId(),
        items: [{
            productId: new mongoose.Types.ObjectId(),
            nombre: 'Albahaca',
            cantidad: 1.5,
            precioUnitario: 1200,
        }],
        total: 1800,
        metodoPago: 'efectivo',
        direccionEnvio: {},
    });

    await assert.rejects(emptyOrder.validate(), error => Boolean(error.errors.items));
    await assert.rejects(
        fractionalOrder.validate(),
        error => Boolean(error.errors['items.0.cantidad'])
    );
});

test('rechaza claves débiles y registros duplicados', async () => {
    const payload = { nombre: 'Ana', email: 'ana@example.com', clave: 'corta' };
    const weakPassword = await request(app)
        .post('/api/auth/registro')
        .set('Origin', ORIGIN)
        .send(payload);
    assert.equal(weakPassword.status, 400);

    const validPayload = { ...payload, clave: 'clave-segura-2026' };
    await request(app).post('/api/auth/registro').set('Origin', ORIGIN).send(validPayload);
    const duplicate = await request(app)
        .post('/api/auth/registro')
        .set('Origin', ORIGIN)
        .send(validPayload);
    assert.equal(duplicate.status, 409);
});

test('rechaza solicitudes de login y registro sin cuerpo', async () => {
    const registration = await request(app)
        .post('/api/auth/registro')
        .set('Origin', ORIGIN);
    const login = await request(app)
        .post('/api/auth/login')
        .set('Origin', ORIGIN);

    assert.equal(registration.status, 400);
    assert.equal(login.status, 400);
});

test('login, sesión /yo y logout validan el JWT de la cookie', async () => {
    await User.create({
        nombre: 'Ana Zapi',
        email: 'ana@example.com',
        passwordHash: await bcrypt.hash('clave-segura-2026', 12),
    });

    const agent = request.agent(app);
    const login = await agent
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email: 'ANA@example.com', clave: 'clave-segura-2026' });

    assert.equal(login.status, 200);
    assert.equal(login.body.usuario.role, 'user');
    assert.match(login.headers['set-cookie'][0], /HttpOnly/i);

    const session = await agent.get('/api/auth/yo').set('Origin', ORIGIN);
    assert.equal(session.status, 200);
    assert.equal(session.body.usuario.email, 'ana@example.com');

    const logout = await agent.post('/api/auth/logout').set('Origin', ORIGIN);
    assert.equal(logout.status, 204);

    const afterLogout = await agent.get('/api/auth/yo').set('Origin', ORIGIN);
    assert.equal(afterLogout.status, 401);
});

test('no revela si existe el correo ante credenciales incorrectas', async () => {
    const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email: 'missing@example.com', clave: 'clave-segura-2026' });

    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Correo o contraseña incorrectos.');
});

test('rechaza escrituras desde orígenes no configurados', async () => {
    const response = await request(app)
        .post('/api/auth/registro')
        .set('Origin', 'https://attacker.example')
        .send({ nombre: 'Ana', email: 'ana@example.com', clave: 'clave-segura-2026' });

    assert.equal(response.status, 403);
});

test('las solicitudes sin sesión no pueden consultar /yo', async () => {
    const response = await request(app).get('/api/auth/yo').set('Origin', ORIGIN);
    assert.equal(response.status, 401);
});
