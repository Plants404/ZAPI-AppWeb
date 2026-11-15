'use strict';

const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');
const { registrarAuditoria } = require('../lib/auditoria.js');

const COLOR_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LIMITE_TEXTO = 120;

function textoSitio(valor, campo) {
    if (typeof valor !== 'string') throw new HttpError(400, `El campo ${campo} no es válido.`);
    const limpio = valor.trim();
    if (!limpio || limpio.length > LIMITE_TEXTO) {
        throw new HttpError(400, `El campo ${campo} no es válido.`);
    }
    return limpio;
}

function colorMarca(valor, campo) {
    if (typeof valor !== 'string' || !COLOR_HEX.test(valor.trim())) {
        throw new HttpError(400, `El campo ${campo} debe ser un color hex válido (ej. #ff5733).`);
    }
    return valor.trim();
}

function validarEstilo(estilo) {
    if (!estilo || typeof estilo !== 'object') {
        throw new HttpError(400, 'El estilo del sitio no es válido.');
    }
    return {
        titulo: textoSitio(estilo.titulo, 'titulo'),
        subtitulo: textoSitio(estilo.subtitulo, 'subtitulo'),
        boton: textoSitio(estilo.boton, 'boton'),
        colores: {
            primario: colorMarca(estilo.colores.primario, 'colores.primario'),
            secundario: colorMarca(estilo.colores.secundario, 'colores.secundario'),
            acento: colorMarca(estilo.colores.acento, 'colores.acento')
        }
    };
}

function clonarProducto(p) {
    return {
        id: p.id,
        slug: p.slug,
        nombre: p.nombre,
        categoria: p.categoria,
        imagen: p.imagen,
        imagenes: p.imagenes,
        descripcion: p.descripcion,
        precioBase: p.precioBase,
        stock: p.stock,
        active: !!p.active,
        visible: !!p.visible,
        destacado: !!p.destacado,
        infoDeVenta: p.infoDeVenta || ''
    };
}

function crearRouter(getDatabase) {
    const router = express.Router();

    /* Obtiene el borrador actual (o el publicado como base si no hay borrador). */
    router.get('/borrador', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const borrador = await db.collection('configuracionBorrador').findOne({ _id: 'borrador' });
        if (borrador) {
            return res.json({ borrador: limpiarId(borrador) });
        }

        const publicado = await db.collection('configuracionPublicada').findOne({ _id: 'publicado' });
        res.json({ borrador: publicado ? limpiarId(publicado) : null });
    });

    /* Guarda/actualiza el borrador de estilo y catálogo. */
    router.post('/borrador', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const { estilo, catalogo } = req.body || {};

        const estiloLimpio = validarEstilo(estilo);
        if (!Array.isArray(catalogo) || catalogo.length === 0) {
            throw new HttpError(400, 'El catálogo no puede estar vacío.');
        }

        const catalogoLimpio = catalogo.map(clonarProducto);
        const antes = await db.collection('configuracionBorrador').findOne({ _id: 'borrador' });

        await db.collection('configuracionBorrador').updateOne(
            { _id: 'borrador' },
            {
                $set: {
                    estilo: estiloLimpio,
                    catalogo: catalogoLimpio,
                    actualizadoPor: req.usuario,
                    actualizadoEn: new Date()
                }
            },
            { upsert: true }
        );

        await registrarAuditoria(db, req.usuario, 'publicacion.borrador', antes, {
            estilo: estiloLimpio,
            productos: catalogoLimpio.length
        }, 'Borrador de publicación actualizado');

        res.json({ ok: true });
    });

    /* Publica el borrador: guarda snapshot, crea versión, dispara DEPLOY_HOOK_URL. */
    router.post('/publicar', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const borrador = await db.collection('configuracionBorrador').findOne({ _id: 'borrador' });
        if (!borrador) {
            throw new HttpError(400, 'No hay borrador para publicar.');
        }

        const publicadoActual = await db.collection('configuracionPublicada').findOne({ _id: 'publicado' });
        const version = (publicadoActual && publicadoActual.version) ? publicadoActual.version + 1 : 1;

        const snapshot = {
            _id: `publicacion-${version}`,
            version,
            estilo: borrador.estilo,
            catalogo: borrador.catalogo,
            publicadoPor: {
                id: req.usuario.id,
                email: req.usuario.email,
                nombre: req.usuario.nombre
            },
            publicadoEn: new Date()
        };

        await db.collection('publicaciones').insertOne(snapshot);

        await db.collection('configuracionPublicada').updateOne(
            { _id: 'publicado' },
            {
                $set: {
                    version,
                    estilo: borrador.estilo,
                    catalogo: borrador.catalogo,
                    publicadoPor: snapshot.publicadoPor,
                    publicadoEn: snapshot.publicadoEn
                }
            },
            { upsert: true }
        );

        await db.collection('configuracionBorrador').deleteOne({ _id: 'borrador' });

        await registrarAuditoria(db, req.usuario, 'publicacion.publicar', null, {
            version,
            productos: borrador.catalogo.length
        }, `Publicada versión ${version} con ${borrador.catalogo.length} productos`);

        /* Dispara el aviso de redeploy solo si está configurado. */
        const deployHook = process.env.DEPLOY_HOOK_URL;
        if (deployHook) {
            try {
                await fetch(deployHook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ version, evento: 'publicacion' })
                });
            } catch {
                /* No fallar la publicación si el hook de redeploy no responde. */
            }
        }

        res.json({ ok: true, version });
    });

    /* Historial de las últimas 20 versiones publicadas. */
    router.get('/historial', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const entradas = await db.collection('publicaciones')
            .find()
            .sort({ publicadoEn: -1 })
            .limit(20)
            .toArray();

        res.json({
            historial: entradas.map(e => ({
                version: e.version,
                fecha: e.publicadoEn,
                usuario: e.publicadoPor,
                productos: e.catalogo.length,
                estilo: {
                    titulo: e.estilo.titulo,
                    colores: e.estilo.colores
                }
            }))
        });
    });

    /* Restaura una versión publicada como nuevo borrador (no sobrescribe lo publicado). */
    router.post('/restaurar/:id', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const { id } = req.params;
        const version = Number(id);

        if (!Number.isInteger(version) || version < 1) {
            throw new HttpError(400, 'Versión inválida.');
        }

        const entrada = await db.collection('publicaciones').findOne({ version });
        if (!entrada) throw new HttpError(404, 'Versión no encontrada.');

        const antes = await db.collection('configuracionBorrador').findOne({ _id: 'borrador' });

        await db.collection('configuracionBorrador').updateOne(
            { _id: 'borrador' },
            {
                $set: {
                    estilo: entrada.estilo,
                    catalogo: entrada.catalogo,
                    restauradoDe: version,
                    restauradoPor: req.usuario,
                    restauradoEn: new Date()
                }
            },
            { upsert: true }
        );

        await registrarAuditoria(db, req.usuario, 'publicacion.restaurar', antes, {
            version,
            productos: entrada.catalogo.length
        }, `Versión ${version} restaurada como borrador`);

        res.json({ ok: true, version });
    });

    return router;
}

function crearRouterPublicado(getDatabase) {
    const router = express.Router();

    router.get('/publicado', async (req, res) => {
        const publicado = await getDatabase().collection('configuracionPublicada')
            .findOne({ _id: 'publicado' });
        if (!publicado) {
            throw new HttpError(404, 'No hay versión publicada.');
        }

        const camposPublicos = [
            'id', 'slug', 'nombre', 'categoria', 'imagen', 'imagenes',
            'descripcion', 'precioBase', 'stock', 'destacado', 'infoDeVenta'
        ];
        const camposEstilo = ['titulo', 'subtitulo', 'boton'];
        const coloresPublicos = ['primario', 'secundario', 'acento'];
        const estilo = Object.fromEntries(
            camposEstilo
                .filter(campo => publicado.estilo && publicado.estilo[campo] !== undefined)
                .map(campo => [campo, publicado.estilo[campo]])
        );
        const colores = Object.fromEntries(
            coloresPublicos
                .filter(campo => publicado.estilo?.colores?.[campo] !== undefined)
                .map(campo => [campo, publicado.estilo.colores[campo]])
        );
        if (Object.keys(colores).length) estilo.colores = colores;

        res.json({
            version: publicado.version,
            estilo,
            catalogo: (publicado.catalogo || [])
                .filter(producto => producto.active !== false && producto.visible !== false)
                .map(producto => Object.fromEntries(
                    camposPublicos
                        .filter(campo => producto[campo] !== undefined)
                        .map(campo => [campo, producto[campo]])
                )),
            publicadoEn: publicado.publicadoEn
        });
    });

    return router;
}

function limpiarId(doc) {
    const copia = { ...doc };
    delete copia._id;
    return copia;
}

module.exports = { crearRouter, crearRouterPublicado };
