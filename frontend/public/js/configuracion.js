'use strict';

/* Configuración pública del sitio. La API es la fuente de verdad: el
   frontend nunca decide si hace falta cuenta, cuánto es el envío gratis ni
   cuántos ítems admite un pedido. Mientras la respuesta llega, CONFIG usa
   los valores de respaldo de negocio.js. */

const CONFIG = {
    cargada: false,
    requiereCuenta: true,
    registroAbierto: true,
    envioGratis: NEGOCIO.envioGratis,
    moneda: "UYU",
    maxItemsPorPedido: 100,
    negocio: { ...NEGOCIO }
};

let promesaConfiguracion = null;
const esperasConfiguracion = [];

function cuandoConfigLista(escucha) {
    if (CONFIG.cargada) {
        escucha(CONFIG);
        return;
    }

    if (typeof escucha === "function") esperasConfiguracion.push(escucha);
}

function aplicarTextosDeConfiguracion() {
    document.querySelectorAll("[data-envio-gratis]").forEach(elemento => {
        elemento.textContent = formatearPrecio(CONFIG.envioGratis, CONFIG.moneda);
    });

    document.querySelectorAll("[data-config-whatsapp]").forEach(elemento => {
        elemento.href = "https://wa.me/" + CONFIG.negocio.whatsapp;
    });

    document.querySelectorAll("[data-config-email]").forEach(elemento => {
        elemento.href = "mailto:" + CONFIG.negocio.email;
        if (elemento.dataset.configEmail === "texto") elemento.textContent = CONFIG.negocio.email;
    });
}

async function cargarConfiguracion() {
    if (promesaConfiguracion) return promesaConfiguracion;

    promesaConfiguracion = (async () => {
        try {
            const datos = await API.get("/api/config");

            Object.assign(CONFIG, datos, {
                cargada: true,
                negocio: { ...NEGOCIO, ...(datos.negocio || {}) }
            });
        } catch {
            CONFIG.cargada = false;
        }

        aplicarTextosDeConfiguracion();
        esperasConfiguracion.splice(0).forEach(escucha => escucha(CONFIG));
        document.dispatchEvent(new CustomEvent("configuracion-lista", { detail: CONFIG }));

        return CONFIG;
    })();

    return promesaConfiguracion;
}

cargarConfiguracion();
