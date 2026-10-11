'use strict';
/* ==========================================================
   CONTROLADOR: CONTACTO
   ------------------------------------------------------------
   Traduce HTTP y nada mas: valida, delega en el servicio y
   arma la respuesta. El contrato es el que ya consume
   public/js/contacto.js:

     - exito:  201 { ok: true }
     - error:  400 { error, campo }  -> el front marca ese input

   Si el controlador cambiara la forma del error, el formulario
   perderia el nombre del campo y no sabria a donde llevar el
   foco.
   ========================================================== */

const { validarContacto, esTrampa } = require('../validators/contacto.validator');
const { guardarConsulta } = require('../services/contacto.service');

async function crear(req, res, next) {
    try {
        const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};

        /* Honeypot: si el campo oculto viene relleno se responde
           201 igual de ok sin guardar. Un error le ensenaria al
           robot que ese campo no hay que llenar. */
        if (esTrampa(cuerpo)) {
            return res.status(201).json({ ok: true });
        }

        const resultado = validarContacto(cuerpo);

        if (resultado.error) {
            return res.status(400).json({
                error: resultado.error,
                campo: resultado.campo,
            });
        }

        await guardarConsulta(resultado.datos);

        res.status(201).json({ ok: true });
    } catch (error) {
        next(error);
    }
}

module.exports = { crear };
