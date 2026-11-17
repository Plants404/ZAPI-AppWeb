'use strict';

/* Error con código HTTP para responder desde las rutas. */

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

module.exports = { HttpError };
