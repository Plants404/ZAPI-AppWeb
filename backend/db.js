'use strict';

const { MongoClient } = require('mongodb');

let cliente;
let baseDeDatos;

async function connectDatabase() {
    if (baseDeDatos) return baseDeDatos;

    const uri = process.env.MONGODB_URI;
    if (!uri || !uri.trim()) {
        throw new Error('Falta MONGODB_URI. Configurá la cadena privada en el entorno del backend.');
    }

    const nuevoCliente = new MongoClient(uri.trim(), {
        serverSelectionTimeoutMS: 10000
    });
    await nuevoCliente.connect();
    const nuevaBase = nuevoCliente.db(process.env.MONGODB_DB || 'zapi');
    await nuevaBase.command({ ping: 1 });
    await asegurarIndices(nuevaBase);

    cliente = nuevoCliente;
    baseDeDatos = nuevaBase;
    return baseDeDatos;
}

async function asegurarIndices(base) {
    await base.collection('orders').createIndex({ id: 1 }, { unique: true });
    await base.collection('orders').createIndex({ estado: 1, fecha: -1 });
    await base.collection('contacts').createIndex({ createdAt: -1 });
    await base.collection('testimonials').createIndex({ estado: 1, createdAt: -1 });
}

function getDatabase() {
    if (!baseDeDatos) {
        throw new Error('MongoDB no está conectado.');
    }
    return baseDeDatos;
}

async function closeDatabase() {
    if (cliente) await cliente.close();
    cliente = undefined;
    baseDeDatos = undefined;
}

module.exports = { closeDatabase, connectDatabase, getDatabase };
