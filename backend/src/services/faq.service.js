'use strict';
/* ==========================================================
   SERVICIO: FAQ (MEMORIA DEL ASISTENTE)
   ------------------------------------------------------------
   Guarda y recupera respuestas para no pedirle al modelo dos
   veces lo mismo. Este modulo NO llama a DeepSeek: solo normaliza,
   mide parecido lexico y persiste. La verificacion con el modelo
   la hace asistente.service.js, para que aca se pueda testear sin
   red.

   Metrica de parecido: Jaccard sobre los tokens de la pregunta
   (interseccion / union). Es tosca, pero con un umbral bajo solo
   sirve para acercar candidatas; la decision final de reutilizar
   la toma el modelo con la pregunta y la respuesta a la vista.
   ========================================================== */

const config = require('../config/env');
const { Faq } = require('../models/faq.model');
const { limpiarTexto } = require('../utils/texto');

const MAX_CANDIDATAS = 3;

/* Muy pocas palabras se sacan: solo las que no aportan nada a
   distinguir una pregunta de otra. */
const PALABRAS_VACIAS = new Set([
    'los', 'las', 'una', 'que', 'por', 'para', 'con', 'sin', 'del',
    'como', 'mas', 'muy', 'pero', 'hay', 'son', 'esta', 'este', 'esa',
    'ese', 'sus', 'mis', 'nos', 'les', 'las', 'los', 'dame', 'tenes',
]);

/* Minusculas, sin acentos, sin signos, sin espacios de mas. La
   clave queda igual para "¿Envíos?" y "envios". */
function normalizar(valor) {
    return limpiarTexto(valor, 600)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizar(valor) {
    return normalizar(valor)
        .split(' ')
        .filter(p => p.length >= 3 && !PALABRAS_VACIAS.has(p));
}

function parecido(aTokens, bTokens) {
    const a = new Set(aTokens);
    const b = new Set(bTokens);

    if (!a.size || !b.size) return 0;

    let comunes = 0;

    for (const t of a) {
        if (b.has(t)) comunes++;
    }

    return comunes / (a.size + b.size - comunes);
}

/* Candidata mas parecida entre las FAQ activas, o null si ninguna
   llega al umbral. Devuelve tambien el puntaje para que quien
   llame pueda decidir. */
async function mejorCandidata(tokens) {
    const faqs = await Faq.find({ activo: true }).lean();

    let mejor = null;

    for (const faq of faqs) {
        const puntaje = parecido(tokens, faq.tokens || []);

        if (puntaje >= config.faqUmbral && (!mejor || puntaje > mejor.puntaje)) {
            mejor = { faq, puntaje };
        }
    }

    return mejor;
}

/* Sube la frecuencia de una FAQ reutilizada, sin tocar su texto. */
async function registrarUso(clave) {
    await Faq.updateOne({ clave }, { $inc: { frecuencia: 1 } });
}

/* Guarda una respuesta nueva. Si la pregunta ya existia (misma
   clave normalizada) no la pisa: sube la frecuencia y devuelve la
   que estaba, porque una respuesta ya guardada vale mas que una
   nueva sin revisar. */
async function guardar({ pregunta, respuesta, intencion = 'otro' }) {
    const clave = normalizar(pregunta);

    if (!clave) return null;

    const existente = await Faq.findOne({ clave }).lean();

    if (existente) {
        await Faq.updateOne({ clave }, { $inc: { frecuencia: 1 } });

        return existente;
    }

    return Faq.create({
        clave,
        pregunta: limpiarTexto(pregunta, 600),
        respuesta: limpiarTexto(respuesta, 4000),
        tokens: tokenizar(pregunta),
        intencion: limpiarTexto(intencion, 40) || 'otro',
        frecuencia: 1,
        generado: true,
        revisar: true,
        activo: true,
    });
}

/* Para el panel de revision (no hay UI todavia, pero deja el
   endpoint listo y evita que las respuestas generadas queden
   invisibles). */
async function listar({ soloRevisar = true, limite = 50 } = {}) {
    const filtro = soloRevisar ? { revisar: true } : {};

    return Faq.find(filtro)
        .sort({ frecuencia: -1, createdAt: -1 })
        .limit(Math.min(200, Math.max(1, limite)))
        .lean();
}

module.exports = {
    normalizar,
    tokenizar,
    parecido,
    mejorCandidata,
    registrarUso,
    guardar,
    listar,
    MAX_CANDIDATAS,
};
