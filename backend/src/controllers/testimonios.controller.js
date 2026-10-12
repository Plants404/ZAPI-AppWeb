'use strict';
/* ==========================================================
   CONTROLADOR: TESTIMONIOS
   ------------------------------------------------------------
   Lista las opiniones publicadas. Cuando no hay ninguna,
   devuelve la lista vacia y el front sigue con su respaldo: la
   seccion de la home ya sabe dibujarse sin datos de la API.

   crear guarda la opinion que escribe una persona con sesion en
   la ventana flotante del carrito. Las otras dos funciones son
   de administracion (detras del token): listar todas -publicadas
   y ocultas, con su id- y publicar/despublicar una.
   ========================================================== */

const { validarTestimonio } = require('../validators/testimonio.validator');
const {
    listarPublicados,
    listarTodos,
    cambiarPublicado,
    crear: crearTestimonio,
} = require('../services/testimonios.service');

async function listar(req, res, next) {
    try {
        const testimonios = await listarPublicados();

        res.json({ testimonios });
    } catch (error) {
        next(error);
    }
}

/* POST /api/testimonios. El contrato es el que consume
   public/js/testimonio-form.js: exito 201 { ok, testimonio };
   error 400 { error, campo } para marcar ese input. */
async function crear(req, res, next) {
    try {
        const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};

        const resultado = validarTestimonio(cuerpo);

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error,
                campo: resultado.campo,
            });
        }

        /* La ruta pasa por exigirSesion, asi que req.usuario
           siempre esta: la opinion queda a nombre de la cuenta. */
        const testimonio = await crearTestimonio(
            resultado.datos,
            req.usuario ? req.usuario._id : null
        );

        res.status(201).json({ ok: true, testimonio });
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

module.exports = { listar, crear, listarAdmin, publicar };
