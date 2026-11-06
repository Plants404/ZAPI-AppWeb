'use strict';

/* Cliente HTTP compartido. Todas las páginas llaman a la API con rutas
   relativas: en desarrollo el servidor estático hace de proxy y en
   producción el sitio y la API viven en el mismo origen. */

const API = Object.freeze({
    get(ruta, opciones) {
        return apiPedir(ruta, { ...opciones, method: 'GET' });
    },
    post(ruta, cuerpo, opciones) {
        return apiPedir(ruta, { ...opciones, method: 'POST', body: cuerpo });
    },
    put(ruta, cuerpo, opciones) {
        return apiPedir(ruta, { ...opciones, method: 'PUT', body: cuerpo });
    },
    patch(ruta, cuerpo, opciones) {
        return apiPedir(ruta, { ...opciones, method: 'PATCH', body: cuerpo });
    },
    del(ruta, opciones) {
        return apiPedir(ruta, { ...opciones, method: 'DELETE' });
    },
    pedir: apiPedir
});

async function apiPedir(ruta, opciones = {}) {
    const configuracion = {
        credentials: 'same-origin',
        ...opciones,
        headers: {
            Accept: 'application/json',
            ...(opciones.headers || {})
        }
    };

    if (configuracion.body !== undefined && configuracion.body !== null
        && typeof configuracion.body !== 'string' && !(configuracion.body instanceof FormData)) {
        configuracion.headers['Content-Type'] = 'application/json';
        configuracion.body = JSON.stringify(configuracion.body);
    }

    let respuesta;

    try {
        respuesta = await fetch(ruta, configuracion);
    } catch {
        const error = new Error('No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
        error.estado = 0;
        error.datos = null;
        throw error;
    }

    const tipo = respuesta.headers.get('content-type') || '';
    let datos = null;

    if (respuesta.status !== 204) {
        if (tipo.includes('application/json')) {
            datos = await respuesta.json().catch(() => ({}));
        } else {
            datos = await respuesta.text().catch(() => '');
        }
    }

    if (!respuesta.ok) {
        const error = new Error(
            datos && typeof datos === 'object' && datos.error
                ? datos.error
                : 'No se pudo completar la solicitud.'
        );

        error.estado = respuesta.status;
        error.datos = datos;
        throw error;
    }

    return datos;
}

function mensajeDeError(error, respaldo = 'Ocurrió un error inesperado.') {
    if (error && typeof error.message === 'string' && error.message) return error.message;
    return respaldo;
}
