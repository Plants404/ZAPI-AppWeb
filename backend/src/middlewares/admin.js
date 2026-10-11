'use strict';
/* ==========================================================
   ADMIN: TOKEN DE ESCRITURA DE STOCK
   ------------------------------------------------------------
   PUT /api/stock/:id es la unica ruta donde el servidor acepta un
   id elegido por el cliente, y a proposito: es la forma de cargar
   el stock sin montar todavia un panel de administracion. Por eso
   pide un token: si quedara abierta, cualquiera que se sepa la
   URL podria vaciar el inventario.

   El token viaja en la cabecera x-zapi-token y se compara por el
   hash SHA-256 de las dos cadenas: timingSafeEqual sobre los
   hashes no adelanta los largos ni el contenido. Si el servidor
   no tiene ZAPI_ADMIN_TOKEN configurado, la ruta responde 503
   antes que abrirse.
   ========================================================== */

const crypto = require('crypto');

const config = require('../config/env');

function hash(valor) {
    return crypto.createHash('sha256').update(valor).digest();
}

function exigirAdmin(req, res, next) {
    const esperado = config.adminToken;

    if (!esperado) {
        return res.status(503).json({
            error: 'Token de administración no configurado en el servidor',
        });
    }

    const provisto = req.get('x-zapi-token') || '';

    if (!crypto.timingSafeEqual(hash(provisto), hash(esperado))) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    next();
}

module.exports = { exigirAdmin };