'use strict';
/* ==========================================================
   CONTROLADOR: STOCK
   ------------------------------------------------------------
   PUT /api/stock/:id acepta null a proposito: null es "sin
   datos", el estado real de este catalogo hoy. Todo lo demas que
   no sea un entero no negativo se rechaza con 400.
   ========================================================== */

const { poner, verTodo } = require('../services/stock.service');
const { idNumerico } = require('../utils/numero');

async function ver(req, res, next) {
    try {
        res.json({ stock: await verTodo() });
    } catch (error) {
        next(error);
    }
}

async function cambiar(req, res, next) {
    try {
        const id = idNumerico(req.params.id);

        if (id === null) {
            return res.status(400).json({ error: 'Id de producto inválido' });
        }

        const unidades = req.body && Object.prototype.hasOwnProperty.call(req.body, 'unidades')
            ? req.body.unidades
            : null;

        if (unidades !== null) {
            const numero = Number(unidades);

            if (!Number.isInteger(numero) || numero < 0) {
                return res.status(400).json({ error: 'Las unidades deben ser un entero mayor o igual a 0' });
            }

            await poner(id, numero);

            return res.json({ ok: true, id, unidades: numero });
        }

        await poner(id, null);

        res.json({ ok: true, id, unidades: null });
    } catch (error) {
        next(error);
    }
}

module.exports = { ver, cambiar };