'use strict';

/* Limitador de intentos guardado en Mongo (colección `limites`). No usa la
   memoria del proceso, así que sirve en Vercel, donde cada invocación puede
   correr en una instancia distinta.

   Falla cerrado: si Mongo da error, el error se propaga y la petición se
   rechaza. Nunca se deja pasar una petición porque el limitador no pudo
   contar.

   Requiere dos índices (los crea `npm run backend:indices`):
   - único sobre `clave`, para que dos peticiones simultáneas no creen la
     misma ventana dos veces;
   - TTL sobre `expiraEn`, solo para limpiar documentos viejos. El vencimiento
     real se decide acá comparando fechas, porque el TTL de Mongo no es
     inmediato. */

const POLITICAS = Object.freeze({
    eventos: { limite: 30, ventanaMs: 60 * 1000 },
    login: { limite: 5, ventanaMs: 15 * 60 * 1000 },
    'login-correo': { limite: 20, ventanaMs: 60 * 60 * 1000 },
    registro: { limite: 3, ventanaMs: 60 * 60 * 1000 },
    pedidos: { limite: 10, ventanaMs: 60 * 1000 },
    contacto: { limite: 5, ventanaMs: 60 * 1000 },
    testimonios: { limite: 5, ventanaMs: 60 * 1000 },
    chat: { limite: 12, ventanaMs: 60 * 1000 }
});

const CLAVE_DUPLICADA = 11000;

/* Con la ventana vigente: suma 1 y devuelve el documento actualizado. */
function sumarEnVentanaVigente(coleccion, clave, ahora) {
    return coleccion.findOneAndUpdate(
        { clave, expiraEn: { $gt: ahora } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
    );
}

/* Sin ventana vigente: abre una nueva con contador 1. El filtro solo coincide
   con una ventana vencida; si hay una vigente (otra petición la abrió un
   instante antes) el upsert intenta crear una clave repetida, falla con
   clave duplicada y se suma sobre esa ventana, sin pisar su contador. */
async function abrirVentana(coleccion, clave, ahora, ventanaMs) {
    try {
        return await coleccion.findOneAndUpdate(
            { clave, expiraEn: { $lte: ahora } },
            { $set: { count: 1, expiraEn: new Date(ahora.getTime() + ventanaMs) } },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (error) {
        if (error.code !== CLAVE_DUPLICADA) throw error;
        return sumarEnVentanaVigente(coleccion, clave, ahora);
    }
}

async function verificarLimite(db, politica, clave) {
    const configuracion = POLITICAS[politica];
    if (!configuracion) {
        throw new Error(`Política de límite desconocida: ${politica}`);
    }

    const coleccion = db.collection('limites');
    const claveCompleta = `${politica}:${clave}`;
    const ahora = new Date();

    const registro = await sumarEnVentanaVigente(coleccion, claveCompleta, ahora)
        || await abrirVentana(coleccion, claveCompleta, ahora, configuracion.ventanaMs);

    if (!registro) {
        throw new Error('El limitador no pudo registrar el intento.');
    }

    if (registro.count > configuracion.limite) {
        const segundos = Math.ceil((registro.expiraEn.getTime() - ahora.getTime()) / 1000);
        return { permitido: false, retryAfter: Math.max(1, segundos) };
    }

    return { permitido: true, retryAfter: null };
}

module.exports = { POLITICAS, verificarLimite };
