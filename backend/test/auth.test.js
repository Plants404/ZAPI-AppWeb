'use strict';

const test = require('node:test');
const { limitesDe } = require('./limites-falsos.js');
const assert = require('node:assert/strict');
const http = require('http');
const { crearApp } = require('../app.js');
const {
    requerirAdmin,
    hashPassword,
    limpiarCookieSesion,
    setCookieSesion
} = require('../lib/auth.js');

function crearBaseFalsa() {
    const users = [];
    const sessions = [];
    const auditoria = [];

    return {
        async command() { return { ok: 1 }; },
        collection(nombre) {
            if (nombre === 'users') {
                return {
                    async findOne(filtro) {
                        if (filtro.email) {
                            return users.find(u => u.email === filtro.email) || null;
                        }
                        return null;
                    },
                    async insertOne(documento) {
                        users.push(documento);
                        return { insertedId: 'usuario-falso' };
                    }
                };
            }
            if (nombre === 'sessions') {
                return {
                    async findOne(filtro) {
                        if (filtro._id) {
                            return sessions.find(s => s._id === filtro._id) || null;
                        }
                        return null;
                    },
                    async insertOne(documento) {
                        sessions.push(documento);
                        return { insertedId: documento._id };
                    },
                    async deleteOne(filtro) {
                        const antes = sessions.length;
                        const filtrados = sessions.filter(s => s._id !== filtro._id);
                        sessions.splice(0, sessions.length, ...filtrados);
                        return { deletedCount: antes - filtrados.length };
                    }
                };
            }
            if (nombre === 'auditoria') {
                return {
                    async insertOne(documento) {
                        auditoria.push(documento);
                        return { insertedId: 'auditoria-falsa' };
                    }
                };
            }
                        if (nombre === 'limites') return limitesDe(this);
            throw new Error(`Colección inesperada: ${nombre}`);
        }
    };
}

function extraerCookie(respuesta) {
    const setCookie = respuesta.headers.get('set-cookie');
    if (!setCookie) return null;
    return Array.isArray(setCookie) ? setCookie[0] : setCookie;
}

async function appConAuth(base) {
    return await crearApp({ getDatabase: () => base });
}

test('login exitoso devuelve rol y establece cookie httpOnly Secure SameSite=Lax', async t => {
    const base = crearBaseFalsa();
    const { salt, hash } = hashPassword('clave12345678');
    base.collection('users').insertOne({
        email: 'marcio@zapi.uy',
        passwordSalt: salt,
        passwordHash: hash,
        rol: 'admin',
        nombre: 'Marcio'
    });

    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'marcio@zapi.uy', clave: 'clave12345678' })
    });

    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.rol, 'admin');
    assert.equal(datos.nombre, 'Marcio');
    assert.equal(datos.ok, true);

    const cookie = extraerCookie(respuesta);
    assert.ok(cookie, 'debe establecer cookie sessionId');
    assert.ok(cookie.includes('HttpOnly'), 'cookie debe ser HttpOnly');
    assert.ok(cookie.includes('SameSite=Lax'), 'cookie debe ser SameSite=Lax');
});

test('la cookie y su limpieza usan Secure solo en producción o Vercel', () => {
    const entornoOriginal = {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
    };
    const original = () => {
        if (entornoOriginal.nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = entornoOriginal.nodeEnv;
        if (entornoOriginal.vercel === undefined) delete process.env.VERCEL;
        else process.env.VERCEL = entornoOriginal.vercel;
    };
    const cookieEn = (variables) => {
        if (variables.NODE_ENV === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = variables.NODE_ENV;
        if (variables.VERCEL === undefined) delete process.env.VERCEL;
        else process.env.VERCEL = variables.VERCEL;
        let opcionesCookie;
        let cookieEliminada;
        setCookieSesion({ cookie(nombre, valor, opciones) {
            opcionesCookie = { nombre, valor, ...opciones };
        } }, 'sesion', 300);
        limpiarCookieSesion({ setHeader(nombre, valor) {
            if (nombre === 'Set-Cookie') cookieEliminada = valor;
        } });
        return { opcionesCookie, cookieEliminada };
    };

    try {
        const desarrollo = cookieEn({ NODE_ENV: 'development', VERCEL: undefined });
        assert.equal(desarrollo.opcionesCookie.secure, false);
        assert.doesNotMatch(desarrollo.cookieEliminada, /\bSecure\b/);

        const produccion = cookieEn({ NODE_ENV: 'production', VERCEL: undefined });
        assert.equal(produccion.opcionesCookie.secure, true);
        assert.match(produccion.cookieEliminada, /\bSecure\b/);

        const vercel = cookieEn({ NODE_ENV: 'test', VERCEL: '1' });
        assert.equal(vercel.opcionesCookie.secure, true);
        assert.match(vercel.cookieEliminada, /\bSecure\b/);
    } finally {
        original();
    }
});

test('login con contraseña incorrecta responde 401 genérico', async t => {
    const base = crearBaseFalsa();
    base.collection('users').insertOne({
        email: 'pablo@zapi.uy',
        passwordSalt: 'sal',
        passwordHash: 'hash',
        rol: 'admin',
        nombre: 'Pablo'
    });

    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pablo@zapi.uy', clave: 'malaclave' })
    });

    assert.equal(respuesta.status, 401);
    const datos = await respuesta.json();
    assert.ok(datos.error);
    assert.notEqual(datos.error.toLowerCase().includes('usuario'), true, 'no revela si el usuario existe');
});

test('login con correo inexistente responde 401 genérico', async t => {
    const base = crearBaseFalsa();
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noexiste@zapi.uy', clave: 'clave12345678' })
    });

    assert.equal(respuesta.status, 401);
    const datos = await respuesta.json();
    assert.ok(datos.error);
});

test('registro siempre crea rol cliente, nunca admin', async t => {
    const base = crearBaseFalsa();
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/registro`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'Cliente Uno',
            email: 'cliente@zapi.uy',
            clave: 'clave12345678'
        })
    });

    assert.equal(respuesta.status, 201);
    const datos = await respuesta.json();
    assert.equal(datos.rol, 'cliente');
    assert.equal(datos.ok, true);
});

test('registro rechaza contraseña menor a 12 caracteres', async t => {
    const base = crearBaseFalsa();
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/registro`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'Cliente',
            email: 'corto@zapi.uy',
            clave: 'corta123'
        })
    });

    assert.equal(respuesta.status, 400);
});

test('registro rechaza correo duplicado', async t => {
    const base = crearBaseFalsa();
    base.collection('users').insertOne({
        email: 'dup@zapi.uy',
        passwordSalt: 'sal',
        passwordHash: 'hash',
        rol: 'cliente',
        nombre: 'Existente'
    });
    const server = http.createServer(await crearApp({ getDatabase: () => base })).listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/registro`;

    const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'Duplicado',
            email: 'dup@zapi.uy',
            clave: 'clave12345678'
        })
    });

    assert.equal(respuesta.status, 409);
});

test('yo sin sesión responde 401', async t => {
    const base = crearBaseFalsa();
    const app = await appConAuth(base);
    const server = http.createServer(app);
    server.listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/yo`;

    const respuesta = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(respuesta.status, 401);
});

test('yo con sesión válida devuelve datos del usuario', async t => {
    const base = crearBaseFalsa();
    base.collection('sessions').insertOne({
        _id: 'sesion-valida',
        userId: 'usuario-1',
        email: 'cliente@zapi.uy',
        rol: 'cliente',
        nombre: 'Cliente',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
    });
    const app = await appConAuth(base);
    const server = http.createServer(app);
    server.listen(0);
    t.after(() => server.close());
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/auth/yo`;

    const respuesta = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            Cookie: 'sessionId=sesion-valida'
        }
    });

    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.rol, 'cliente');
    assert.equal(datos.email, 'cliente@zapi.uy');
});

test('ruta protegida con requerirAdmin sin sesión responde 401', async () => {
    const base = crearBaseFalsa();

    const middleware = requerirAdmin(() => base);
    const req = { headers: {} };
    let statusEnviado = null;
    const res = {
        status(code) { statusEnviado = code; return this; },
        json() { }
    };
    let nextLlamado = false;
    try {
        await middleware(req, res, () => { nextLlamado = true; });
    } catch (error) {
        assert.equal(error.status, 401);
    }

    assert.equal(statusEnviado, null);
    assert.equal(nextLlamado, false);
});

test('ruta protegida con requerirAdmin con sesión de cliente responde 403', async () => {
    const base = crearBaseFalsa();
    base.collection('sessions').insertOne({
        _id: 'sesion-cliente',
        userId: 'usuario-2',
        email: 'cliente@zapi.uy',
        rol: 'cliente',
        nombre: 'Cliente',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
    });

    const middleware = requerirAdmin(() => base);
    const req = { headers: { cookie: 'sessionId=sesion-cliente' } };
    let statusEnviado = null;
    const res = {
        status(code) { statusEnviado = code; return this; },
        json() { }
    };
    let nextLlamado = false;
    try {
        await middleware(req, res, () => { nextLlamado = true; });
    } catch (error) {
        assert.equal(error.status, 403);
    }

    assert.equal(statusEnviado, null);
    assert.equal(nextLlamado, false);
});

test('ruta protegida con requerirAdmin con sesión de admin pasa al siguiente middleware', async () => {
    const base = crearBaseFalsa();
    base.collection('sessions').insertOne({
        _id: 'sesion-admin',
        userId: 'usuario-3',
        email: 'marcio@zapi.uy',
        rol: 'admin',
        nombre: 'Marcio',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
    });

    const middleware = requerirAdmin(() => base);
    const req = { headers: { cookie: 'sessionId=sesion-admin' } };
    const res = {
        status() { return this; },
        json() { }
    };
    let nextLlamado = false;
    await middleware(req, res, () => { nextLlamado = true; });

    assert.equal(nextLlamado, true);
    assert.equal(req.usuario.rol, 'admin');
    assert.equal(req.usuario.email, 'marcio@zapi.uy');
});
