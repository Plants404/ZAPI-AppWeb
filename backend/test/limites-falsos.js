'use strict';

/* Colección `limites` falsa para las pruebas. Reproduce las reglas de MongoDB
   que importan para el limitador: los operadores de actualización, el índice
   único sobre `clave` y el rechazo de operadores en conflicto. Con
   `carrera: true`, otro proceso abre la ventana justo antes del primer
   upsert. */

function rutasDe(actualizacion) {
    const operadores = Object.keys(actualizacion);
    if (Array.isArray(actualizacion) || operadores.some(o => !o.startsWith('$'))) {
        throw new Error('La actualización debe usar solo operadores ($set, $inc...).');
    }
    const vistas = new Set();
    for (const operador of operadores) {
        for (const ruta of Object.keys(actualizacion[operador])) {
            if (vistas.has(ruta)) {
                throw new Error(`Conflicto de actualización en la ruta '${ruta}'.`);
            }
            vistas.add(ruta);
        }
    }
}

function crearLimitesFalsos({ carrera = false } = {}) {
    const documentos = [];
    let carreraPendiente = carrera;

    function coincide(documento, filtro) {
        if (documento.clave !== filtro.clave) return false;
        if (!filtro.expiraEn) return true;
        if ('$gt' in filtro.expiraEn) return documento.expiraEn > filtro.expiraEn.$gt;
        return documento.expiraEn <= filtro.expiraEn.$lte;
    }

    const coleccion = {
        async findOneAndUpdate(filtro, actualizacion, opciones = {}) {
            rutasDe(actualizacion);

            if (opciones.upsert && carreraPendiente) {
                carreraPendiente = false;
                documentos.push({ clave: filtro.clave, count: 1, expiraEn: new Date(Date.now() + 60000) });
            }

            let documento = documentos.find(d => coincide(d, filtro));
            if (!documento) {
                if (!opciones.upsert) return null;
                if (documentos.some(d => d.clave === filtro.clave)) {
                    const error = new Error('E11000 duplicate key error');
                    error.code = 11000;
                    throw error;
                }
                documento = { clave: filtro.clave };
                documentos.push(documento);
            }

            for (const [ruta, valor] of Object.entries(actualizacion.$inc || {})) {
                documento[ruta] = (documento[ruta] || 0) + valor;
            }
            Object.assign(documento, actualizacion.$set || {});
            return { ...documento };
        }
    };

    return { coleccion, documentos };
}

/* Una colección `limites` por base falsa, para las pruebas que arman su propia
   base con `collection(nombre) { ... }`: dentro de ese método, `limitesDe(this)`
   devuelve siempre la misma colección de esa base. */
const limitesPorBase = new WeakMap();

function limitesDe(base) {
    if (!limitesPorBase.has(base)) limitesPorBase.set(base, crearLimitesFalsos());
    return limitesPorBase.get(base).coleccion;
}

module.exports = { crearLimitesFalsos, limitesDe };
