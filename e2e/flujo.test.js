'use strict';

/* Prueba de navegador end-to-end con Chrome: cuenta, compra online,
   cancelación, panel. Usa una base MongoDB en memoria y un servidor estático
   temporal que hace de proxy de /api. */

/* global window, document */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-core');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const { createApp } = require('../backend/src/app');
const Producto = require('../backend/src/models/Producto');
const User = require('../backend/src/models/User');

/* Chrome debe estar instalado; se puede indicar con CHROME_PATH. */
const POSIBLES_CHROME = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
].filter(Boolean);
const CHROME = POSIBLES_CHROME.find(ruta => fs.existsSync(ruta));
const raiz = path.join(__dirname, '..');
const CARPETA_MONGO = path.join(os.homedir(), '.cache', 'mongodb-binaries');

/* Reutiliza un mongod descargado por mongodb-memory-server si está en la
   caché; en máquinas limpias la librería lo descarga. */
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(CARPETA_MONGO)) {
    const binario = fs.readdirSync(CARPETA_MONGO)
        .filter(nombre => /^mongod.*\.exe$/i.test(nombre))
        .sort()
        .pop();

    if (binario) process.env.MONGOMS_SYSTEM_BINARY = path.join(CARPETA_MONGO, binario);
}

const CLAVE = 'clave-e2e-12345';

let replSet;
let apiServer;
let webServer;
let navegador;
let apiPort;
let webPort;
let baseUrl;
let pedidoCodigo = '';

function puertoLibre() {
    return new Promise((resolve, reject) => {
        const servidor = net.createServer();
        servidor.once('error', reject);
        servidor.listen(0, '127.0.0.1', () => {
            const puerto = servidor.address().port;
            servidor.close(error => error ? reject(error) : resolve(puerto));
        });
    });
}

async function esperarApi() {
    for (let intento = 0; intento < 60; intento += 1) {
        const respuesta = await fetch(`http://127.0.0.1:${webPort}/api/health`).catch(() => null);

        if (respuesta && respuesta.ok) return;
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error('El servidor estático y la API no respondieron a tiempo.');
}

function texto(locator) {
    return locator.evaluate(element => element.textContent.trim());
}

async function escribir(pagina, selector, valor) {
    await pagina.waitForSelector(selector, { visible: true, timeout: 10000 });
    await pagina.evaluate((objetivo, contenido) => {
        const elemento = document.querySelector(objetivo);
        elemento.value = String(contenido);
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, valor);
}

async function esperarRuta(pagina, fragmento, timeout = 30000) {
    await pagina.waitForFunction(
        esperado => window.location.href.includes(esperado),
        { timeout },
        fragmento
    );
}

before(async () => {
    assert.ok(CHROME, 'No se encontró Chrome; definí CHROME_PATH con la ruta del ejecutable.');

    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1 },
        instanceOpts: [{ launchTimeout: 120000 }]
    });
    await mongoose.connect(replSet.getUri());

    /* El navegador siempre consume el mismo origen; el servidor estático
       reenvía /api a la aplicación Express. */
    apiPort = await puertoLibre();
    webPort = await puertoLibre();
    baseUrl = `http://127.0.0.1:${webPort}`;

    const config = {
        nodeEnv: 'test',
        port: apiPort,
        mongoUri: replSet.getUri(),
        jwtSecret: 'secreto-e2e-con-mas-de-32-bytes',
        jwtExpiresIn: '1h',
        frontendOrigins: [`http://127.0.0.1:${webPort}`, `http://localhost:${webPort}`],
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

    await new Promise((resolve, reject) => {
        apiServer = createApp(config).listen(apiPort, '127.0.0.1', error => error ? reject(error) : resolve());
        apiServer.once('error', reject);
    });

    webServer = spawn(process.execPath, [path.join(raiz, 'frontend', 'tools', 'servir.js')], {
        cwd: raiz,
        env: {
            ...process.env,
            PORT: String(webPort),
            API_URL: `http://127.0.0.1:${apiPort}`
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let salidaWeb = '';
    webServer.stdout.on('data', dato => { salidaWeb += dato; });
    webServer.stderr.on('data', dato => { salidaWeb += dato; });
    webServer.once('exit', codigo => {
        if (codigo) console.error('El servidor estático terminó con código', codigo, '\n' + salidaWeb);
    });

    await Producto.create({
        productoId: 1,
        slug: 'albahaca',
        nombre: 'Albahaca',
        categoria: 'Aromáticas',
        descripcion: 'Mata fresca para huerta o maceta.',
        precio: 150,
        costo: 60,
        imagenes: ['public/img/albahaca.opt.jpg'],
        infoDeVenta: ['Mata lista para trasplantar'],
        stock: 10,
        stockMinimo: 3,
        destacado: true,
        activo: true
    });

    await User.create({
        nombre: 'Administrador E2E',
        email: 'admin-e2e@test.com',
        telefono: '099000000',
        passwordHash: await bcrypt.hash(CLAVE, 4),
        role: 'superadmin',
        activo: true
    });

    await esperarApi();

    navegador = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
});

after(async () => {
    if (navegador) await navegador.close();
    if (webServer) webServer.kill();
    if (apiServer) await new Promise(resolve => apiServer.close(resolve));
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
});

test('un cliente compra, cancela y el superadmin lo ve en el panel', { timeout: 120000 }, async () => {
    const pagina = await navegador.newPage();

    pagina.on('dialog', dialogo => dialogo.accept());
    await pagina.evaluateOnNewDocument(() => {
        window.__whatsappAbierto = null;
        window.open = url => {
            window.__whatsappAbierto = String(url);
            return {};
        };
    });

    /* 1. Registro desde la pantalla única de login. */
    await pagina.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await pagina.click('[data-modo-login="registro"]');
    await escribir(pagina, '#registroNombre', 'Cliente E2E');
    await escribir(pagina, '#registroEmail', 'cliente-e2e@test.com');
    await escribir(pagina, '#registroTelefono', '099111222');
    await escribir(pagina, '#registroClave', CLAVE);
    await escribir(pagina, '#registroClave2', CLAVE);
    await pagina.click('#registroEnviar');
    await esperarRuta(pagina, 'cuenta.html');

    await pagina.waitForFunction(
        () => document.querySelector('#cuentaNombre')?.textContent.includes('Cliente E2E'),
        { timeout: 10000 }
    );

    /* 2. El catálogo lee la API y la ficha inyecta JSON-LD. */
    await pagina.goto(`${baseUrl}/catalogo.html`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('article.tarjeta-producto', { visible: true, timeout: 15000 });
    await pagina.waitForSelector('[data-agregar-producto="1"]', { visible: true });
    await pagina.click('[data-agregar-producto="1"]');
    await pagina.waitForFunction(
        () => document.querySelector('[data-cart-count]').textContent.trim() === '1',
        { timeout: 10000 }
    );

    await pagina.goto(`${baseUrl}/producto.html?slug=albahaca`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForFunction(
        () => document.querySelector('#productoTitulo')?.textContent.includes('Albahaca'),
        { timeout: 15000 }
    );
    const jsonLd = await pagina.$eval('#jsonLdProducto', elemento => elemento.textContent);
    assert.match(jsonLd, /Albahaca/);

    /* 3. Checkout: precios y totales los calcula la API. */
    await pagina.goto(`${baseUrl}/carrito.html`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.linea-carrito', { visible: true, timeout: 15000 });
    await escribir(pagina, '#pedNombre', 'Cliente E2E');
    await escribir(pagina, '#pedTelefono', '099111222');
    await escribir(pagina, '#pedZona', 'Pocitos');
    await pagina.click('#whatsappButton');

    await pagina.waitForFunction(
        () => /pedido\s+ZAPI-/i.test(document.querySelector('#pedEstado')?.textContent || ''),
        { timeout: 30000 }
    );
    const estadoPedido = await texto(await pagina.$('#pedEstado'));
    pedidoCodigo = estadoPedido.match(/ZAPI-[A-Z0-9-]+/i)?.[0] || '';
    assert.ok(pedidoCodigo, 'No se encontró el código del pedido en el mensaje de confirmación.');

    const whatsapp = await pagina.evaluate(() => window.__whatsappAbierto);
    assert.match(whatsapp, /^https:\/\/wa\.me\/59898268560\?text=/);
    assert.match(whatsapp, new RegExp(pedidoCodigo));

    /* 4. Historial y cancelación: el stock vuelve al vivero. */
    await pagina.goto(`${baseUrl}/cuenta.html`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.pedido-card', { visible: true, timeout: 15000 });
    const historial = await pagina.$$eval('.cuenta-pedidos', elementos => elementos.map(e => e.textContent).join(' '));
    assert.ok(historial.includes(pedidoCodigo));

    await pagina.click('[data-cancelar-pedido]');
    await pagina.waitForFunction(
        () => /cancelado/i.test(document.querySelector('#cuentaEstado')?.textContent || ''),
        { timeout: 15000 }
    );

    /* 5. Cierre de sesión del cliente. */
    await pagina.click('.sesion-boton');
    await pagina.click('[data-cerrar-sesion]');
    await esperarRuta(pagina, '/index.html');

    /* 6. Login del superadmin y pedido visible en el panel. */
    await pagina.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await escribir(pagina, '#loginEmail', 'admin-e2e@test.com');
    await escribir(pagina, '#loginClave', CLAVE);
    await pagina.click('#loginEnviar');
    await esperarRuta(pagina, 'admin/index.html');
    await pagina.waitForFunction(
        () => document.querySelector('#kpiHoyTotal')?.textContent.trim() !== '-',
        { timeout: 30000 }
    );

    await pagina.goto(`${baseUrl}/admin/pedidos.html`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForFunction(
        codigo => document.querySelector('#ordenesTabla')?.textContent.includes(codigo),
        { timeout: 30000 },
        pedidoCodigo
    );

    await pagina.close();
});
