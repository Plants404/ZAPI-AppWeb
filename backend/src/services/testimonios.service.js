'use strict';
/* ==========================================================
   SERVICIO: TESTIMONIOS
   ------------------------------------------------------------
   Devuelve las opiniones publicadas con la forma que espera el
   carrusel de la home y, al arrancar, siembra la coleccion desde
   public/data/testimonios.json.

   El JSON es el mismo que baja el carrusel cuando la API no
   esta (sitio estatico), y sale de datos/testimonios.js con
   npm run generar:testimonios: una sola copia de cada opinion,
   imposible que la base y el respaldo disparen.

   Se limita el resultado: con un catalogo chico no hace falta
   traer todo, y el front no muestra mas de cinco por pagina de
   todas formas. La consulta lleva lean() porque es de solo
   lectura y no se necesitan los documentos de Mongoose: se
   serializa mas rapido.
   ========================================================== */

const fs = require('fs');
const path = require('path');

const { Testimonio } = require('../models/testimonio.model');
const log = require('../utils/log');

const MAXIMO = 50;

const RAIZ = path.resolve(__dirname, '..', '..', '..');

/* Vive bajo public/ porque es lo mismo que baja el navegador. */
const ARCHIVO = path.join(RAIZ, 'public', 'data', 'testimonios.json');

/* Lee el JSON y tira con un mensaje util si falta o esta roto.
   Que tire en vez de devolver null es a proposito: la home se
   queda sin opiniones si la siembra no corre, y eso es mas
   facil de arrancar sabiendo que el archivo no esta. */
function leerTestimonios() {
    if (!fs.existsSync(ARCHIVO)) {
        throw new Error(
            'No existe public/data/testimonios.json. '
            + 'Se genera con: npm run generar:testimonios'
        );
    }

    let documento;

    try {
        documento = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    } catch (error) {
        throw new Error('public/data/testimonios.json esta roto: ' + error.message);
    }

    const testimonios = documento && documento.testimonios;

    if (!Array.isArray(testimonios) || testimonios.length === 0) {
        throw new Error('public/data/testimonios.json no trae una lista de opiniones con contenido');
    }

    return testimonios;
}

/* Convierte una opinion del JSON al documento que espera Mongo.
   La fecha se escribe como YYYY-MM-DD en la fuente y aca se
   vuelve Date (medianoche UTC) para que el orden por fecha del
   carrusel sea estable. */
function aDocumento(testimonio) {
    if (!testimonio.autor || !testimonio.texto ||
        typeof testimonio.estrellas !== 'number' || !testimonio.fecha) {
        throw new Error(`Opinion incompleta: ${JSON.stringify(testimonio).slice(0, 120)}`);
    }

    const fecha = new Date(testimonio.fecha + 'T00:00:00Z');

    if (Number.isNaN(fecha.getTime())) {
        throw new Error(`Fecha invalida en la opinion de ${testimonio.autor}: ${testimonio.fecha}`);
    }

    return {
        autor: testimonio.autor,
        lugar: testimonio.lugar || '',
        texto: testimonio.texto,
        estrellas: testimonio.estrellas,
        fecha,
        publicado: true,
    };
}

/* Al arrancar. Upsert por autor + fecha: correr lo mismo dos
   veces no duplica opiniones ni pisa las editadas a mano con la
   misma autor y fecha. No hay una llave unica en el esquema y no
   hace falta agregarla: autor + fecha alcanzan para un carrusel
   de notas escritas. */
async function sembrarTestimonios() {
    const documentos = leerTestimonios().map(aDocumento);

    await Testimonio.bulkWrite(documentos.map(d => ({
        updateOne: {
            filter: { autor: d.autor, fecha: d.fecha },
            update: { $set: d },
            upsert: true,
        },
    })));

    log.info('testimonios sembrados', { opiniones: documentos.length });
}

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

module.exports = { sembrarTestimonios, listarPublicados };