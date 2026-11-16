'use strict';

const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');
const { verificarLimite } = require('../lib/limiter.js');
const {
    TIPOS_EVENTO,
    TTL_DIAS,
    esTipoValido,
    normalizarEvento
} = require('../lib/eventos.js');
const { calcularAnalitica, calcularClientes } = require('../lib/analitica.js');

const PERIODOS_VALIDOS = [7, 30, 90];
const DIA_MS = 24 * 60 * 60 * 1000;

function crearRouter(getDatabase) {
    const router = express.Router();

    /* Evento de analítica anónimo (público, sin sesión).
       Rate limiting por IP del cliente. No guarda IP. */
    router.post('/eventos', async (req, res) => {
        const db = getDatabase();

        let evento;
        try {
            evento = normalizarEvento(req.body);
        } catch (error) {
            throw new HttpError(400, error.message || 'Evento no válido.');
        }

        const { permitido, retryAfter } = await verificarLimite(db, 'eventos', req.ip);
        if (!permitido) {
            res.set('Retry-After', String(retryAfter));
            throw new HttpError(429, 'Demasiados eventos. Intentá de nuevo más tarde.');
        }

        await db.collection('eventos').insertOne({
            ...evento,
            ttl: new Date(Date.now() + TTL_DIAS * 24 * 60 * 60 * 1000)
        });

        res.status(202).json({ ok: true });
    });

    /* Lectura de eventos para la pantalla de analítica (solo admin). */
    router.get('/admin/eventos', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const desde = req.query.desde;
        const hasta = req.query.hasta;
        const tipo = req.query.tipo;
        const pagina = req.query.pagina;

        const filtro = {};
        if (desde || hasta) {
            filtro.timestamp = {};
            if (desde) filtro.timestamp.$gte = new Date(desde);
            if (hasta) filtro.timestamp.$lte = new Date(hasta);
        }
        if (tipo && esTipoValido(tipo)) filtro.tipo = tipo;
        if (pagina) filtro.pagina = pagina;

        const eventos = await db.collection('eventos')
            .find(filtro, { projection: { _id: 0, ttl: 0 } })
            .sort({ timestamp: -1 })
            .limit(500)
            .toArray();

        const porTipo = {};
        for (const t of TIPOS_EVENTO) {
            porTipo[t] = eventos.filter(e => e.tipo === t).length;
        }

        res.json({
            eventos,
            total: eventos.length,
            porTipo,
            tipos: TIPOS_EVENTO
        });
    });

    /* Resumen de analítica ya calculado: período actual contra el anterior. */
    router.get('/admin/analitica', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const pedido = Number(req.query.dias);
        const dias = PERIODOS_VALIDOS.includes(pedido) ? pedido : 30;
        const ahora = new Date();
        const desde = new Date(ahora.getTime() - 2 * dias * DIA_MS);

        const eventos = await db.collection('eventos')
            .find({ timestamp: { $gte: desde } }, { projection: { _id: 0, ttl: 0 } })
            .limit(100000)
            .toArray();
        const pedidos = await db.collection('orders')
            .find({ fecha: { $gte: new Date(ahora.getTime() - dias * DIA_MS) } })
            .limit(5000)
            .toArray();
        const validos = pedidos.filter(p => p.estado !== 'cancelado');

        const ids = new Set();
        for (const evento of eventos) if (evento.productoId) ids.add(evento.productoId);
        const nombres = new Map();
        if (ids.size) {
            const buscados = [...ids, ...[...ids].filter(id => /^\d+$/.test(id)).map(Number)];
            const productos = await db.collection('products').find({ id: { $in: buscados } }).toArray();
            for (const producto of productos) nombres.set(String(producto.id), producto.nombre);
        }

        res.json(calcularAnalitica({ eventos, pedidos: validos, nombres, dias, ahora }));
    });

    /* Clientes con pedidos: segmentos, fichas y promedios. */
    router.get('/admin/clientes', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const pedidos = await db.collection('orders').find({}).limit(5000).toArray();
        res.json(calcularClientes(pedidos, new Date()));
    });

    return router;
}

module.exports = { crearRouter };
