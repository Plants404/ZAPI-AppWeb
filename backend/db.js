'use strict';

const { MongoClient } = require('mongodb');

let cliente;
let baseDeDatos;
let conexion;

/* Pool chico: en Vercel cada instancia de la función abre su propio pool y el
   plan gratuito de Atlas admite pocas conexiones en total. */
const OPCIONES_CLIENTE = Object.freeze({
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000
});

async function abrirConexion() {
    const uri = process.env.MONGODB_URI;
    if (!uri || !uri.trim()) {
        throw new Error('Falta MONGODB_URI. Configurá la cadena privada en el entorno del backend.');
    }

    const nuevoCliente = new MongoClient(uri.trim(), OPCIONES_CLIENTE);
    try {
        await nuevoCliente.connect();
        const nuevaBase = nuevoCliente.db(process.env.MONGODB_DB || 'zapi-api2');
        await nuevaBase.command({ ping: 1 });
        cliente = nuevoCliente;
        baseDeDatos = nuevaBase;
        return baseDeDatos;
    } catch (error) {
        await nuevoCliente.close().catch(() => {});
        throw error;
    }
}

/* Se guarda la promesa, no solo el resultado: si llegan dos peticiones
   mientras se conecta, las dos esperan la misma conexión. Si falla, se
   olvida para que la próxima petición vuelva a intentar. */
function connectDatabase() {
    if (!conexion) {
        conexion = abrirConexion().catch(error => {
            conexion = undefined;
            throw error;
        });
    }
    return conexion;
}

function getDatabase() {
    if (!baseDeDatos) {
        throw new Error('MongoDB no está conectado.');
    }
    return baseDeDatos;
}

async function closeDatabase() {
    const abierto = cliente;
    cliente = undefined;
    baseDeDatos = undefined;
    conexion = undefined;
    if (abierto) await abierto.close();
}

module.exports = { closeDatabase, connectDatabase, getDatabase };
