'use strict';

const TIMEOUT_MS = 1500;

function catalogoValido(catalogo) {
    const slugs = new Set();
    for (const producto of catalogo) {
        if (!producto
            || !Number.isSafeInteger(producto.id)
            || typeof producto.slug !== 'string'
            || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(producto.slug)
            || slugs.has(producto.slug)
            || typeof producto.nombre !== 'string'
            || typeof producto.categoria !== 'string'
            || typeof producto.imagen !== 'string'
            || !Array.isArray(producto.imagenes)
            || typeof producto.descripcion !== 'string'
            || !Number.isFinite(producto.precioBase)
            || !Number.isFinite(producto.stock)
            || !Array.isArray(producto.infoDeVenta)) return false;
        slugs.add(producto.slug);
    }
    return true;
}

async function obtenerPublicacion({ revisar = false, entorno = process.env, fetchImpl = globalThis.fetch, advertir = console.warn } = {}) {
    const apiUrl = entorno.ZAPI_API_URL;
    if (revisar || !apiUrl) return null;

    try {
        const base = apiUrl.replace(/\/+$/, '');
        const url = new URL(base);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('ZAPI_API_URL debe usar HTTP o HTTPS.');

        const respuesta = await fetchImpl(base + '/api/publicado', {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);

        const publicacion = await respuesta.json();
        if (!publicacion || !Array.isArray(publicacion.catalogo) || !catalogoValido(publicacion.catalogo)) {
            throw new Error('respuesta sin catálogo publicado');
        }
        return publicacion;
    } catch (error) {
        const esTimeout = error && error.name === 'TimeoutError';
        const mensaje = error instanceof Error ? error.message : '';
        const detalle = esTimeout
            ? 'se agotó el tiempo de espera'
            : /^HTTP \d+$/.test(mensaje)
                ? 'la API respondió ' + mensaje
                : 'la URL o respuesta de la API no es válida o no está disponible';
        advertir('No se pudo leer ZAPI_API_URL: ' + detalle + '. Se usarán los datos locales.');
        return null;
    }
}

module.exports = { obtenerPublicacion };
