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

    return router;
}

module.exports = { crearRouter };
