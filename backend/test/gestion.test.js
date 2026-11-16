'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { ObjectId } = require('mongodb');
const { crearApp } = require('../app.js');

const coincide = (i, f) => Object.entries(f).every(([k, v]) => String(i[k]) === String(v));

function crearBase(datos) {
    const col = { auditoria: [], contacts: [], testimonials: [], users: [], sessions: [], ...datos };
    return {
        col,
        async command() { return { ok: 1 }; },
        collection(n) {
            const items = col[n] || (col[n] = []);
            return {
                async insertOne(d) { items.push(d); return { insertedId: d._id }; },
                async findOne(f) { return items.find(i => coincide(i, f)) || null; },
                find(f) {
                    let r = items.filter(i => coincide(i, f || {}));
                    return { sort() { return this; }, limit(x) { r = r.slice(0, x); return this; }, async toArray() { return r; } };
                },
                async findOneAndUpdate(f, { $set }) { const d = items.find(i => coincide(i, f)); if (d) Object.assign(d, $set); return d; },
                async deleteOne(f) { const k = items.findIndex(i => coincide(i, f)); if (k >= 0) items.splice(k, 1); },
                async deleteMany(f) { for (let k = items.length - 1; k >= 0; k--) if (coincide(items[k], f)) items.splice(k, 1); }
            };
        }
    };
}

const yo = new ObjectId();
const otro = new ObjectId();
const sesion = { _id: 'adm', userId: String(yo), email: 'a@zapi.uy', rol: 'admin', nombre: 'A', expiresAt: new Date(Date.now() + 3600000) };

async function iniciar(base) {
    const app = await crearApp({ getDatabase: () => base });
    const server = http.createServer(app);
    server.listen(0);
    await new Promise(r => server.once('listening', r));
    return { server, url: `http://127.0.0.1:${server.address().port}` };
}

const pedir = (url, ruta, metodo = 'GET', cuerpo, cookie = 'sessionId=adm') => fetch(url + '/api/admin' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
});

test('mensajes: lista y cambia de estado con auditoría', async t => {
    const id = new ObjectId();
    const base = crearBase({ sessions: [sesion], contacts: [{ _id: id, nombre: 'Ana', email: 'a@b.uy', asunto: 'Hola', mensaje: 'Consulta larga', estado: 'new', createdAt: new Date() }] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const lista = await (await pedir(url, '/mensajes')).json();
    assert.equal(lista.mensajes[0].nombre, 'Ana');
    assert.equal((await pedir(url, `/mensajes/${id}`, 'PATCH', { estado: 'read' })).status, 200);
    assert.equal(base.col.contacts[0].estado, 'read');
    assert.equal(base.col.auditoria[0].accion, 'mensaje.estado');
    assert.equal((await pedir(url, `/mensajes/${id}`, 'PATCH', { estado: 'x' })).status, 400);
    assert.equal((await pedir(url, '/mensajes/zzz', 'PATCH', { estado: 'read' })).status, 404);
    assert.equal((await pedir(url, '/mensajes', 'GET', null, null)).status, 401);
});

test('testimonios: aprobar y rechazar', async t => {
    const id = new ObjectId();
    const base = crearBase({ sessions: [sesion], testimonials: [{ _id: id, autor: 'Luis', texto: 'Muy buenas plantas', estrellas: 5, estado: 'pending', createdAt: new Date() }] });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    assert.equal((await (await pedir(url, '/testimonios')).json()).testimonios.length, 1);
    assert.equal((await pedir(url, `/testimonios/${id}`, 'PATCH', { estado: 'approved' })).status, 200);
    assert.equal(base.col.testimonials[0].estado, 'approved');
    assert.equal((await pedir(url, `/testimonios/${id}`, 'PATCH', { estado: 'otro' })).status, 400);
});

test('usuarios: no expone claves, cambia rol y cierra sus sesiones; no permite cambiar el propio', async t => {
    const base = crearBase({
        sessions: [sesion, { _id: 'o1', userId: String(otro), rol: 'cliente', expiresAt: new Date(Date.now() + 3600000) }],
        users: [
            { _id: yo, email: 'a@zapi.uy', nombre: 'A', rol: 'admin', passwordHash: 'x', passwordSalt: 'y', createdAt: new Date() },
            { _id: otro, email: 'c@zapi.uy', nombre: 'C', rol: 'cliente', passwordHash: 'x', passwordSalt: 'y', createdAt: new Date() }
        ]
    });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const cuerpo = await (await pedir(url, '/usuarios')).text();
    assert.ok(!cuerpo.includes('passwordHash') && !cuerpo.includes('passwordSalt'));
    assert.equal((await pedir(url, `/usuarios/${yo}`, 'PATCH', { rol: 'cliente' })).status, 400);
    assert.equal((await pedir(url, `/usuarios/${otro}`, 'PATCH', { rol: 'superadmin' })).status, 400);
    assert.equal((await pedir(url, `/usuarios/${otro}`, 'PATCH', { rol: 'admin' })).status, 200);
    assert.equal(base.col.users[1].rol, 'admin');
    assert.ok(!base.col.sessions.some(s => s._id === 'o1'));
});

test('testimonios y usuarios: se pueden eliminar con auditoría; no la propia cuenta', async t => {
    const idT = new ObjectId();
    const base = crearBase({
        sessions: [sesion, { _id: 'o1', userId: String(otro), rol: 'cliente', expiresAt: new Date(Date.now() + 3600000) }],
        users: [{ _id: yo, email: 'a@zapi.uy', rol: 'admin' }, { _id: otro, email: 'o@zapi.uy', rol: 'cliente' }],
        testimonials: [{ _id: idT, autor: 'Luis', texto: 'Muy buenas plantas', estrellas: 5, estado: 'pending', createdAt: new Date() }]
    });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    assert.equal((await pedir(url, `/testimonios/${idT}`, 'DELETE')).status, 200);
    assert.equal(base.col.testimonials.length, 0);
    assert.equal((await pedir(url, `/testimonios/${idT}`, 'DELETE')).status, 404);

    assert.equal((await pedir(url, `/usuarios/${yo}`, 'DELETE')).status, 400);
    assert.equal((await pedir(url, `/usuarios/${otro}`, 'DELETE')).status, 200);
    assert.equal(base.col.users.length, 1);
    assert.equal(base.col.sessions.some(s => s.userId === String(otro)), false);
    assert.deepEqual(base.col.auditoria.map(a => a.accion), ['testimonio.eliminado', 'usuario.eliminado']);
    assert.equal((await pedir(url, `/usuarios/${otro}`, 'DELETE', null, null)).status, 401);
});
