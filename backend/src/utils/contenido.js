'use strict';

const { CONTENIDO_POR_DEFECTO, SECCIONES } = require('../data/contenido');
const { ErrorHttp } = require('./ErrorHttp');
const { texto } = require('./validacion');

const LIMITES = {
    corto: 120,
    medio: 300,
    largo: 1200,
    parrafo: 2000,
};

function textoPlano(valor, campo, maximo = LIMITES.medio, obligatorio = false) {
    if (valor === undefined || valor === null) {
        if (obligatorio) throw new ErrorHttp(400, 'Este campo es obligatorio.', campo);
        return '';
    }

    if (typeof valor !== 'string') {
        throw new ErrorHttp(400, 'Este campo debe ser texto.', campo);
    }

    const limpio = texto(valor);

    if (!limpio && obligatorio) throw new ErrorHttp(400, 'Este campo es obligatorio.', campo);
    if (limpio.length > maximo) throw new ErrorHttp(400, `Este campo no puede superar ${maximo} caracteres.`, campo);
    if (/[<>]/.test(limpio)) throw new ErrorHttp(400, 'Este campo no admite HTML.', campo);

    return limpio;
}

function booleano(valor, campo) {
    if (typeof valor !== 'boolean') throw new ErrorHttp(400, 'Este campo debe ser verdadero o falso.', campo);
    return valor;
}

function lista(valor, campo, { minimo = 1, maximo = 12, campos }) {
    if (!Array.isArray(valor) || valor.length < minimo || valor.length > maximo) {
        throw new ErrorHttp(400, `La lista debe tener entre ${minimo} y ${maximo} elementos.`, campo);
    }

    return valor.map((elemento, indice) => {
        if (!elemento || typeof elemento !== 'object' || Array.isArray(elemento)) {
            throw new ErrorHttp(400, 'Cada elemento de la lista es inválido.', `${campo}[${indice}]`);
        }

        const salida = {};

        for (const [nombre, opciones] of Object.entries(campos)) {
            salida[nombre] = opciones.tipo === 'booleano'
                ? booleano(elemento[nombre], `${campo}[${indice}].${nombre}`)
                : textoPlano(
                    elemento[nombre],
                    `${campo}[${indice}].${nombre}`,
                    opciones.maximo || LIMITES.medio,
                    opciones.obligatorio !== false
                );
        }

        return salida;
    });
}

const VALIDADORES = {
    negocio(valor) {
        return {
            nombre: textoPlano(valor.nombre, 'nombre', LIMITES.corto, true),
            descripcion: textoPlano(valor.descripcion, 'descripcion', LIMITES.medio, true),
            whatsapp: textoPlano(valor.whatsapp, 'whatsapp', LIMITES.corto, true).replace(/\D/g, ''),
            whatsappVisible: textoPlano(valor.whatsappVisible, 'whatsappVisible', LIMITES.corto, true),
            email: textoPlano(valor.email, 'email', 254, true),
            direccion: textoPlano(valor.direccion, 'direccion', LIMITES.medio, true),
            horario: textoPlano(valor.horario, 'horario', LIMITES.medio, true),
            sitio: textoPlano(valor.sitio, 'sitio', 254, true),
        };
    },
    portada(valor) {
        const beneficios = valor.beneficios;

        if (!Array.isArray(beneficios) || beneficios.length !== 3) {
            throw new ErrorHttp(400, 'La portada debe tener exactamente tres beneficios.', 'beneficios');
        }

        return {
            etiqueta: textoPlano(valor.etiqueta, 'etiqueta', LIMITES.corto, true),
            titulo: textoPlano(valor.titulo, 'titulo', 200, true),
            subtitulo: textoPlano(valor.subtitulo, 'subtitulo', LIMITES.largo, true),
            imagen: textoPlano(valor.imagen, 'imagen', 500, true),
            sello: textoPlano(valor.sello, 'sello', LIMITES.corto, true),
            beneficios: beneficios.map((beneficio, indice) =>
                textoPlano(beneficio, `beneficios[${indice}]`, LIMITES.medio, true)
            ),
        };
    },
    servicios(valor) {
        return {
            etiqueta: textoPlano(valor.etiqueta, 'etiqueta', LIMITES.corto, true),
            titulo: textoPlano(valor.titulo, 'titulo', 200, true),
            descripcion: textoPlano(valor.descripcion, 'descripcion', LIMITES.largo, true),
            items: lista(valor.items, 'items', {
                minimo: 1,
                maximo: 12,
                campos: {
                    icono: { maximo: 60, obligatorio: true },
                    titulo: { maximo: 120, obligatorio: true },
                    texto: { maximo: 300, obligatorio: true },
                },
            }),
        };
    },
    nosotros(valor) {
        return {
            etiqueta: textoPlano(valor.etiqueta, 'etiqueta', LIMITES.corto, true),
            titulo: textoPlano(valor.titulo, 'titulo', 240, true),
            descripcion: textoPlano(valor.descripcion, 'descripcion', LIMITES.largo, true),
            problemaTitulo: textoPlano(valor.problemaTitulo, 'problemaTitulo', 200, true),
            problemaTexto: textoPlano(valor.problemaTexto, 'problemaTexto', LIMITES.parrafo, true),
            solucionTitulo: textoPlano(valor.solucionTitulo, 'solucionTitulo', 200, true),
            solucionTexto: textoPlano(valor.solucionTexto, 'solucionTexto', LIMITES.parrafo, true),
            pilares: lista(valor.pilares, 'pilares', {
                minimo: 1,
                maximo: 6,
                campos: {
                    titulo: { maximo: 120, obligatorio: true },
                    texto: { maximo: 300, obligatorio: true },
                },
            }),
            razones: lista(valor.razones, 'razones', {
                minimo: 1,
                maximo: 6,
                campos: {
                    titulo: { maximo: 120, obligatorio: true },
                    texto: { maximo: 300, obligatorio: true },
                },
            }),
            equipo: lista(valor.equipo, 'equipo', {
                minimo: 1,
                maximo: 10,
                campos: {
                    nombre: { maximo: 120, obligatorio: true },
                    rol: { maximo: 120, obligatorio: true },
                    texto: { maximo: 400, obligatorio: true },
                },
            }),
        };
    },
    contacto(valor) {
        return {
            etiqueta: textoPlano(valor.etiqueta, 'etiqueta', LIMITES.corto, true),
            titulo: textoPlano(valor.titulo, 'titulo', 240, true),
            descripcion: textoPlano(valor.descripcion, 'descripcion', LIMITES.largo, true),
            telefono: textoPlano(valor.telefono, 'telefono', LIMITES.corto, true),
            email: textoPlano(valor.email, 'email', 254, true),
            direccion: textoPlano(valor.direccion, 'direccion', LIMITES.medio, true),
            horario: textoPlano(valor.horario, 'horario', LIMITES.medio, true),
        };
    },
    promociones(valor) {
        return {
            activa: booleano(valor.activa, 'activa'),
            titulo: textoPlano(valor.titulo, 'titulo', 200),
            texto: textoPlano(valor.texto, 'texto', LIMITES.largo),
            enlace: textoPlano(valor.enlace, 'enlace', 500),
            textoEnlace: textoPlano(valor.textoEnlace, 'textoEnlace', LIMITES.corto),
        };
    },
};

function normalizarSeccion(clave, valor) {
    if (!SECCIONES.includes(clave)) throw new ErrorHttp(404, 'Sección de contenido no encontrada.');

    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
        throw new ErrorHttp(400, 'El contenido de la sección es inválido.');
    }

    return VALIDADORES[clave](valor);
}

function contenidoCompleto(seccionesGuardadas = []) {
    const salida = {};

    for (const clave of SECCIONES) {
        const guardada = seccionesGuardadas.find(seccion => seccion.clave === clave);
        salida[clave] = guardada ? normalizarSeccion(clave, guardada.valor) : CONTENIDO_POR_DEFECTO[clave];
    }

    return salida;
}

module.exports = {
    LIMITES,
    SECCIONES,
    contenidoCompleto,
    normalizarSeccion,
};
