'use strict';
/* ==========================================================
   CONTROLADOR: TESTIMONIOS
   ------------------------------------------------------------
   Lista las opiniones publicadas. Cuando no hay ninguna,
   devuelve la lista vacia y el front sigue con su respaldo: el
   carrusel de la home ya sabe dibujarse sin datos de la API.

   Las otras dos funciones son de administracion (detras del
   token): listar todas -publicadas y ocultas, con su id- y
   publicar/despublicar una.
   ========================================================== */

const {
    listarPublicados,
    listarTodos,
    cambiarPublicado,
} = require('../services/testimonios.service');

async function listar(req, res, next) {
    try {
        const testimonios = await listarPublicados();

        res.json({ testimonios });
    } catch (error) {
        next(error);
    }
}

async function listarAdmin(req, res, next) {
    try {
        res.json({ testimonios: await listarTodos() });
    } catch (error) {
        next(error);
    }
}

/* PATCH /api/testimonios/:id con { publicado: true|false }. */
async function publicar(req, res, next) {
    try {
        const { publicado } = req.body || {};

        if (typeof publicado !== 'boolean') {
            return res.status(400).json({ error: 'El campo publicado debe ser true o false' });
        }

        const testimonio = await cambiarPublicado(req.params.id, publicado);

        if (!testimonio) {
            return res.status(404).json({ error: 'Opinión no encontrada' });
        }

        res.json({ ok: true, testimonio });
    } catch (error) {
        next(error);
    }
}

module.exports = { listar, listarAdmin, publicar };
