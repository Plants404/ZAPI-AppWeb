'use strict';

const mongoose = require('mongoose');

/* Una sola expresión de correo para toda la API. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function campoError(response, campo, mensaje) {
    return response.status(400).json({ error: mensaje, campo });
}

function esEnteroPositivo(valor) {
    return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

function esEnteroNoNegativo(valor) {
    return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0;
}

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function textoOpcional(valor) {
    if (valor === undefined || valor === null) return null;
    return typeof valor === 'string' ? valor.trim() : undefined;
}

function normalizarEmail(valor) {
    return texto(valor).toLowerCase();
}

function validarTelefono(valor) {
    return typeof valor === 'string'
        && /^[+0-9\s().-]+$/.test(valor)
        && valor.replace(/\D/g, '').length >= 6
        && valor.length <= 40;
}

function redondear(valor) {
    return Math.round((Number(valor) || 0) * 100) / 100;
}

function escaparRegex(valor) {
    return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paginacion(query) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(query.limite) || 25));
    return { pagina, limite, salto: (pagina - 1) * limite };
}

function esIdMongo(valor) {
    return typeof valor === 'string' && mongoose.isValidObjectId(valor);
}

function slugify(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 140);
}

/* Acepta rutas relativas del sitio o URLs http(s) para las fotos. */
function validarImagen(valor) {
    if (typeof valor !== 'string') return false;
    const limpio = valor.trim();
    if (!limpio || limpio.length > 500) return false;
    if (/^https?:\/\/[^\s]+$/i.test(limpio)) return true;
    return /^[a-zA-Z0-9._~\-/]+$/.test(limpio) && !limpio.includes('..');
}

function parseFecha(valor, finDelDia = false) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const fecha = new Date(`${valor}T${finDelDia ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

module.exports = {
    EMAIL_PATTERN,
    campoError,
    esEnteroNoNegativo,
    esEnteroPositivo,
    esIdMongo,
    escaparRegex,
    normalizarEmail,
    paginacion,
    parseFecha,
    redondear,
    slugify,
    texto,
    textoOpcional,
    validarImagen,
    validarTelefono,
};
