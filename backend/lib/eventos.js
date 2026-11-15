'use strict';

/* Eventos de analítica anónimos, propios, sin cookies de terceros ni datos
   personales. Tipos de evento con lista cerrada. */

const TIPOS_EVENTO = Object.freeze([
    'vista_de_pagina',
    'clic_elemento_clave',
    'agregar_al_carrito',
    'inicio_de_pedido',
    'clic_a_whatsapp'
]);

const ELEMENTOS_VALIDOS = Object.freeze([
    null, 'boton-primario', 'boton-secundario', 'add-cart',
    'boton-confirmar-pedido', 'whatsapp'
]);

const DISPOSITIVOS_VALIDOS = Object.freeze(['computadora', 'movil']);

const TTL_DIAS = 90;
const ID_SESION_MAX_LONGITUD = 64;
const PAGINA_MAX_LONGITUD = 200;

const { esRutaPublicaConocida, normalizarRuta } = require('./paginas-publicas.js');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const ID_SESION_REGEX = /^[A-Za-z0-9-]{8,64}$/;

function esIdSesionValido(idSesion) {
    if (typeof idSesion !== 'string') return false;
    const limpio = idSesion.trim();
    if (!limpio || limpio.length > ID_SESION_MAX_LONGITUD) return false;
    return UUID_REGEX.test(limpio) || ID_SESION_REGEX.test(limpio);
}

function esTipoValido(tipo) {
    return typeof tipo === 'string' && TIPOS_EVENTO.includes(tipo);
}

function esElementoValido(elemento) {
    return ELEMENTOS_VALIDOS.includes(elemento);
}

function esPaginaValida(pagina) {
    if (typeof pagina !== 'string') return false;
    const limpio = pagina.trim();
    if (!limpio || limpio.length > PAGINA_MAX_LONGITUD) return false;
    if (!limpio.startsWith('/')) return false;
    return esRutaPublicaConocida(limpio);
}

function normalizarPagina(pagina) {
    if (typeof pagina !== 'string') return pagina;
    return normalizarRuta(pagina);
}

function esDispositivoValido(dispositivo) {
    return typeof dispositivo === 'string' && DISPOSITIVOS_VALIDOS.includes(dispositivo);
}

function normalizarEvento(datos) {
    if (!datos || typeof datos !== 'object') {
        throw new Error('El evento no es válido.');
    }

    const tipo = datos.tipo;
    if (!esTipoValido(tipo)) {
        throw new Error('Tipo de evento no válido.');
    }

    const idSesion = typeof datos.idSesion === 'string' && datos.idSesion.trim()
        ? datos.idSesion.trim()
        : null;
    if (!idSesion || !esIdSesionValido(idSesion)) {
        throw new Error('Id de sesión no válido.');
    }

    const pagina = typeof datos.pagina === 'string' && datos.pagina.trim()
        ? datos.pagina.trim()
        : null;
    if (!pagina || !esPaginaValida(pagina)) {
        throw new Error('Página no válida.');
    }
    const paginaNormalizada = normalizarRuta(pagina);

    const elemento = datos.elemento === undefined ? null : datos.elemento;
    if (!esElementoValido(elemento)) {
        throw new Error('Elemento no válido.');
    }

    const dispositivo = typeof datos.dispositivo === 'string' && datos.dispositivo.trim()
        ? datos.dispositivo.trim()
        : 'computadora';
    if (!esDispositivoValido(dispositivo)) {
        throw new Error('Dispositivo no válido.');
    }

    return {
        tipo,
        idSesion,
        pagina: paginaNormalizada,
        elemento,
        dispositivo,
        timestamp: new Date()
    };
}

function normalizarPagina(pagina) {
    return normalizarRuta(pagina);
}

module.exports = {
    TIPOS_EVENTO,
    ELEMENTOS_VALIDOS,
    DISPOSITIVOS_VALIDOS,
    TTL_DIAS,
    esTipoValido,
    esElementoValido,
    esPaginaValida,
    esIdSesionValido,
    esDispositivoValido,
    normalizarEvento,
    normalizarPagina
};
