'use strict';
/* ==========================================================
   SERVICIO: ASISTENTE
   ------------------------------------------------------------
   El orquestador del asistente. Responde por reglas: no hay
   modelo generativo de por medio. Junta las piezas: contexto del
   visitante (tracking), catalogo y memoria de FAQ.

   Flujo de un mensaje:
     1. Se resume el interes del visitante.
     2. Si hay una FAQ guardada parecida (parecido lexico), se
        reutiliza sin armar una respuesta nueva.
     3. Si no, se contesta por reglas con los datos del negocio y
        se guarda como FAQ para la proxima.
     4. Siempre se devuelven recomendaciones armadas con el catalogo
        real y los intereses, nunca con ids inventados.
   ========================================================== */

const { NEGOCIO } = require('../config/business');
const faq = require('./faq.service');
const { registrar: registrarEvento, resumirIntereses } = require('./tracking.service');
const { porIntereses } = require('./recomendacion.service');

/* ----------------------- respuesta por reglas ----------------------- */

const GRUPOS_LOCALES = [
    {
        claves: ['humano', 'persona', 'asesor', 'whatsapp', 'telefono', 'llamar', 'reclamo'],
        intencion: 'humano',
        texto: () =>
            `¡Dale! Te paso con el equipo por <strong>WhatsApp</strong> al ` +
            `${NEGOCIO.contacto.whatsapp} y te contestamos enseguida.`,
        derivar: true,
    },
    {
        claves: ['horario', 'abren', 'cierran', 'atencion', 'dias'],
        intencion: 'horario',
        texto: () => `Nuestro horario es: ${NEGOCIO.horario}`,
    },
    {
        claves: ['envio', 'enviar', 'delivery', 'entrega', 'llega', 'domicilio'],
        intencion: 'envio',
        texto: () =>
            `${NEGOCIO.envios.resumen} Envio gratis desde ` +
            `$${NEGOCIO.envios.gratisDesde}.`,
    },
    {
        claves: ['pago', 'pagar', 'tarjeta', 'transferencia', 'efectivo', 'factura'],
        intencion: 'pago',
        texto: () =>
            `Aceptamos ${NEGOCIO.pagos.join(', ').toLowerCase()}. ` + NEGOCIO.factura,
    },
    {
        claves: ['club', 'punto', 'puntos', 'fidelidad', 'beneficio'],
        intencion: 'club',
        texto: () => `¡${NEGOCIO.club.nombre}! ${NEGOCIO.club.reglas}`,
    },
    {
        claves: ['promo', 'oferta', 'descuento', 'rebaja', 'codigo'],
        intencion: 'promo',
        texto: () => NEGOCIO.promociones
            .map(p => `<strong>${p.titulo}</strong>: ${p.detalle}`)
            .join('<br><br>'),
    },
    {
        claves: ['cuidado', 'regar', 'riego', 'luz', 'sol', 'sustrato', 'plaga'],
        intencion: 'cuidado',
        texto: () => NEGOCIO.cuidados,
    },
    {
        claves: ['servicio', 'asesoria', 'jardin', 'huerta', 'diseno', 'mantenimiento'],
        intencion: 'servicio',
        texto: () => `Ofrecemos: ${NEGOCIO.servicios.join(', ')}.`,
    },
    {
        claves: ['gracias', 'genial', 'perfecto', 'joya'],
        intencion: 'otro',
        texto: () =>
            `¡De nada! Si necesitas algo mas, escribime por aca o por ` +
            `WhatsApp al ${NEGOCIO.contacto.whatsapp}.`,
    },
];

function respuestaLocal(mensaje) {
    const limpio = faq.normalizar(mensaje);

    for (const grupo of GRUPOS_LOCALES) {
        if (grupo.claves.some(clave => limpio.includes(clave))) {
            return {
                respuesta: grupo.texto(),
                intencion: grupo.intencion,
                derivarHumano: Boolean(grupo.derivar),
            };
        }
    }

    return {
        respuesta:
            'Te ayudo con gusto. Puedo contarte sobre ' +
            '<strong>envios, pagos, cuidados, servicios, promociones y el ' +
            `Club ${NEGOCIO.nombre}</strong>, o recomendarte una planta segun ` +
            `tu espacio. Si preferis, escribinos por WhatsApp al ` +
            `${NEGOCIO.contacto.whatsapp}.`,
        intencion: 'otro',
        derivarHumano: false,
    };
}

/* ----------------------- armado final ----------------------- */

function armar({ respuesta, intencion = 'otro', recomendaciones = [], derivarHumano = false, fuente }) {
    return {
        respuesta,
        intencion,
        recomendaciones,
        derivarHumano,
        contacto: NEGOCIO.contacto,
        fuente,
    };
}

/* ----------------------- API ----------------------- */

async function responder({ sesion, mensaje } = {}) {
    const intereses = await resumirIntereses(sesion);

    /* 1. Memoria: reutilizar una respuesta ya guardada. */
    const tokens = faq.tokenizar(mensaje);

    if (tokens.length) {
        const candidata = await faq.mejorCandidata(tokens);

        if (candidata) {
            await faq.registrarUso(candidata.faq.clave);

            return armar({
                respuesta: candidata.faq.respuesta,
                intencion: candidata.faq.intencion,
                recomendaciones: await porIntereses(intereses, { limite: 3 }),
                fuente: 'faq',
            });
        }
    }

    /* 2. Respuesta por reglas, guardada para la proxima. */
    const local = respuestaLocal(mensaje);

    await faq.guardar({
        pregunta: mensaje,
        respuesta: local.respuesta,
        intencion: local.intencion,
    });

    return armar({
        respuesta: local.respuesta,
        intencion: local.intencion,
        recomendaciones: await porIntereses(intereses, { limite: 3 }),
        derivarHumano: local.derivarHumano,
        fuente: 'reglas',
    });
}

/* Lo que el front necesita para pintar el widget: identidad,
   contacto, promociones y el motor del asistente. */
function configPublica() {
    return {
        negocio: {
            nombre: NEGOCIO.nombre,
            asistente: NEGOCIO.asistente,
            contacto: NEGOCIO.contacto,
        },
        promociones: NEGOCIO.promociones,
        asistente: { motor: 'reglas' },
    };
}

async function registrarActividad({ sesion, tipo, productoId, categoria, pagina, detalle }) {
    return registrarEvento({ sesion, tipo, productoId, categoria, pagina, detalle });
}

module.exports = {
    responder,
    configPublica,
    registrarActividad,
    respuestaLocal,
};
