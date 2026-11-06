/* global module */
'use strict';

/* Datos de respaldo del negocio para el navegador y para las herramientas.
   En tiempo de ejecución la API manda: configuracion.js copia estos valores
   a CONFIG y los reemplaza con GET /api/config. NEGOCIO queda congelado para
   que la plantilla estática sea reproducible. */
(function (raiz, fabrica) {
    const api = fabrica();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
        return;
    }

    raiz.NEGOCIO = api.NEGOCIO;
    raiz.slug = api.slug;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const NEGOCIO = Object.freeze({
        nombre: "ZAPI",
        descripcion: "Vivero agroecológico en Montevideo.",
        sitio: "https://zapi.uy",
        whatsapp: "59898268560",
        whatsappVisible: "098 268 560",
        email: "hola@zapi.uy",
        direccion: "Congreso de Abril, Montevideo, Uruguay",
        horario: "Visitas coordinadas previamente por WhatsApp.",
        envioGratis: 2500
    });

    function slug(texto) {
        return String(texto)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    return { NEGOCIO, slug };
}));
