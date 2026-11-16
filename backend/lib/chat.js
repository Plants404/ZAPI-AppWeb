'use strict';

/* Chatbot con IA (Gemini). La clave de la API vive solo en el servidor
   (variable GEMINI_API_KEY): el navegador nunca la ve. */

const { HttpError } = require('./http-error.js');

/* Los alias "-latest" apuntan siempre al modelo vigente, asi que no se
   rompen cuando Google retira una version. Si el primero no existe (404),
   se prueba el siguiente. */
const MODELOS_POR_DEFECTO = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const MODELO_POR_DEFECTO = MODELOS_POR_DEFECTO[0];
const MAX_MENSAJES = 8;
const MAX_LARGO_MENSAJE = 500;
const MAX_PRODUCTOS_EN_PROMPT = 60;
const TIEMPO_MAXIMO_MS = 15000;

/* Valida lo que manda el navegador: una lista corta de mensajes
   { rol: 'user' | 'bot', texto }, donde el último es del visitante. */
function validarMensajes(cuerpo) {
    const lista = cuerpo && Array.isArray(cuerpo.mensajes) ? cuerpo.mensajes : null;
    if (!lista || lista.length === 0) throw new HttpError(400, 'Falta el mensaje.');

    const mensajes = lista.slice(-MAX_MENSAJES).map(item => {
        const texto = item && typeof item.texto === 'string' ? item.texto.trim() : '';
        const rol = item && item.rol === 'bot' ? 'bot' : 'user';
        if (!texto) throw new HttpError(400, 'Hay un mensaje vacío.');
        return { rol, texto: texto.slice(0, MAX_LARGO_MENSAJE) };
    });

    if (mensajes[mensajes.length - 1].rol !== 'user') {
        throw new HttpError(400, 'El último mensaje tiene que ser del visitante.');
    }

    /* Gemini exige que la conversación empiece con un mensaje del usuario. */
    while (mensajes.length && mensajes[0].rol !== 'user') mensajes.shift();

    return mensajes;
}

function lineaDeProducto(producto, formatear) {
    const stock = Number(producto.stock) > 0 ? `${producto.stock} en stock` : 'sin stock';
    return `- ${producto.nombre} (${producto.categoria || 'sin categoría'}): ${formatear(producto.precioBase)}, ${stock}`;
}

function precioUy(valor) {
    return `$ ${Number(valor || 0).toLocaleString('es-UY')}`;
}

/* El "prompt de sistema": le explica a la IA quién es y qué sabe. */
function armarInstrucciones(productos, negocio) {
    const catalogo = productos.slice(0, MAX_PRODUCTOS_EN_PROMPT)
        .map(producto => lineaDeProducto(producto, precioUy)).join('\n') || '(catálogo vacío)';

    return [
        'Sos Brotecito, el asistente virtual de ZAPI, un vivero agroecológico de Montevideo, Uruguay.',
        'Hablás en español rioplatense (vos, tenés, querés), con tono cálido, breve y claro. Máximo 4 oraciones.',
        'Respondés solo sobre ZAPI, sus productos, plantas, huertas, cuidados básicos, envíos y servicios.',
        'Si te preguntan otra cosa, decí amablemente que solo podés ayudar con temas de ZAPI.',
        'Usá solo los datos de abajo. Si no sabés algo (horarios, promociones, plazos, medios de pago, toxicidad),',
        'no lo inventes: decí que lo confirme el equipo por WhatsApp.',
        'No des consejos médicos ni veterinarios. No pidas datos personales ni contraseñas.',
        'Respondé en texto simple, sin markdown ni listas con símbolos.',
        '',
        'DATOS DEL NEGOCIO',
        `- WhatsApp: ${negocio.whatsappVisible}`,
        `- Dirección: ${negocio.direccion}`,
        `- Envío gratis desde ${precioUy(negocio.envioGratis)}; en compras menores el costo se coordina por WhatsApp.`,
        '- Los pedidos se coordinan por WhatsApp. Las visitas se coordinan previamente.',
        '',
        'CATÁLOGO ACTUAL',
        catalogo
    ].join('\n');
}

/* Llama a la API de Gemini con un modelo y devuelve el texto. */
async function consultarModelo({ instrucciones, mensajes, apiKey, modelo, fetchImpl }) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        + `${encodeURIComponent(modelo)}:generateContent`;

    const respuesta = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: instrucciones }] },
            contents: mensajes.map(m => ({
                role: m.rol === 'bot' ? 'model' : 'user',
                parts: [{ text: m.texto }]
            })),
            generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
        })
    });

    if (!respuesta.ok) {
        let detalle = '';
        try { detalle = (await respuesta.text()).slice(0, 200); } catch { /* sin cuerpo */ }
        const error = new HttpError(502, `Gemini respondió ${respuesta.status} (${modelo}): ${detalle}`);
        error.estadoGemini = respuesta.status;
        throw error;
    }

    const datos = await respuesta.json();
    const partes = datos && datos.candidates && datos.candidates[0]
        && datos.candidates[0].content && datos.candidates[0].content.parts;
    const texto = Array.isArray(partes) ? partes.map(p => p.text || '').join('').trim() : '';

    if (!texto) throw new HttpError(502, 'Gemini no devolvió texto.');

    return texto;
}

/* Prueba el modelo pedido y, si no existe (404), los de respaldo. */
async function consultarGemini({ instrucciones, mensajes, apiKey, modelo, fetchImpl = fetch }) {
    const candidatos = [...new Set([modelo, ...MODELOS_POR_DEFECTO].filter(Boolean))];
    let ultimoError;

    for (const candidato of candidatos) {
        try {
            return await consultarModelo({ instrucciones, mensajes, apiKey, modelo: candidato, fetchImpl });
        } catch (error) {
            ultimoError = error;
            if (error.estadoGemini !== 404) throw error;
        }
    }

    throw ultimoError;
}

module.exports = { validarMensajes, armarInstrucciones, consultarGemini, MODELO_POR_DEFECTO };
