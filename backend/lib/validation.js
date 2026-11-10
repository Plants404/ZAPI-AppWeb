'use strict';

const { HttpError } = require('./http-error.js');

function objeto(datos) {
    return datos !== null && typeof datos === 'object' && !Array.isArray(datos);
}

function texto(valor, campo, maximo, obligatorio = true) {
    if (typeof valor !== 'string') {
        if (!obligatorio && (valor === undefined || valor === null)) return '';
        throw new HttpError(400, `El campo ${campo} no es válido.`);
    }

    const limpio = valor.trim();
    if ((!limpio && obligatorio) || limpio.length > maximo) {
        throw new HttpError(400, `El campo ${campo} no es válido.`);
    }

    return limpio;
}

function validarEmail(valor) {
    return valor.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function validarContacto(datos) {
    if (!objeto(datos)) throw new HttpError(400, 'El cuerpo de la consulta no es válido.');

    const contacto = {
        nombre: texto(datos.nombre, 'nombre', 120),
        email: texto(datos.email, 'email', 160),
        asunto: texto(datos.asunto, 'asunto', 160),
        telefono: texto(datos.telefono, 'telefono', 40, false),
        mensaje: texto(datos.mensaje, 'mensaje', 2000)
    };

    if (contacto.nombre.length < 2 || contacto.asunto.length < 3 || contacto.mensaje.length < 10) {
        throw new HttpError(400, 'Revisá el nombre, el asunto y el mensaje.');
    }
    if (!validarEmail(contacto.email)) throw new HttpError(400, 'El correo electrónico no es válido.');
    if (contacto.telefono && !/^[+\d\s().-]{6,40}$/.test(contacto.telefono)) {
        throw new HttpError(400, 'El teléfono no es válido.');
    }

    return contacto;
}

function validarTestimonio(datos) {
    if (!objeto(datos)) throw new HttpError(400, 'El cuerpo del testimonio no es válido.');

    const testimonio = {
        autor: texto(datos.autor, 'autor', 120),
        lugar: texto(datos.lugar, 'lugar', 120, false),
        texto: texto(datos.texto, 'texto', 600),
        estrellas: datos.estrellas,
        productoId: datos.productoId === undefined || datos.productoId === null
            ? null
            : datos.productoId
    };

    if (testimonio.autor.length < 2 || testimonio.texto.length < 10) {
        throw new HttpError(400, 'Revisá el autor y el texto del testimonio.');
    }
    if (!Number.isInteger(testimonio.estrellas) || testimonio.estrellas < 1 || testimonio.estrellas > 5) {
        throw new HttpError(400, 'La puntuación debe ser un número entero entre 1 y 5.');
    }
    if (testimonio.productoId !== null
        && (!Number.isSafeInteger(testimonio.productoId) || testimonio.productoId < 1)) {
        throw new HttpError(400, 'El producto indicado no es válido.');
    }

    return testimonio;
}

function validarPedido(datos) {
    if (!objeto(datos) || !objeto(datos.cliente) || !Array.isArray(datos.lineas)
        || datos.lineas.length === 0 || datos.lineas.length > 30) {
        throw new HttpError(400, 'El pedido no es válido.');
    }

    const cliente = {
        nombre: texto(datos.cliente.nombre, 'cliente.nombre', 120),
        telefono: texto(datos.cliente.telefono, 'cliente.telefono', 40),
        email: texto(datos.cliente.email, 'cliente.email', 160, false),
        zona: texto(datos.cliente.zona, 'cliente.zona', 120, false),
        notas: texto(datos.cliente.notas, 'cliente.notas', 500, false)
    };

    if (cliente.nombre.length < 2 || !/^[+\d\s().-]{6,40}$/.test(cliente.telefono)) {
        throw new HttpError(400, 'Revisá el nombre y el teléfono del pedido.');
    }
    if (cliente.email && !validarEmail(cliente.email)) {
        throw new HttpError(400, 'El correo electrónico del pedido no es válido.');
    }

    const cantidades = new Map();
    for (const linea of datos.lineas) {
        if (!objeto(linea) || !Number.isSafeInteger(linea.id) || linea.id < 1
            || !Number.isSafeInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > 99) {
            throw new HttpError(400, 'Una línea del pedido no es válida.');
        }
        cantidades.set(linea.id, (cantidades.get(linea.id) || 0) + linea.cantidad);
    }

    return { cliente, cantidades };
}

module.exports = { validarContacto, validarPedido, validarTestimonio };
