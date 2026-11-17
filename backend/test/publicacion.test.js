'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { crearApp } = require('../app.js');

const ESTILO_VALIDO = {
    titulo: 'Vivero ZAPI',
    subtitulo: 'Plantas agroecológicas y orgánicas',
    boton: 'Conocer el catálogo',
    colores: {
        primario: '#2e7d32',
        secundario: '#ffb300',
        acento: '#1565c0'
    }
};

const CATALOGO_VALIDO = [
    { id: 1, slug: 'albahaca', nombre: 'Albahaca', precioBase: 150, stock: 12, active: true, visible: true, destacado: true },
    { id: 2, slug: 'menta', nombre: 'Menta', precioBase: 120, stock: 8, active: true, visible: false, destacado: false }
];

function crearBaseFalsa({
    sessions = [],
    publicaciones = [],
    configuracionBorrador = [],
    configuracionPublicada = [],
    auditoria = []
} = {}) {
    const colecciones = {
        sessions: [...sessions],
        publicaciones: [...publicaciones],
        configuracionBorrador: [...configuracionBorrador],
        configuracionPublicada: [...configuracionPublicada],
        auditoria: [...auditoria]
    };

    function coincide(item, filtro) {
        for (const [campo, valor] of Object.entries(filtro)) {
            if (item[campo] !== valor) return false;
        }
        return true;
    }

    return {
        async command() {
            return { ok: 1 };
        },
        collection(nombre) {
            const items = colecciones[nombre];
            if (!items) throw new Error(`Colección inesperada: ${nombre}`);

            return {
                async insertOne(documento) {
                    items.push(documento);
                    return { insertedId: documento._id };
                },
                async findOne(filtro) {
                    return items.find(item => coincide(item, filtro)) || null;
                },
                find(filtro) {
                    let resultado = filtro
                        ? items.filter(item => coincide(item, filtro))
                        : [...items];
                    let orden = null;
                    let limite = null;
                    return {
                        sort(criterios) {
                            orden = criterios;
                            return this;
                        },
                        limit(n) {
                            limite = n;
                            return this;
                        },
                        async toArray() {
                            let r = resultado;
                            if (orden) {
                                const [campo, direccion] = Object.entries(orden)[0];
                                r = [...r].sort((a, b) => {
                                    const va = a[campo];
                                    const vb = b[campo];
                                    if (va === vb) return 0;
                                    if (va < vb) return direccion === -1 ? 1 : -1;
                                    return direccion === -1 ? -1 : 1;
                                });
                            }
                            if (limite !== null) r = r.slice(0, limite);
                            return r;
                        }
                    };
                },
                async updateOne(filtro, actualizacion, opciones) {
                    const indice = items.findIndex(item => coincide(item, filtro));
                    if (indice !== -1) {
                        if (actualizacion.$set) {
                            Object.assign(items[indice], actualizacion.$set);
                        }
                        return { matchedCount: 1, modifiedCount: 1 };
                    }
                    if (opciones && opciones.upsert) {
                        const nuevo = { ...filtro, ...actualizacion.$set };
                        items.push(nuevo);
                        return { matchedCount: 0, modifiedCount: 0, upsertedId: nuevo._id };
                    }
                    return { matchedCount: 0, modifiedCount: 0 };
                },
                async deleteOne(filtro) {
                    const antes = items.length;
                    const filtrados = items.filter(item => !coincide(item, filtro));
                    items.splice(0, items.length, ...filtrados);
                    return { deletedCount: antes - filtrados.length };
                }
            };
        }
    };
}

async function iniciar(base) {
    const app = await crearApp({ getDatabase: () => base });
    const server = http.createServer(app);
    server.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    return {
        server,
        url: `http://127.0.0.1:${server.address().port}`
    };
}

async function fetchPublicacion(url, path, sessionId, opciones = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) {
        headers.Cookie = `sessionId=${sessionId}`;
    }
    const ruta = path === '/publicado'
        ? `${url}/api${path}`
        : `${url}/api/admin/publicacion${path}`;
    return fetch(ruta, {
        method: opciones.method || 'GET',
        headers,
        body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
    });
}

/* ========================================================================
   A) Borrador - GET
   ======================================================================== */

test('F1: publicado GET sin versión publicada responde 404', async t => {
    const base = crearBaseFalsa();
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchPublicacion(url, '/publicado');
    assert.equal(respuesta.status, 404);
});

test('F1b: publicado GET no usa un borrador como versión pública', async t => {
    const base = crearBaseFalsa({
        configuracionBorrador: [{
            _id: 'borrador',
            estilo: ESTILO_VALIDO,
            catalogo: CATALOGO_VALIDO
        }]
    });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchPublicacion(url, '/publicado');
    assert.equal(respuesta.status, 404);
});

test('F2: GET /api/publicado devuelve solo campos públicos de lo publicado', async t => {
    const base = crearBaseFalsa({
        configuracionPublicada: [{
            _id: 'publicado',
            version: 3,
            estilo: {
                ...ESTILO_VALIDO,
                usuarioId: 'usuario-interno',
                auditoria: { evento: 'interno' },
                colores: { ...ESTILO_VALIDO.colores, secreto: 'interno' }
            },
            catalogo: [{
                ...CATALOGO_VALIDO[0],
                categoria: 'Aromáticas',
                imagen: 'public/img/albahaca.jpg',
                imagenes: ['public/img/albahaca.jpg'],
                descripcion: 'Planta aromática.',
                infoDeVenta: ['Lista para plantar'],
                _id: 'producto-interno',
                usuarioId: 'usuario-interno',
                auditoria: { evento: 'interno' },
                borrador: true
            }, CATALOGO_VALIDO[1]],
            publicadoPor: { id: 'usuario-admin-1', email: 'admin-1@zapi.uy', nombre: 'Usuario admin-1' },
            auditoria: [{ usuario: 'usuario-admin-1' }],
            borrador: { catalogo: CATALOGO_VALIDO },
            publicadoEn: new Date()
        }]
    });
    const { server, url } = await iniciar(base);
    t.after(() => server.close());

    const respuesta = await fetchPublicacion(url, '/publicado');
    assert.equal(respuesta.status, 200);
    const datos = await respuesta.json();
    assert.equal(datos.version, 3);
    assert.equal(datos.estilo.titulo, ESTILO_VALIDO.titulo);
    assert.equal(datos.catalogo.length, 1);
    assert.equal(datos.catalogo[0].slug, 'albahaca');
    assert.deepEqual(Object.keys(datos.estilo).sort(), ['boton', 'colores', 'subtitulo', 'titulo']);
    assert.deepEqual(Object.keys(datos.estilo.colores).sort(), ['acento', 'primario', 'secundario']);
    assert.deepEqual(
        Object.keys(datos.catalogo[0]).sort(),
        ['categoria', 'descripcion', 'destacado', 'id', 'imagen', 'imagenes', 'infoDeVenta', 'nombre', 'precioBase', 'slug', 'stock']
    );
    assert.equal('active' in datos.catalogo[0], false);
    assert.equal('visible' in datos.catalogo[0], false);
    assert.equal('_id' in datos, false);
    assert.equal('publicadoPor' in datos, false);
    assert.equal('auditoria' in datos, false);
    assert.equal('borrador' in datos, false);
    assert.ok(datos.publicadoEn);
});
