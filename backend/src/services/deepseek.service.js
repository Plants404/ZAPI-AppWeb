'use strict';
/* ==========================================================
   CLIENTE: DEEPSEEK
   ------------------------------------------------------------
   Un cliente minimo sobre fetch (Node ya trae fetch global, no
   hace falta el SDK) contra la API compatible OpenAI de DeepSeek:
   base https://api.deepseek.com, POST /chat/completions y
   GET /models, con Authorization: Bearer.

   Por que fetch y no el SDK: controla el timeout y el reintento
   sin depender de la version de una libreria, y no agrega una
   dependencia nueva a un proyecto que hasta ahora solo tiene
   express, mongoose y helmet.

   Lo que hace este modulo, ademas de mandar el cuerpo:
     - timeout por peticion con AbortController,
     - reintentos con backoff exponencial y jitter para 429 y 5xx,
       respetando Retry-After,
     - errores tipados (ErrorIA) para que la capa de arriba pueda
       decidir entre degradar y fallar,
     - nunca loguea la API key ni el cuerpo del cliente.
   ========================================================== */

const config = require('../config/env');
const log = require('../utils/log');

/* Codigos: sin_config (no hay key), red (no se llego), timeout,
   limite (429), servidor (5xx), respuesta (cuerpo ilegible). */
class ErrorIA extends Error {
    constructor(codigo, mensaje, estado) {
        super(mensaje);
        this.name = 'ErrorIA';
        this.codigo = codigo;
        this.estado = estado || 0;
    }
}

function estaConfigurado() {
    return config.deepseek.configurado;
}

/* Estado publicable: nunca incluye la key. */
function estado() {
    return {
        configurado: config.deepseek.configurado,
        modelo: config.deepseek.modelo,
        baseUrl: config.deepseek.baseUrl,
    };
}

function backoffMs(intento) {
    const base = 400;
    const exponencial = base * 2 ** intento;
    const jitter = Math.random() * base;

    return Math.min(8000, exponencial + jitter);
}

function retryAfterMs(respuesta, intento) {
    const crudo = Number(respuesta.headers.get('retry-after'));

    if (Number.isFinite(crudo) && crudo > 0) {
        return Math.min(10000, crudo * 1000);
    }

    return backoffMs(intento);
}

/* Pausa que se corta si el cliente cancela, para no colgar un
   reintento cuando ya nadie espera la respuesta. */
function pausa(ms, senal) {
    return new Promise(resolve => {
        const reloj = setTimeout(resolve, ms);

        if (senal) {
            if (senal.aborted) {
                clearTimeout(reloj);

                return resolve();
            }

            senal.addEventListener('abort', () => {
                clearTimeout(reloj);
                resolve();
            }, { once: true });
        }
    });
}

async function unaVez(url, opciones, senal) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), config.deepseek.tiempoEspera);
    const combinada = senal
        ? AbortSignal.any([control.signal, senal])
        : control.signal;

    let respuesta;

    try {
        respuesta = await fetch(url, { ...opciones, signal: combinada });
    } catch (error) {
        if (senal && senal.aborted) {
            throw new ErrorIA('red', 'peticion cancelada por el cliente');
        }

        if (control.signal.aborted) {
            throw new ErrorIA('timeout', 'DeepSeek no respondio a tiempo');
        }

        throw new ErrorIA('red', 'no se pudo contactar a DeepSeek');
    } finally {
        clearTimeout(reloj);
    }

    if (respuesta.status === 429) {
        const error = new ErrorIA('limite', 'DeepSeek: demasiadas peticiones', 429);

        error.esperaMs = retryAfterMs(respuesta, 0);

        throw error;
    }

    if (!respuesta.ok) {
        throw new ErrorIA(
            respuesta.status >= 500 ? 'servidor' : 'respuesta',
            `DeepSeek respondio ${respuesta.status}`,
            respuesta.status
        );
    }

    try {
        return await respuesta.json();
    } catch {
        throw new ErrorIA('respuesta', 'DeepSeek devolvio un cuerpo ilegible', respuesta.status);
    }
}

async function peticion(ruta, { metodo = 'POST', cuerpo, senal } = {}) {
    if (!config.deepseek.configurado) {
        throw new ErrorIA('sin_config', 'Falta DEEPSEEK_API_KEY');
    }

    if (senal && senal.aborted) {
        throw new ErrorIA('red', 'peticion cancelada por el cliente');
    }

    const url = config.deepseek.baseUrl + ruta;
    const total = config.deepseek.reintentos + 1;
    let ultimo = null;

    for (let intento = 0; intento < total; intento++) {
        try {
            return await unaVez(url, {
                method: metodo,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.deepseek.key}`,
                },
                body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
            }, senal);
        } catch (error) {
            ultimo = error;

            const reintentable = ['red', 'timeout', 'limite', 'servidor']
                .includes(error.codigo);

            if (!reintentable || intento === total - 1) throw error;

            log.warn('deepseek: reintento', {
                intento: intento + 1,
                codigo: error.codigo,
            });

            await pausa(error.esperaMs || backoffMs(intento), senal);
        }
    }

    throw ultimo;
}

/* Llamada de chat. Devuelve el contenido de texto y metadatos; el
   parseo del JSON de negocio lo hace asistente.service.js, no aca,
   para que este modulo siga siendo solo el transporte. */
async function chat({
    mensajes,
    modelo,
    temperatura = 0.6,
    maxTokens,
    json = false,
    senal,
} = {}) {
    const cuerpo = {
        model: modelo || config.deepseek.modelo,
        messages: mensajes,
        temperature: temperatura,
        max_tokens: maxTokens || config.deepseek.maxTokens,
        stream: false,
    };

    if (json) cuerpo.response_format = { type: 'json_object' };

    const datos = await peticion('/chat/completions', { cuerpo, senal });
    const opcion = datos && Array.isArray(datos.choices) ? datos.choices[0] : null;
    const contenido = opcion && opcion.message ? opcion.message.content : '';

    if (typeof contenido !== 'string' || !contenido.trim()) {
        throw new ErrorIA('respuesta', 'DeepSeek no devolvio contenido');
    }

    return {
        contenido,
        modelo: datos.model || cuerpo.model,
        uso: datos.usage || null,
        motivoFin: opcion ? opcion.finish_reason : null,
    };
}

/* Lista de modelos disponibles (GET /models). Util para
   diagnostico: confirma que la key funciona sin gastar tokens. */
async function modelos(senal) {
    const datos = await peticion('/models', { metodo: 'GET', senal });

    return Array.isArray(datos && datos.data)
        ? datos.data.map(m => m.id)
        : [];
}

module.exports = { ErrorIA, chat, modelos, estaConfigurado, estado };
