'use strict';
/* ==========================================================
   SERVICIO: CONTACTO
   ------------------------------------------------------------
   La logica de negocio del formulario. El controlador solo
   traduce HTTP; guardar la consulta es cosa de aca.

   No hay transaccion: o se guarda la consulta entera o no se
   guarda nada, y eso ya lo garantiza un unico insert.
   ========================================================== */

const { Mensaje } = require('../models/mensaje.model');

async function guardarConsulta(datos) {
    const consulta = await Mensaje.create({
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        consulta: datos.consulta,
    });

    return consulta;
}

module.exports = { guardarConsulta };
