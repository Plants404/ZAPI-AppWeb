'use strict';
/* ==========================================================
   CONEXION A MONGODB (MONGOOSE)
   ------------------------------------------------------------
   El servidor no informa que esta listo hasta que Mongo
   responde. Arrancar a escuchar con la base caida deja al
   visitante mandando un formulario que se pierde en silencio.

   Los reintentos son pocos y espaciados: en desarrollo Mongo
   suele estar en la misma maquina y el arranque es inmediato; en
   produccion un proveedor (Atlas) puede tardar unos segundos en
   aceptar la primera conexion. En modo test no se reintenta: la
   base efimera ya esta lista y esperar solo alarga la suite.
   ========================================================== */

const mongoose = require('mongoose');
const config = require('./env');
const log = require('../utils/log');

const ESPERA_REINTENTO = 1500;

/* 0 disconnected, 1 connected, 2 connecting, 3 disconnecting. */
const NOMBRES_ESTADO = {
    0: 'desconectado',
    1: 'conectado',
    2: 'conectando',
    3: 'desconectando',
};

async function conectar({ uri = config.mongoUri, reintentos } = {}) {
    /* Un X-Field que no esta en el esquema no se guarda ni se
       consulta: no es lo que se busca con el strictQuery. */
    mongoose.set('strictQuery', true);
    mongoose.set('bufferCommands', false);

    const intentos = Number.isInteger(reintentos)
        ? reintentos
        : (config.esTest ? 1 : 5);

    const opciones = {
        serverSelectionTimeoutMS: Math.min(config.mongoTimeout, 5000),
        connectTimeoutMS: config.mongoTimeout,
        socketTimeoutMS: config.mongoTimeout,
        maxPoolSize: 10,
    };

    let ultimoError = null;

    for (let intento = 1; intento <= intentos; intento++) {
        try {
            await mongoose.connect(uri, opciones);

            return mongoose.connection;
        } catch (error) {
            ultimoError = error;

            const ultimo = intento === intentos;

            log.warn('conexion a Mongo fallida', {
                intento,
                intentos,
                mensaje: error.message,
                ultimo,
            });

            if (ultimo) break;

            await new Promise(resolver => setTimeout(resolver, ESPERA_REINTENTO));
        }
    }

    throw new Error(
        `No se pudo conectar a MongoDB (${config.mongoUri}). ` +
        `Ultimo error: ${ultimoError ? ultimoError.message : 'desconocido'}`
    );
}

async function cerrar() {
    try {
        await mongoose.connection.close();
    } catch (error) {
        /* Si ya estaba cerrada no es un problema. */
    }
}

function estado() {
    return mongoose.connection.readyState;
}

function nombreEstado() {
    return NOMBRES_ESTADO[estado()] || 'desconocido';
}

function listo() {
    return estado() === 1;
}

module.exports = { conectar, cerrar, estado, nombreEstado, listo };
