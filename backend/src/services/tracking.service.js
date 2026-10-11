'use strict';
/* ==========================================================
   SERVICIO: TRACKING DE NAVEGACION
   ------------------------------------------------------------
   Guarda eventos del front y los resume en "intereses" que el
   asistente usa para recomendar. Sin esto el bot recomienda a
   ciegas; con esto puede decir "veo que miraste las suculentas, te
   sirve el pack?".

   El resumen es determinista (pesos por tipo de evento): asi los
   intereses son estables y testeables.
   ========================================================== */

const { Evento, TIPOS } = require('../models/evento.model');
const { limpiarTexto } = require('../utils/texto');

const VENTANA_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTOS = 80;

/* Peso por tipo: agregar al carrito dice mas que mirar una ficha. */
const PESOS = {
    agregar_carrito: 3,
    enviar_pedido: 3,
    ver_producto: 2,
    ver_categoria: 1,
    buscar: 1,
    mensaje_chat: 1,
    sacar_carrito: -1,
    otro: 0,
};

async function registrar({ sesion, tipo, productoId, categoria, pagina, detalle }) {
    if (!TIPOS.includes(tipo)) return null;

    return Evento.create({
        sesion: limpiarTexto(sesion, 120),
        tipo,
        productoId: Number.isInteger(productoId) ? productoId : null,
        categoria: limpiarTexto(categoria, 120),
        pagina: limpiarTexto(pagina, 200),
        detalle: limpiarTexto(detalle, 200),
    });
}

/* Resume la actividad reciente de una sesion en categorias e
   productos por peso. Sin sesion no hay nada que resumir. */
async function resumirIntereses(sesion) {
    const limpia = limpiarTexto(sesion, 120);

    if (!limpia) return { categorias: [], productos: [], eventos: 0 };

    const eventos = await Evento
        .find({ sesion: limpia, creado: { $gte: new Date(Date.now() - VENTANA_MS) } })
        .sort({ creado: -1 })
        .limit(MAX_EVENTOS)
        .lean();

    const categorias = new Map();
    const productos = new Map();

    for (const evento of eventos) {
        const peso = PESOS[evento.tipo] ?? 0;

        if (evento.categoria) {
            categorias.set(
                evento.categoria,
                (categorias.get(evento.categoria) || 0) + peso
            );
        }

        if (evento.productoId !== null && evento.productoId !== undefined) {
            productos.set(
                evento.productoId,
                (productos.get(evento.productoId) || 0) + peso
            );
        }
    }

    const ordenar = mapa => [...mapa.entries()]
        .filter(([, peso]) => peso > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([clave]) => clave);

    return {
        categorias: ordenar(categorias).slice(0, 3),
        productos: ordenar(productos).slice(0, 5),
        eventos: eventos.length,
    };
}

module.exports = { registrar, resumirIntereses, VENTANA_MS };
