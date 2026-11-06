'use strict';

class ErrorHttp extends Error {
    constructor(estado, mensaje, campo) {
        super(mensaje);
        this.name = 'ErrorHttp';
        this.estado = estado;
        this.campo = campo;
    }
}

module.exports = { ErrorHttp };
