'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const { createApp } = require('../src/app');
const Contenido = require('../src/models/Contenido');
const MovimientoStock = require('../src/models/MovimientoStock');
const Orden = require('../src/models/Orden');
const Producto = require('../src/models/Producto');
const User = require('../src/models/User');

const CLAVE = 'clave-de-prueba-123';
const CARPETA_MONGO = path.join(os.homedir(), '.cache', 'mongodb-binaries');

/* Si ya hay un mongod descargado en la caché de mongodb-memory-server, se
   reutiliza; si no, la librería lo descarga sola. */
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(CARPETA_MONGO)) {
    const binario = fs.readdirSync(CARPETA_MONGO)
        .filter(nombre => /^mongod.*\.exe$/i.test(nombre))
        .sort()
        .pop();

    if (binario) process.env.MONGOMS_SYSTEM_BINARY = path.join(CARPETA_MONGO, binario);
}

const config = {
    nodeEnv: 'test',
    port: 0,
    mongoUri: '',
    jwtSecret: 'secreto-de-pruebas-con-mas-de-32-bytes',
    jwtExpiresIn: '1h',
    frontendOrigins: ['http://localhost:5500'],
    cookieName: 'zapi_session',
    cookieSameSite: 'lax',
    cookieSecure: false,
    cookieMaxAgeMs: 60 * 60 * 1000,
    trustProxy: 0,
    envioGratis: 2500,
    moneda: 'UYU',
    maxItemsPorPedido: 100,
    registroPublico: true
};

let replSet;
let app;
let contadorProducto = 0;

function hoyLocal() {
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

async function crearProducto(extra = {}) {
    contadorProducto += 1;
    const nombre = extra.nombre || `Producto ${contadorProducto}`;

    return Producto.create({
        productoId: contadorProducto,
        slug: extra.slug || `producto-${contadorProducto}`,
        nombre,
        categoria: 'Plantas',
        descripcion: 'Descripción de prueba suficientemente larga.',
        precio: 150,
        costo: 60,
        imagenes: ['public/img/albahaca.opt.jpg'],
        infoDeVenta: ['Ventaja de prueba'],
        stock: 10,
        stockMinimo: 3,
        destacado: false,
        activo: true,
        ...extra
    });
}

async function crearUsuario(role, extra = {}) {
    return User.create({
        nombre: role === 'superadmin' ? 'Administrador' : 'Cliente de prueba',
        email: extra.email || `${role}@test.com`,
        telefono: '099123456',
        passwordHash: await bcrypt.hash(CLAVE, 4),
        role,
        activo: true,
        ...extra
    });
}

async function agente(usuario) {
    const cliente = request.agent(app);
    await cliente.post('/api/auth/login').send({ email: usuario.email, clave: CLAVE }).expect(200);
    return cliente;
}

async function limpiarBase() {
    await Promise.all(Object.values(mongoose.connection.collections).map(coleccion => coleccion.deleteMany({})));
}

before(async () => {
    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1 },
        /* WiredTiger puede tardar más de 10 s en el primer arranque. */
        instanceOpts: [{ launchTimeout: 120000 }]
    });
    await mongoose.connect(replSet.getUri());
    app = createApp(config);
});

after(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
});

beforeEach(async () => {
    contadorProducto = 0;
    await limpiarBase();
});

test('GET /api/config expone la configuración pública', async () => {
    const respuesta = await request(app).get('/api/config').expect(200);

    assert.equal(respuesta.body.requiereCuenta, true);
    assert.equal(respuesta.body.registroAbierto, true);
    assert.equal(respuesta.body.envioGratis, 2500);
    assert.equal(respuesta.body.moneda, 'UYU');
    assert.ok(respuesta.body.negocio.nombre);
});

test('el registro crea un cliente, inicia sesión y rechaza duplicados', async () => {
    const cliente = request.agent(app);

    const registro = await cliente.post('/api/auth/registro').send({
        nombre: 'Ana Pérez',
        email: 'ana@example.com',
        telefono: '099123456',
        clave: CLAVE
    }).expect(201);

    assert.equal(registro.body.usuario.role, 'cliente');
    assert.match(registro.headers['set-cookie'][0], /zapi_session=/);

    const yo = await cliente.get('/api/auth/yo').expect(200);
    assert.equal(yo.body.usuario.email, 'ana@example.com');

    await request(app).post('/api/auth/registro').send({
        nombre: 'Otra Ana',
        email: 'ana@example.com',
        clave: CLAVE
    }).expect(409);

    await request(app).post('/api/auth/registro').send({
        nombre: 'Clave corta',
        email: 'corta@example.com',
        clave: '1234567'
    }).expect(400);
});

test('el login rechaza credenciales incorrectas y cuentas bloqueadas', async () => {
    const usuario = await crearUsuario('cliente');

    await request(app).post('/api/auth/login').send({
        email: usuario.email,
        clave: 'incorrecta'
    }).expect(401);

    await User.updateOne({ _id: usuario._id }, { $set: { activo: false } });

    await request(app).post('/api/auth/login').send({
        email: usuario.email,
        clave: CLAVE
    }).expect(403);
});

test('el catálogo público solo devuelve productos activos', async () => {
    await crearProducto({ nombre: 'Activo', slug: 'activo' });
    await crearProducto({ nombre: 'Inactivo', slug: 'inactivo', activo: false });

    const respuesta = await request(app).get('/api/catalogo').expect(200);

    assert.equal(respuesta.body.productos.length, 1);
    assert.equal(respuesta.body.productos[0].slug, 'activo');
    assert.equal(respuesta.body.productos[0].precioBase, 150);
    assert.ok(respuesta.body.categorias.includes('Plantas'));

    const detalle = await request(app).get('/api/catalogo/activo').expect(200);
    assert.equal(detalle.body.producto.nombre, 'Activo');

    await request(app).get('/api/catalogo/inactivo').expect(404);
});

test('un cliente crea un pedido con precios del servidor y descuenta stock', async () => {
    const producto = await crearProducto();
    const usuario = await crearUsuario('cliente');
    const cliente = await agente(usuario);

    const creacion = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Pérez',
        telefono: '099123456',
        zona: 'Pocitos',
        notas: 'Timbre 2',
        items: [{ productoId: producto.productoId, cantidad: 2, precio: 1 }]
    }).expect(201);

    const pedido = creacion.body.pedido;

    assert.equal(pedido.subtotal, 300);
    assert.equal(pedido.total, 300);
    assert.equal(pedido.estado, 'pendiente');
    assert.equal(pedido.canal, 'online');
    assert.equal(pedido.metodoPago, 'online');
    assert.equal(pedido.items[0].precio, 150);
    assert.match(pedido.codigo, /^ZAPI-/);

    const actualizado = await Producto.findById(producto._id).lean();
    assert.equal(actualizado.stock, 8);

    const movimientos = await MovimientoStock.find({ orden: pedido.id }).lean();
    assert.equal(movimientos.length, 1);
    assert.equal(movimientos[0].tipo, 'venta');
    assert.equal(movimientos[0].cantidad, 2);

    const historial = await cliente.get('/api/pedidos').expect(200);
    assert.equal(historial.body.pedidos.length, 1);

    await cliente.patch(`/api/pedidos/${pedido.id}/cancelar`).send({
        motivo: 'Cambié de idea'
    }).expect(200);

    const repuesto = await Producto.findById(producto._id).lean();
    assert.equal(repuesto.stock, 10);

    const cancelado = await Orden.findById(pedido.id).lean();
    assert.equal(cancelado.estado, 'cancelado');
    assert.equal(cancelado.stockRepuesto, true);

    await cliente.patch(`/api/pedidos/${pedido.id}/cancelar`).send({}).expect(409);
});

test('un pedido sin sesión o sin stock se rechaza', async () => {
    const producto = await crearProducto();

    await request(app).post('/api/pedidos').send({
        items: [{ productoId: producto.productoId, cantidad: 1 }]
    }).expect(401);

    const usuario = await crearUsuario('cliente');
    const cliente = await agente(usuario);

    const respuesta = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Pérez',
        telefono: '099123456',
        items: [{ productoId: producto.productoId, cantidad: 11 }]
    }).expect(409);

    assert.equal(respuesta.body.faltantes[0].disponibles, 10);
    assert.equal(respuesta.body.faltantes[0].solicitados, 11);
    assert.equal(await Orden.countDocuments(), 0);

    const actualizado = await Producto.findById(producto._id).lean();
    assert.equal(actualizado.stock, 10);
});

test('los testimonios quedan pendientes hasta que el panel los aprueba', async () => {
    const producto = await crearProducto();
    const usuario = await crearUsuario('cliente');
    const cliente = await agente(usuario);

    const creacion = await cliente.post('/api/testimonios').send({
        autor: 'Ana Pérez',
        lugar: 'Pocitos',
        texto: 'Las plantas llegaron impecables y muy bien embaladas.',
        estrellas: 5,
        productoId: producto.productoId
    }).expect(201);

    assert.equal(creacion.body.testimonio.estado, 'pendiente');

    const publicos = await request(app).get('/api/testimonios').expect(200);
    assert.equal(publicos.body.testimonios.length, 0);

    const propios = await cliente.get('/api/testimonios/mios').expect(200);
    assert.equal(propios.body.testimonios.length, 1);

    const admin = await crearUsuario('superadmin');
    const panel = await agente(admin);

    await panel.patch(`/api/admin/testimonios/${creacion.body.testimonio.id}`).send({
        estado: 'aprobado'
    }).expect(200);

    const aprobados = await request(app).get('/api/testimonios').expect(200);
    assert.equal(aprobados.body.testimonios.length, 1);
    assert.equal(aprobados.body.testimonios[0].autor, 'Ana Pérez');
});

test('el panel exige rol superadmin', async () => {
    const cliente = await agente(await crearUsuario('cliente'));

    await request(app).get('/api/admin/dashboard').expect(401);
    await cliente.get('/api/admin/dashboard').expect(403);

    const admin = await agente(await crearUsuario('superadmin'));
    await admin.get('/api/admin/dashboard').expect(200);
});

test('una venta presencial descuenta stock, se anula y aparece en el cierre', async () => {
    const producto = await crearProducto();
    const admin = await agente(await crearUsuario('superadmin'));

    const creacion = await admin.post('/api/admin/ventas').send({
        metodoPago: 'efectivo',
        descuento: 50,
        nombre: 'Venta mostrador',
        telefono: '',
        items: [{ productoId: producto.productoId, cantidad: 2 }]
    }).expect(201);

    const venta = creacion.body.venta;

    assert.equal(venta.canal, 'presencial');
    assert.equal(venta.estado, 'entregado');
    assert.equal(venta.subtotal, 300);
    assert.equal(venta.descuento, 50);
    assert.equal(venta.total, 250);

    assert.equal((await Producto.findById(producto._id).lean()).stock, 8);

    const listado = await admin.get(`/api/admin/ventas?fecha=${hoyLocal()}`).expect(200);
    assert.equal(listado.body.ordenes.length, 1);

    const cierre = await admin.get(`/api/admin/ventas/cierre?fecha=${hoyLocal()}`).expect(200);
    const efectivo = cierre.body.metodos.find(metodo => metodo.metodo === 'efectivo');
    assert.equal(efectivo.total, 250);

    await admin.patch(`/api/admin/ventas/${venta.id}/anular`).send({
        motivo: 'Error de cobro'
    }).expect(200);

    assert.equal((await Producto.findById(producto._id).lean()).stock, 10);

    const anulada = await Orden.findById(venta.id).lean();
    assert.equal(anulada.estado, 'cancelado');
    assert.equal(anulada.stockRepuesto, true);
});

test('el panel crea productos, ajusta stock y desactiva', async () => {
    const admin = await agente(await crearUsuario('superadmin'));

    const creacion = await admin.post('/api/admin/productos').send({
        nombre: 'Helecho',
        categoria: 'Plantas',
        descripcion: 'Helecho de interior con hojas verdes y frondosas.',
        precio: 220,
        costo: 90,
        stock: 5,
        stockMinimo: 2,
        imagenes: ['public/img/albahaca.opt.jpg'],
        infoDeVenta: ['Maceta incluida'],
        destacado: true,
        activo: true
    }).expect(201);

    const producto = creacion.body.producto;
    assert.equal(producto.slug, 'helecho');
    assert.equal(producto.precio, 220);

    const movimientosIniciales = await admin
        .get(`/api/admin/productos/${producto.id}/movimientos`)
        .expect(200);
    assert.equal(movimientosIniciales.body.movimientos[0].tipo, 'entrada');

    await admin.put(`/api/admin/productos/${producto.id}`).send({
        stock: 8
    }).expect(200);

    const movimientos = await admin
        .get(`/api/admin/productos/${producto.id}/movimientos`)
        .expect(200);
    assert.ok(movimientos.body.movimientos.some(movimiento => movimiento.tipo === 'ajuste'));

    await admin.post(`/api/admin/productos/${producto.id}/movimientos`).send({
        tipo: 'merma',
        cantidad: 2,
        motivo: 'Hojas dañadas'
    }).expect(201);

    assert.equal((await Producto.findById(producto.id).lean()).stock, 6);

    await admin.delete(`/api/admin/productos/${producto.id}`).expect(200);

    const desactivado = await Producto.findById(producto.id).lean();
    assert.equal(desactivado.activo, false);

    const publico = await request(app).get('/api/catalogo').expect(200);
    assert.equal(publico.body.productos.length, 0);
});

test('el contenido editable rechaza HTML y guarda campos válidos', async () => {
    const admin = await agente(await crearUsuario('superadmin'));

    const lectura = await admin.get('/api/admin/contenido').expect(200);
    assert.ok(lectura.body.contenido.negocio);

    await admin.put('/api/admin/contenido/negocio').send({
        nombre: 'ZAPI <script>'
    }).expect(400);

    const guardado = await admin.put('/api/admin/contenido/negocio').send({
        nombre: 'ZAPI Vivero',
        descripcion: 'Vivero agroecológico en Montevideo.',
        whatsapp: '59898268560',
        whatsappVisible: '098 268 560',
        email: 'hola@zapi.uy',
        direccion: 'Congreso de Abril, Montevideo, Uruguay',
        horario: 'Visitas coordinadas.',
        sitio: 'https://zapi.uy'
    }).expect(200);

    assert.equal(guardado.body.valor.nombre, 'ZAPI Vivero');

    const publico = await request(app).get('/api/contenido').expect(200);
    assert.equal(publico.body.contenido.negocio.nombre, 'ZAPI Vivero');

    const documento = await Contenido.findOne({ clave: 'negocio' }).lean();
    assert.ok(documento);
});

test('el contacto valida campos y respeta la trampa antispam', async () => {
    await request(app).post('/api/contacto').send({
        nombre: 'Ana Pérez',
        email: 'ana@example.com',
        telefono: '099123456',
        asunto: 'Consulta por envíos',
        mensaje: '¿Llegan a Malvín?'
    }).expect(201);

    await request(app).post('/api/contacto').send({
        nombre: 'Ana Pérez',
        email: 'ana@example.com',
        asunto: 'Consulta por envíos',
        mensaje: '¿Llegan a Malvín?',
        sitio_web: 'spam'
    }).expect(201);

    await request(app).post('/api/contacto').send({
        nombre: 'A',
        email: 'no-es-correo',
        asunto: 'x',
        mensaje: 'corto'
    }).expect(400);

    const Contacto = require('../src/models/Contacto');
    assert.equal(await Contacto.countDocuments(), 1);
});

test('el dashboard excluye pedidos cancelados y resume las ventas', async () => {
    const producto = await crearProducto();
    const cliente = await agente(await crearUsuario('cliente'));

    const primero = await cliente.post('/api/pedidos').send({
        nombre: 'Ana Pérez',
        telefono: '099123456',
        items: [{ productoId: producto.productoId, cantidad: 1 }]
    }).expect(201);

    await cliente.post('/api/pedidos').send({
        nombre: 'Ana Pérez',
        telefono: '099123456',
        items: [{ productoId: producto.productoId, cantidad: 1 }]
    }).expect(201);

    await cliente.patch(`/api/pedidos/${primero.body.pedido.id}/cancelar`).send({}).expect(200);

    const admin = await agente(await crearUsuario('superadmin'));
    const tablero = await admin.get('/api/admin/dashboard').expect(200);

    assert.equal(tablero.body.periodo.online.ventas, 1);
    assert.equal(tablero.body.periodo.online.ingresos, 150);
    assert.equal(tablero.body.pedidosPendientes.total, 1);
    assert.ok(Array.isArray(tablero.body.ventasPorDia));
    assert.ok(Array.isArray(tablero.body.topProductos));

    const csv = await admin.get('/api/admin/dashboard/export.csv').expect(200);
    assert.match(csv.headers['content-type'], /text\/csv/);
});

test('la auditoría registra las acciones del panel', async () => {
    const admin = await agente(await crearUsuario('superadmin'));

    await admin.post('/api/admin/productos').send({
        nombre: 'Cactus',
        categoria: 'Plantas',
        descripcion: 'Cactus de sol directo con maceta de barro.',
        precio: 180,
        costo: 70,
        stock: 4,
        stockMinimo: 1,
        imagenes: ['public/img/albahaca.opt.jpg'],
        infoDeVenta: [],
        destacado: false,
        activo: true
    }).expect(201);

    const auditoria = await admin.get('/api/admin/auditoria').expect(200);

    assert.ok(auditoria.body.registros.length >= 1);
    assert.equal(auditoria.body.registros[0].entidad, 'producto');
    assert.equal(auditoria.body.registros[0].accion, 'crear');
});

test('un cliente no puede comprar con una cuenta bloqueada', async () => {
    const producto = await crearProducto();
    const usuario = await crearUsuario('cliente');
    const cliente = await agente(usuario);

    await User.updateOne({ _id: usuario._id }, { $set: { activo: false } });

    await cliente.post('/api/pedidos').send({
        nombre: 'Ana Pérez',
        telefono: '099123456',
        items: [{ productoId: producto.productoId, cantidad: 1 }]
    }).expect(401);
});

test('el cliente solo ve y cancela sus propios pedidos', async () => {
    const producto = await crearProducto();
    const clienteA = await agente(await crearUsuario('cliente', { email: 'a@test.com' }));
    const clienteB = await agente(await crearUsuario('cliente', { email: 'b@test.com' }));

    const pedido = await clienteA.post('/api/pedidos').send({
        nombre: 'Cliente A',
        telefono: '099123456',
        items: [{ productoId: producto.productoId, cantidad: 1 }]
    }).expect(201);

    await clienteB.get(`/api/pedidos/${pedido.body.pedido.id}`).expect(404);
    await clienteB.patch(`/api/pedidos/${pedido.body.pedido.id}/cancelar`).send({}).expect(409);
    await clienteB.get('/api/pedidos').expect(200).expect(respuesta => {
        assert.equal(respuesta.body.pedidos.length, 0);
    });
});
