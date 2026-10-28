'use strict';

/* Helper compartido para responder errores de validacion de campos. */
function fieldError(response, campo, error) {
    return response.status(400).json({ error, campo });
}

module.exports = { fieldError };