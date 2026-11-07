/* global module */
'use strict';

/* Datos y helpers del negocio compartidos por el navegador y por las
   herramientas de generación. `slug` convierte un nombre en una dirección
   estable para las fichas de producto. */
(function (raiz, fabrica) {
    const api = fabrica();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
        return;
    }

    raiz.NEGOCIO = api.NEGOCIO;
    raiz.slug = api.slug;
    raiz.formatearPrecio = api.formatearPrecio;
    raiz.textoDeStock = api.textoDeStock;
    raiz.claseDeStock = api.claseDeStock;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const NEGOCIO = Object.freeze({
        nombre: "ZAPI",
        descripcion: "Vivero agroecológico en Montevideo.",
        sitio: "https://zapi.uy",
        moneda: "UYU",
        whatsapp: "59898268560",
        whatsappVisible: "098 268 560",
        email: "hola@zapi.uy",
        direccion: "Congreso de Abril, Montevideo, Uruguay",
        horario: "Visitas coordinadas previamente por WhatsApp.",
        envioGratis: 2500,
        emailjs: Object.freeze({
            servicio: "PEGAR_SERVICIO",
            plantillaContacto: "PEGAR_PLANTILLA_CONTACTO",
            plantillaTestimonio: "PEGAR_PLANTILLA_TESTIMONIO",
            clavePublica: "PEGAR_CLAVE_PUBLICA"
        })
    });

    function slug(texto) {
        return String(texto)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function formatearPrecio(valor) {
        return new Intl.NumberFormat("es-UY", {
            style: "currency",
            currency: NEGOCIO.moneda,
            maximumFractionDigits: 0
        }).format(Number(valor) || 0);
    }

    function textoDeStock(unidades) {
        const total = Math.max(0, Math.floor(Number(unidades) || 0));

        if (total === 0) return "Sin stock";
        if (total === 1) return "Última unidad";
        if (total <= 3) return "Últimas " + total + " unidades";

        return total + " disponibles";
    }

    function claseDeStock(unidades) {
        const total = Math.max(0, Math.floor(Number(unidades) || 0));

        if (total === 0) return "stock-agotado";
        if (total <= 3) return "stock-bajo";

        return "stock-ok";
    }

    return { NEGOCIO, slug, formatearPrecio, textoDeStock, claseDeStock };
}));
