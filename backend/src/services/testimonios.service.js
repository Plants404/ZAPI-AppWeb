'use strict';
/* ==========================================================
   SERVICIO: TESTIMONIOS
   ------------------------------------------------------------
   Devuelve las opiniones publicadas con la forma que espera el
   carrusel de la home. Se limita el resultado: con un catalogo
   chico no hace falta traer todo, y el front no muestra mas de
   cinco por pagina de todas formas.

   La consulta lleva lean() porque es de solo lectura y no se
   necesitan los documentos de Mongoose: se serializa mas rapido.
   ========================================================== */

const { Testimonio } = require('../models/testimonio.model');

const MAXIMO = 50;

async function listarPublicados() {
    const documentos = await Testimonio
        .find({ publicado: true })
        .sort({ fecha: -1 })
        .limit(MAXIMO)
        .lean();

    /* El _id no lo necesita el front; el carrusel se arma con
       estos cinco campos. */
    return documentos.map(documento => ({
        autor: documento.autor,
        lugar: documento.lugar || '',
        texto: documento.texto,
        estrellas: documento.estrellas,
        fecha: documento.fecha,
    }));
}

module.exports = { listarPublicados };
