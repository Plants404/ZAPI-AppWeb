'use strict';

/* Contenido editable del sitio: { pagina: { seccion: { campo: valor } } }.
   Solo se aceptan los campos del esquema compartido con el frontend; todo lo
   demás se descarta. Un texto vacío significa "usar el original". */

const { ObjectId } = require('mongodb');
const { HttpError } = require('./http-error.js');
const esquema = require('../../frontend/public/js/esquema-editable.js');

const ID_IMAGEN = /^[a-f0-9]{24}$/;
const LIMITE_ALT = 160;

function textoLimpio(valor, campo) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string') throw new HttpError(400, `El campo "${campo.etiqueta}" no es válido.`);
    const limpio = valor.replace(/\s+/g, ' ').trim();
    if (!limpio) return null;
    if (limpio.length > campo.max) {
        throw new HttpError(400, `"${campo.etiqueta}" admite hasta ${campo.max} caracteres.`);
    }
    return limpio;
}

function imagenLimpia(valor, campo) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'object' || typeof valor.id !== 'string' || !ID_IMAGEN.test(valor.id)) {
        throw new HttpError(400, `La imagen de "${campo.etiqueta}" no es válida.`);
    }
    const alt = typeof valor.alt === 'string' ? valor.alt.replace(/\s+/g, ' ').trim() : '';
    if (alt.length > LIMITE_ALT) {
        throw new HttpError(400, `La descripción de la imagen admite hasta ${LIMITE_ALT} caracteres.`);
    }
    return { id: valor.id, alt };
}

function validarContenido(contenido) {
    if (contenido === undefined || contenido === null) return {};
    if (typeof contenido !== 'object' || Array.isArray(contenido)) {
        throw new HttpError(400, 'El contenido del sitio no es válido.');
    }

    const limpio = {};
    for (const pagina of esquema.paginas) {
        const deLaPagina = contenido[pagina.id];
        if (!deLaPagina || typeof deLaPagina !== 'object') continue;

        for (const seccion of pagina.secciones) {
            const valores = deLaPagina[seccion.id];
            if (!valores || typeof valores !== 'object') continue;

            for (const campo of seccion.campos) {
                const valor = campo.tipo === 'imagen'
                    ? imagenLimpia(valores[campo.id], campo)
                    : textoLimpio(valores[campo.id], campo);
                if (valor === null) continue;

                limpio[pagina.id] = limpio[pagina.id] || {};
                limpio[pagina.id][seccion.id] = limpio[pagina.id][seccion.id] || {};
                limpio[pagina.id][seccion.id][campo.id] = valor;
            }
        }
    }
    return limpio;
}

function idsDeImagenes(contenido) {
    const ids = new Set();
    for (const secciones of Object.values(contenido)) {
        for (const campos of Object.values(secciones)) {
            for (const valor of Object.values(campos)) {
                if (valor && typeof valor === 'object' && valor.id) ids.add(valor.id);
            }
        }
    }
    return [...ids];
}

/* Las imágenes elegidas tienen que existir en la biblioteca. */
async function comprobarImagenes(db, contenido) {
    const ids = idsDeImagenes(contenido);
    if (!ids.length) return;
    const existentes = await db.collection('imagenes')
        .countDocuments({ _id: { $in: ids.map(id => new ObjectId(id)) } });
    if (existentes !== ids.length) {
        throw new HttpError(400, 'Alguna imagen elegida ya no está en la biblioteca.');
    }
}

module.exports = { validarContenido, comprobarImagenes };
