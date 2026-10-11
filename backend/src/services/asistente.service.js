'use strict';
/* ==========================================================
   SERVICIO: ASISTENTE
   ------------------------------------------------------------
   El orquestador. Junta las piezas: contexto del visitante
   (tracking), catalogo, memoria de FAQ y el cliente de DeepSeek.

   Flujo de un mensaje:
     1. Se resume el interes del visitante y se lee el catalogo.
     2. Si hay una FAQ guardada parecida, se intenta reutilizar
        (verificada por el modelo) antes de gastar una respuesta
        nueva.
     3. Si no, se llama a DeepSeek pidiendo JSON y se valida la
        salida: las recomendaciones se filtran contra el catalogo
        real, nunca se confia en ids inventados.
     4. La respuesta nueva se guarda como FAQ marcada para
        revisar.
     5. Si no hay key o el modelo falla, se degrada a una
        respuesta local con los datos del negocio. El endpoint
        nunca queda mudo por culpa de la IA.
   ========================================================== */

const config = require('../config/env');
const log = require('../utils/log');
const { NEGOCIO } = require('../config/business');
const { systemPrompt, resumenCatalogo } = require('../config/prompt');
const deepseek = require('./deepseek.service');
const faq = require('./faq.service');
const { registrar: registrarEvento, resumirIntereses } = require('./tracking.service');
const { porIntereses, desdeIds } = require('./recomendacion.service');
const { productosConStock } = require('./catalogo.service');
const { limpiarTexto } = require('../utils/texto');

/* ----------------------- contexto ----------------------- */

function ultimosTurnos(historial, maximo) {
    if (!Array.isArray(historial)) return [];

    const limpios = historial
        .filter(t => t && typeof t.texto === 'string' && t.texto.trim())
        .map(t => ({
            rol: t.rol === 'bot' || t.rol === 'assistant' ? 'assistant' : 'user',
            texto: limpiarTexto(t.texto, 600),
        }))
        .filter(t => t.texto);

    return limpios.slice(-Math.max(0, maximo));
}

function bloqueContexto(intereses, carrito, rutaActual) {
    const lineas = [];

    if (rutaActual) lineas.push(`Pagina actual: ${limpiarTexto(rutaActual, 200)}`);

    if (intereses.categorias && intereses.categorias.length) {
        lineas.push(`Categorias que estuvo mirando: ${intereses.categorias.join(', ')}.`);
    }

    if (intereses.productos && intereses.productos.length) {
        lineas.push(`Ids de productos que miro: ${intereses.productos.join(', ')}.`);
    }

    if (Array.isArray(carrito) && carrito.length) {
        const resumen = carrito
            .slice(0, 20)
            .map(i => `${limpiarTexto(i.nombre, 80)} x${Number(i.cantidad) || 1}`)
            .join(', ');

        lineas.push(`Carrito actual: ${resumen}.`);
    }

    if (!lineas.length) return '';

    return `\n\nCONTEXTO DE ESTA CONVERSACION:\n- ${lineas.join('\n- ')}`;
}

function construirMensajes(mensaje, historial, intereses, carrito, rutaActual, resumen) {
    const sistema = systemPrompt(resumen)
        + bloqueContexto(intereses, carrito, rutaActual);

    const mensajes = [{ role: 'system', content: sistema }];

    for (const turno of ultimosTurnos(historial, config.deepseek.historial)) {
        mensajes.push({ role: turno.rol, content: turno.texto });
    }

    mensajes.push({ role: 'user', content: mensaje });

    return mensajes;
}

/* ----------------------- parseo ----------------------- */

function parsearRespuesta(contenido, mensaje) {
    let datos = null;

    try {
        datos = JSON.parse(contenido);
    } catch {
        const inicio = contenido.indexOf('{');
        const fin = contenido.lastIndexOf('}');

        if (inicio !== -1 && fin > inicio) {
            try {
                datos = JSON.parse(contenido.slice(inicio, fin + 1));
            } catch {
                datos = null;
            }
        }
    }

    /* Si el modelo no devolvio JSON, al menos no se pierde el
       texto: se usa como respuesta y se sigue. */
    if (!datos || typeof datos !== 'object') {
        return {
            respuesta: limpiarTexto(contenido, 4000) || `No pude armar una respuesta sobre "${limpiarTexto(mensaje, 80)}".`,
            intencion: 'otro',
            productos: [],
            derivarHumano: false,
        };
    }

    return {
        respuesta: limpiarTexto(datos.respuesta, 4000) || 'No pude armar una respuesta.',
        intencion: limpiarTexto(datos.intencion, 40) || 'otro',
        productos: Array.isArray(datos.productos) ? datos.productos : [],
        derivarHumano: Boolean(datos.derivarHumano),
    };
}

/* ----------------------- verificacion de FAQ ----------------------- */

/* Revisa si una respuesta guardada contesta la pregunta nueva. En
   modo degradado no hay a quien preguntar: se confia en el umbral
   lexico. Con IA, se pide un veredicto corto (barato). */
async function verificarCandidata(mensaje, guardada, senal) {
    if (!deepseek.estaConfigurado()) return true;

    try {
        const resultado = await deepseek.chat({
            temperatura: 0,
            maxTokens: 16,
            json: true,
            senal,
            mensajes: [
                {
                    role: 'system',
                    content:
                        'Sos un clasificador. Responde solo con json ' +
                        '{"responde": true} si la respuesta guardada contesta ' +
                        'la pregunta nueva, o {"responde": false} si no.',
                },
                {
                    role: 'user',
                    content:
                        `Pregunta nueva: ${mensaje}\n` +
                        `Pregunta guardada: ${guardada.pregunta}\n` +
                        `Respuesta guardada: ${guardada.respuesta}`,
                },
            ],
        });

        return /"responde"\s*:\s*true/.test(resultado.contenido);
    } catch (error) {
        log.warn('asistente: no se pudo verificar la FAQ', {
            codigo: error.codigo || 'desconocido',
        });

        return false;
    }
}

/* ----------------------- respuesta local (degradado) ----------------------- */

const GRUPOS_LOCALES = [
    {
        claves: ['humano', 'persona', 'asesor', 'whatsapp', 'telefono', 'llamar', 'reclamo'],
        texto: () =>
            `¡Dale! Te paso con el equipo por <strong>WhatsApp</strong> al ` +
            `${NEGOCIO.contacto.whatsapp} y te contestamos enseguida.`,
        derivar: true,
    },
    {
        claves: ['horario', 'abren', 'cierran', 'atencion', 'dias'],
        texto: () => `Nuestro horario es: ${NEGOCIO.horario}`,
    },
    {
        claves: ['envio', 'enviar', 'delivery', 'entrega', 'llega', 'domicilio'],
        texto: () =>
            `${NEGOCIO.envios.resumen} Envio gratis desde ` +
            `$${NEGOCIO.envios.gratisDesde}.`,
    },
    {
        claves: ['pago', 'pagar', 'tarjeta', 'transferencia', 'efectivo', 'factura'],
        texto: () =>
            `Aceptamos ${NEGOCIO.pagos.join(', ').toLowerCase()}. ` + NEGOCIO.factura,
    },
    {
        claves: ['club', 'punto', 'puntos', 'fidelidad', 'beneficio'],
        texto: () => `¡${NEGOCIO.club.nombre}! ${NEGOCIO.club.reglas}`,
    },
    {
        claves: ['promo', 'oferta', 'descuento', 'rebaja', 'codigo'],
        texto: () => NEGOCIO.promociones
            .map(p => `<strong>${p.titulo}</strong>: ${p.detalle}`)
            .join('<br><br>'),
    },
    {
        claves: ['cuidado', 'regar', 'riego', 'luz', 'sol', 'sustrato', 'plaga'],
        texto: () => NEGOCIO.cuidados,
    },
    {
        claves: ['servicio', 'asesoria', 'jardin', 'huerta', 'diseno', 'mantenimiento'],
        texto: () => `Ofrecemos: ${NEGOCIO.servicios.join(', ')}.`,
    },
    {
        claves: ['gracias', 'genial', 'perfecto', 'joya'],
        texto: () =>
            `¡De nada! Si necesitas algo mas, escribime por aca o por ` +
            `WhatsApp al ${NEGOCIO.contacto.whatsapp}.`,
    },
];

function respuestaLocal(mensaje) {
    const limpio = faq.normalizar(mensaje);

    for (const grupo of GRUPOS_LOCALES) {
        if (grupo.claves.some(clave => limpio.includes(clave))) {
            return { respuesta: grupo.texto(), derivarHumano: Boolean(grupo.derivar) };
        }
    }

    return {
        respuesta:
            'Te ayudo con gusto. Puedo contarte sobre ' +
            '<strong>envios, pagos, cuidados, servicios, promociones y el ' +
            `Club ${NEGOCIO.nombre}</strong>, o recomendarte una planta segun ` +
            `tu espacio. Si preferis, escribinos por WhatsApp al ` +
            `${NEGOCIO.contacto.whatsapp}.`,
        derivarHumano: false,
    };
}

/* ----------------------- armado final ----------------------- */

function armar({ respuesta, intencion = 'otro', recomendaciones = [], derivarHumano = false, fuente, uso = null, modelo = null }) {
    return {
        respuesta,
        intencion,
        recomendaciones,
        derivarHumano,
        contacto: NEGOCIO.contacto,
        fuente,
        uso,
        modelo,
    };
}

async function degradado(mensaje, intereses) {
    const local = respuestaLocal(mensaje);
    const recomendaciones = await porIntereses(intereses, { limite: 3 });

    return armar({
        respuesta: local.respuesta,
        intencion: 'otro',
        recomendaciones,
        derivarHumano: local.derivarHumano,
        fuente: 'degradado',
    });
}

/* ----------------------- API ----------------------- */

async function responder({ sesion, mensaje, historial = [], carrito = [], rutaActual = '', senal } = {}) {
    const intereses = await resumirIntereses(sesion);
    const catalogo = await productosConStock();
    const resumen = catalogo.map(p => ({ id: p.id, nombre: p.nombre, categoria: p.categoria }));

    /* 1. Memoria: reutilizar una respuesta ya guardada. */
    const tokens = faq.tokenizar(mensaje);

    if (tokens.length) {
        const candidata = await faq.mejorCandidata(tokens);

        if (candidata && await verificarCandidata(mensaje, candidata.faq, senal)) {
            await faq.registrarUso(candidata.faq.clave);

            return armar({
                respuesta: candidata.faq.respuesta,
                intencion: candidata.faq.intencion,
                recomendaciones: await porIntereses(intereses, { limite: 3 }),
                fuente: 'faq',
            });
        }
    }

    /* 2. Sin IA configurada: respuesta local. */
    if (!deepseek.estaConfigurado()) {
        return degradado(mensaje, intereses);
    }

    /* 3. Respuesta nueva del modelo. */
    try {
        const resultado = await deepseek.chat({
            mensajes: construirMensajes(mensaje, historial, intereses, carrito, rutaActual, resumen),
            json: true,
            senal,
        });

        const salida = parsearRespuesta(resultado.contenido, mensaje);
        let recomendaciones = await desdeIds(salida.productos, { limite: 3 });

        if (!recomendaciones.length) {
            recomendaciones = await porIntereses(intereses, { limite: 3 });
        }

        await faq.guardar({
            pregunta: mensaje,
            respuesta: salida.respuesta,
            intencion: salida.intencion,
        });

        return armar({
            respuesta: salida.respuesta,
            intencion: salida.intencion,
            recomendaciones,
            derivarHumano: salida.derivarHumano,
            fuente: 'modelo',
            uso: resultado.uso,
            modelo: resultado.modelo,
        });
    } catch (error) {
        log.warn('asistente: se degrada por error de IA', {
            codigo: error.codigo || 'desconocido',
            estado: error.estado || 0,
        });

        return degradado(mensaje, intereses);
    }
}

/* Lo que el front necesita para pintar el widget: identidad,
   contacto, promociones y si la IA esta activa. */
function configPublica() {
    return {
        negocio: {
            nombre: NEGOCIO.nombre,
            asistente: NEGOCIO.asistente,
            contacto: NEGOCIO.contacto,
        },
        promociones: NEGOCIO.promociones,
        ia: deepseek.estado(),
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
    parsearRespuesta,
    resumenCatalogo,
};
