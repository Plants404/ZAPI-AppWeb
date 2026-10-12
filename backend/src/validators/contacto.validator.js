'use strict';
/* ==========================================================
   VALIDADOR: CONTACTO
   ------------------------------------------------------------
   Las mismas reglas que public/js/contacto.js, a proposito: el
   navegador valida para dar una respuesta rapida y el servidor
   valida aparte porque es la unica validacion que no se puede
   esquivar (el formulario se puede mandar con curl). Si se
   cambian las reglas, hay que cambiar las dos.

   Cada error vuelve con el nombre del campo, que es lo que el
   front usa para marcar ese input y llevarle el foco. El nombre
   ("correo", "telefono"...) es el del atributo name del
   formulario, no el del id.
   ========================================================== */

const { CORREO, LARGO, MINIMOS } = require('../constants');
const { limpiarTexto, soloDigitos } = require('../utils/texto');

function validarContacto(cuerpo = {}) {
    const datos = {
        nombre: limpiarTexto(cuerpo.nombre, LARGO.nombre),
        correo: limpiarTexto(cuerpo.correo, LARGO.correo),
        asunto: limpiarTexto(cuerpo.asunto, LARGO.asunto),
        telefono: limpiarTexto(cuerpo.telefono, LARGO.telefono),
        consulta: limpiarTexto(cuerpo.consulta, LARGO.consulta),
    };

    if (datos.nombre.length < MINIMOS.nombre) {
        return { error: 'Escribí tu nombre', campo: 'nombre' };
    }

    if (!CORREO.test(datos.correo)) {
        return { error: 'Revisá el correo electrónico', campo: 'correo' };
    }

    if (datos.asunto.length < MINIMOS.asunto) {
        return { error: 'Escribí el asunto', campo: 'asunto' };
    }

    /* El telefono es opcional: si viene vacio no se revisa, y si
       viene algo se cuentan los digitos como siempre. */
    if (datos.telefono && soloDigitos(datos.telefono).length < MINIMOS.telefonoDigitos) {
        return { error: 'Revisá el teléfono de contacto', campo: 'telefono' };
    }

    if (datos.consulta.length < MINIMOS.consulta) {
        return {
            error: 'Contanos un poco más sobre tu consulta',
            campo: 'consulta',
        };
    }

    return { datos };
}

/* El campo trampa del formulario (sitio_web) tiene que llegar
   vacio. Va escondido para la persona y visible para un robot que
   completa todos los inputs. Se expone aparte para que el
   controlador pueda responder 201 sin guardar nada. */
function esTrampa(cuerpo = {}) {
    return limpiarTexto(cuerpo.sitio_web, LARGO.sitioWeb).length > 0;
}

module.exports = { validarContacto, esTrampa };
