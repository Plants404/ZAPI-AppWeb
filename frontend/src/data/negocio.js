/* Datos y ayudas del negocio (las mismas del sitio viejo). */
export const NEGOCIO = Object.freeze({
    nombre: "ZAPI",
    descripcion: "Vivero agroecológico en Montevideo.",
    sitio: "https://zapi.uy",
    moneda: "UYU",
    whatsapp: "59898268560",
    whatsappVisible: "098 268 560",
    email: "zapi.vivero@gmail.com",
    direccion: "Congreso de Abril, Montevideo, Uruguay",
    horario: "Visitas coordinadas previamente por WhatsApp.",
    envioGratis: 2500,
    emailjs: Object.freeze({
        servicio: "service_65fes09",
        plantillaContacto: "template_bno641y",
        plantillaTestimonio: "PEGAR_PLANTILLA_TESTIMONIO",
        clavePublica: "svGiYtyfrTzCv-GhG"
    })
});

export function slug(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function formatearPrecio(valor) {
    return new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: NEGOCIO.moneda,
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

export function textoDeStock(unidades) {
    const total = Math.max(0, Math.floor(Number(unidades) || 0));

    if (total === 0) return "Sin stock";
    if (total === 1) return "Última unidad";
    if (total <= 3) return "Últimas " + total + " unidades";

    return total + " disponibles";
}

export function claseDeStock(unidades) {
    const total = Math.max(0, Math.floor(Number(unidades) || 0));

    if (total === 0) return "stock-agotado";
    if (total <= 3) return "stock-bajo";

    return "stock-ok";
}
