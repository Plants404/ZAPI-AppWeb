'use strict';
/* ==========================================================
   SERVICIO: RECOMENDACIONES
   ------------------------------------------------------------
   Une el catalogo real con los intereses del visitante. La regla
   es simple a proposito: si miro o agrego algo de "Aromaticas",
   se prioriza Aromaticas; si ya vio ese producto, pesa un poco
   mas. Nada de esto lo decide un modelo generativo: las
   recomendaciones se arman por reglas y se validan contra el
   catalogo antes de salir al navegador. Un id inventado no existe
   y se descarta.

   Nunca se recomienda algo agotado (unidades === 0). unidades
   === null es "sin stock cargado", que el sitio ya muestra como
   distinto de agotado; se deja pasar.
   ========================================================== */

const { productosConStock } = require('./catalogo.service');

async function traerCatalogo() {
    return productosConStock();
}

function aResumen(p) {
    return {
        id: p.id,
        nombre: p.nombre,
        slug: p.slug,
        categoria: p.categoria,
        precio: p.precio,
        unidades: p.unidades,
        imagen: p.imagen || '',
        url: `/productos/${p.slug}.html`,
    };
}

/* Recomendaciones a partir del resumen de tracking. */
async function porIntereses(intereses = {}, { limite = 3, excluir = [] } = {}) {
    const lista = await traerCatalogo();
    const categorias = new Set(intereses.categorias || []);
    const vistos = new Set(intereses.productos || []);
    const fuera = new Set(excluir);

    const puntuar = p =>
        (categorias.has(p.categoria) ? 2 : 0) + (vistos.has(p.id) ? 1 : 0);

    return lista
        .filter(p => !fuera.has(p.id) && p.unidades !== 0)
        .map(p => ({ p, puntaje: puntuar(p) }))
        .filter(x => x.puntaje > 0)
        .sort((a, b) => b.puntaje - a.puntaje
            || a.p.nombre.localeCompare(b.p.nombre))
        .slice(0, limite)
        .map(x => aResumen(x.p));
}

module.exports = { porIntereses };
