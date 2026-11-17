'use strict';

/* Prueba manual del flujo completo contra una API en marcha (registro, pedido, panel). */

const { randomInt, randomUUID } = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const { closeDatabase, connectDatabase } = require('./db.js');
const { hashPassword } = require('./lib/auth.js');
const { crearApp } = require('./app.js');

let fallos = 0;

async function verificar(nombre, ejecutar) {
    try {
        const resultado = await ejecutar();
        console.log(`OK ${nombre}`);
        return resultado === undefined ? true : resultado;
    } catch {
        console.log(`FALLÓ ${nombre}`);
        fallos += 1;
        return false;
    }
}

function afirmar(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}

async function respuestaJSON(url, ruta, opciones = {}) {
    const respuesta = await fetch(`${url}${ruta}`, opciones);
    const datos = await respuesta.json();
    return { respuesta, datos };
}

async function main() {
    const nombreBase = process.env.MONGODB_DB;
    if (!nombreBase || !nombreBase.endsWith('_prueba')) {
        console.error('FALLÓ: MONGODB_DB debe terminar en _prueba; no se inició ninguna conexión.');
        process.exitCode = 1;
        return;
    }

    const cronSecretAnterior = process.env.CRON_SECRET;
    const trustProxyAnterior = process.env.TRUST_PROXY;
    const cronSecret = cronSecretAnterior || randomUUID();
    process.env.CRON_SECRET = cronSecret;
    process.env.TRUST_PROXY = '1';

    const sufijo = randomUUID();
    const emailAdmin = `admin-${sufijo}@example.test`;
    const emailCliente = `cliente-${sufijo}@example.test`;
    const clave = randomUUID() + randomUUID();
    const idUsuarioAdmin = `admin-${sufijo}`;
    const idUsuarioCliente = `cliente-${sufijo}`;
    const idProducto = Date.now() * 1000 + randomInt(1000);
    const slugProducto = `prueba-${sufijo}`;
    const idSesionAdmin = randomUUID();
    const idSesionCliente = randomUUID();
    const numeroIp = randomInt(131072);
    const ipPrueba = `198.${18 + Math.floor(numeroIp / 65536)}.${Math.floor((numeroIp % 65536) / 256)}.${numeroIp % 256}`;
    const ordenesCreadas = [];
    const clavesLimite = [`pedidos:${ipPrueba}`];
    let db;
    let server;

    try {
        db = await connectDatabase();

        const { salt: salAdmin, hash: hashAdmin } = hashPassword(clave);
        const { salt: salCliente, hash: hashCliente } = hashPassword(clave);
        await db.collection('users').insertMany([
            {
                _id: idUsuarioAdmin,
                email: emailAdmin,
                passwordSalt: salAdmin,
                passwordHash: hashAdmin,
                rol: 'admin',
                nombre: 'Admin de prueba',
                createdAt: new Date()
            },
            {
                _id: idUsuarioCliente,
                email: emailCliente,
                passwordSalt: salCliente,
                passwordHash: hashCliente,
                rol: 'cliente',
                nombre: 'Cliente de prueba',
                createdAt: new Date()
            }
        ]);
        await db.collection('products').insertOne({
            id: idProducto,
            slug: slugProducto,
            nombre: 'Producto de prueba',
            precioBase: 10,
            stock: 5,
            active: true,
            visible: true,
            createdAt: new Date()
        });
        await db.collection('sessions').insertMany([
            {
                _id: idSesionAdmin,
                userId: idUsuarioAdmin,
                email: emailAdmin,
                rol: 'admin',
                nombre: 'Admin de prueba',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            },
            {
                _id: idSesionCliente,
                userId: idUsuarioCliente,
                email: emailCliente,
                rol: 'cliente',
                nombre: 'Cliente de prueba',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            }
        ]);

        const origenPermitido = (process.env.FRONTEND_ORIGINS || 'http://localhost:5500')
            .split(',')
            .map(origen => origen.trim())
            .filter(Boolean)[0];
        const app = await crearApp({ getDatabase: () => db });
        server = http.createServer(app);
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const url = `http://127.0.0.1:${server.address().port}`;
        const cookieAdmin = `sessionId=${idSesionAdmin}`;
        const cookieCliente = `sessionId=${idSesionCliente}`;

        const pedido = await verificar('pedido web 201 y stock descontado', async () => {
            const { respuesta, datos } = await respuestaJSON(url, '/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Forwarded-For': ipPrueba
                },
                body: JSON.stringify({
                    cliente: {
                        nombre: 'Cliente de prueba',
                        telefono: '099 123 456',
                        email: emailCliente
                    },
                    lineas: [{ id: idProducto, cantidad: 1 }],
                    usuario: { id: 'usuario-falso', email: 'falso@example.test' }
                })
            });
            afirmar(respuesta.status === 201, `se esperaba 201 y llegó ${respuesta.status}`);
            ordenesCreadas.push(datos.order.id);
            afirmar(datos.order.historial[0].usuario === 'sistema', 'se guardó el usuario falso del cuerpo');
            afirmar((await db.collection('products').findOne({ id: idProducto })).stock === 4,
                'el stock no quedó descontado');
            return datos.order;
        });

        const idPedido = pedido ? pedido.id : `ZAPI-prueba-${sufijo}`;
        await verificar('cancelar restituye el stock e ignora el usuario falso', async () => {
            const { respuesta, datos } = await respuestaJSON(
                url,
                `/api/admin/pedidos/${encodeURIComponent(idPedido)}/estado`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
                    body: JSON.stringify({
                        estado: 'cancelado',
                        usuario: { id: 'usuario-falso', email: 'falso@example.test' }
                    })
                }
            );
            afirmar(respuesta.status === 200, `se esperaba 200 y llegó ${respuesta.status}`);
            afirmar((await db.collection('products').findOne({ id: idProducto })).stock === 5,
                'el stock no se restituyó');
            const historial = datos.order.historial;
            afirmar(historial.at(-1).usuario === idUsuarioAdmin, 'el historial no tomó la identidad de sesión');
            const auditoria = await db.collection('auditoria').findOne({
                accion: 'pedido.estado',
                usuario: idUsuarioAdmin
            });
            afirmar(auditoria, 'la auditoría no tomó la identidad de sesión');
        });

        await verificar('cancelar por segunda vez responde 409', async () => {
            const { respuesta } = await respuestaJSON(
                url,
                `/api/admin/pedidos/${encodeURIComponent(idPedido)}/estado`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
                    body: JSON.stringify({ estado: 'cancelado' })
                }
            );
            afirmar(respuesta.status === 409, `se esperaba 409 y llegó ${respuesta.status}`);
        });

        await verificar('cancelado a entregado responde 409', async () => {
            const { respuesta } = await respuestaJSON(
                url,
                `/api/admin/pedidos/${encodeURIComponent(idPedido)}/estado`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
                    body: JSON.stringify({ estado: 'entregado' })
                }
            );
            afirmar(respuesta.status === 409, `se esperaba 409 y llegó ${respuesta.status}`);
        });

        await verificar('cliente recibe 403 en /api/admin', async () => {
            const { respuesta } = await respuestaJSON(url, '/api/admin/resumen', {
                headers: { Cookie: cookieCliente }
            });
            afirmar(respuesta.status === 403, `se esperaba 403 y llegó ${respuesta.status}`);
        });

        await verificar('sin sesión recibe 401 en /api/admin', async () => {
            const { respuesta } = await respuestaJSON(url, '/api/admin/resumen');
            afirmar(respuesta.status === 401, `se esperaba 401 y llegó ${respuesta.status}`);
        });

        await verificar('/api/depurar rechaza una clave ausente y acepta CRON_SECRET', async () => {
            const sinClave = await respuestaJSON(url, '/api/depurar');
            afirmar(sinClave.respuesta.status === 401, `sin clave llegó ${sinClave.respuesta.status}`);
            const autorizado = await respuestaJSON(url, '/api/depurar', {
                headers: { Authorization: `Bearer ${cronSecret}` }
            });
            afirmar(autorizado.respuesta.status === 200, `con clave llegó ${autorizado.respuesta.status}`);
        });

        await verificar('auth/yo y admin/resumen envían no-store', async () => {
            const yo = await respuestaJSON(url, '/api/auth/yo', {
                headers: { Cookie: cookieAdmin }
            });
            const resumen = await respuestaJSON(url, '/api/admin/resumen', {
                headers: { Cookie: cookieAdmin }
            });
            afirmar(yo.respuesta.status === 200 && yo.respuesta.headers.get('cache-control') === 'no-store',
                'auth/yo no devolvió no-store');
            afirmar(resumen.respuesta.status === 200
                && resumen.respuesta.headers.get('cache-control') === 'no-store',
            'admin/resumen no devolvió no-store');
        });

        await verificar('preflight PATCH da credenciales solo a origen permitido y ruta protegida', async () => {
            const encabezados = {
                Origin: origenPermitido,
                'Access-Control-Request-Method': 'PATCH',
                'Access-Control-Request-Headers': 'Content-Type'
            };
            const permitido = await fetch(`${url}/api/admin/resumen`, {
                method: 'OPTIONS',
                headers: encabezados
            });
            afirmar(permitido.status === 204, `el preflight permitido llegó ${permitido.status}`);
            afirmar(permitido.headers.get('access-control-allow-credentials') === 'true',
                'no permitió credenciales para admin');
            afirmar(/\bPATCH\b/.test(permitido.headers.get('access-control-allow-methods') || ''),
                'no permitió PATCH');

            const publico = await fetch(`${url}/api/eventos`, {
                method: 'OPTIONS',
                headers: encabezados
            });
            afirmar(publico.status === 204
                && publico.headers.get('access-control-allow-credentials') === null,
            'la ruta pública recibió credenciales');

            const rechazado = await fetch(`${url}/api/admin/resumen`, {
                method: 'OPTIONS',
                headers: { ...encabezados, Origin: 'https://origen-ajeno.invalid' }
            });
            afirmar(rechazado.status === 403
                && rechazado.headers.get('access-control-allow-credentials') === null,
            'el origen no permitido recibió credenciales o no fue rechazado');
        });
    } finally {
        if (server) {
            const cierre = once(server, 'close');
            server.close();
            await cierre;
        }
        if (db) {
            try {
                await Promise.all([
                    db.collection('orders').deleteMany({
                        $or: [
                            { id: { $in: ordenesCreadas } },
                            { 'cliente.email': emailCliente }
                        ]
                    }),
                    db.collection('products').deleteMany({ id: idProducto }),
                    db.collection('users').deleteMany({ _id: { $in: [idUsuarioAdmin, idUsuarioCliente] } }),
                    db.collection('sessions').deleteMany({
                        _id: { $in: [idSesionAdmin, idSesionCliente] }
                    }),
                    db.collection('auditoria').deleteMany({ usuario: idUsuarioAdmin }),
                    db.collection('limites').deleteMany({ clave: { $in: clavesLimite } })
                ]);
                console.log('OK limpieza de datos de prueba');
            } catch {
                console.log('FALLÓ limpieza de datos de prueba');
                fallos += 1;
            }
            await closeDatabase();
        }
        if (cronSecretAnterior === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = cronSecretAnterior;
        if (trustProxyAnterior === undefined) delete process.env.TRUST_PROXY;
        else process.env.TRUST_PROXY = trustProxyAnterior;
    }

    process.exitCode = fallos === 0 ? 0 : 1;
}

main().catch(() => {
    console.error('FALLÓ el flujo de prueba. Verificá la configuración de MongoDB y MONGODB_DB.');
    process.exitCode = 1;
});
