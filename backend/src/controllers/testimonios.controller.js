'use strict';
/* ==========================================================
   CONTROLADOR: TESTIMONIOS
   ------------------------------------------------------------
   Lista las opiniones publicadas. Cuando no hay ninguna,
   devuelve la lista vacia y el front sigue con su respaldo: el
   carrusel de la home ya sabe dibujarse sin datos de la API.
   ========================================================== */

const { listarPublicados } = require('../services/testimonios.service');

async function listar(req, res, next) {
    try {
        const testimonios = await listarPublicados();

        res.json({ testimonios });
    } catch (error) {
        next(error);
    }
}

module.exports = { listar };
