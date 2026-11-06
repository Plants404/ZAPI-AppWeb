'use strict';

/* Contenido editable del sitio. Las páginas traen un respaldo estático y
   este archivo lo reemplaza con lo que devuelve GET /api/contenido. Nunca
   se inserta HTML libre: los campos son texto y las listas usan
   renderizadores fijos definidos acá. */

const CONTENIDO = {};

let promesaContenido = null;
let contenidoCargado = false;
const esperasContenido = [];

const ICONOS_BENEFICIOS = ['verified', 'support_agent', 'water_drop'];
const ICONOS_PILARES = ['inventory_2', 'local_florist', 'water_drop'];

function cuandoContenidoListo(escucha) {
    if (contenidoCargado) {
        if (typeof escucha === 'function') escucha(CONTENIDO);
        return;
    }

    if (typeof escucha === 'function') esperasContenido.push(escucha);
}

function obtenerContenido(ruta) {
    return String(ruta || '')
        .split('.')
        .filter(Boolean)
        .reduce((valor, parte) => (valor && typeof valor === 'object' ? valor[parte] : undefined), CONTENIDO);
}

function iniciales(nombre) {
    return String(nombre || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => Array.from(parte)[0] || '')
        .join('')
        .toUpperCase();
}

function icono(nombre) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + escaparHTML(nombre) + '</span>';
}

const RENDERIZADORES_CONTENIDO = {
    'portada.beneficios': lista => lista.map((beneficio, indice) =>
        '<li>' + icono(ICONOS_BENEFICIOS[indice] || 'verified') + ' ' + escaparHTML(beneficio) + '</li>'
    ).join(''),

    'servicios.items': lista => lista.map((item, indice) => `
        <article class="servicio-card">
            <div class="servicio-icono">${icono(item.icono || 'eco')}</div>
            <span class="servicio-numero" aria-hidden="true">${String(indice + 1).padStart(2, '0')}</span>
            <h3>${escaparHTML(item.titulo)}</h3>
            <p>${escaparHTML(item.texto)}</p>
            <a class="enlace-flecha" href="${rutaConRaiz('contacto.html')}">Consultar ${icono('arrow_forward')}</a>
        </article>`).join(''),

    'nosotros.pilares': lista => lista.map((pilar, indice) => `
        <article>${icono(ICONOS_PILARES[indice] || 'eco')}<h3>${escaparHTML(pilar.titulo)}</h3><p>${escaparHTML(pilar.texto)}</p></article>`
    ).join(''),

    'nosotros.razones': lista => lista.map((razon, indice) => `
        <article><span aria-hidden="true">${String(indice + 1).padStart(2, '0')}</span><h3>${escaparHTML(razon.titulo)}</h3><p>${escaparHTML(razon.texto)}</p></article>`
    ).join(''),

    'nosotros.equipo': lista => lista.map(persona => `
        <article class="persona">
            <span class="persona-avatar" aria-hidden="true">${escaparHTML(iniciales(persona.nombre))}</span>
            <div><h3>${escaparHTML(persona.nombre)}</h3><p class="persona-rol">${escaparHTML(persona.rol)}</p><p>${escaparHTML(persona.texto)}</p></div>
        </article>`).join('')
};

function aplicarTexto() {
    document.querySelectorAll('[data-contenido]').forEach(elemento => {
        const valor = obtenerContenido(elemento.dataset.contenido);

        if (valor === undefined || valor === null || typeof valor === 'object') return;

        elemento.textContent = String(valor);
    });
}

function aplicarImagenes() {
    document.querySelectorAll('[data-contenido-imagen]').forEach(imagen => {
        const valor = obtenerContenido(imagen.dataset.contenidoImagen);

        if (typeof valor !== 'string' || !valor) return;

        imagen.src = rutaConRaiz(valor);
    });
}

function aplicarEnlaces() {
    document.querySelectorAll('[data-contenido-enlace]').forEach(enlace => {
        const valor = obtenerContenido(enlace.dataset.contenidoEnlace);

        if (typeof valor !== 'string' || !valor) {
            enlace.hidden = true;
            return;
        }

        enlace.href = valor;
        enlace.hidden = false;
    });
}

function aplicarListas() {
    document.querySelectorAll('[data-contenido-lista]').forEach(contenedor => {
        const clave = contenedor.dataset.contenidoLista;
        const renderizador = RENDERIZADORES_CONTENIDO[clave];
        const valor = obtenerContenido(clave);

        if (!renderizador || !Array.isArray(valor)) return;

        contenedor.innerHTML = renderizador(valor);
    });
}

function aplicarPromocion() {
    const promocion = CONTENIDO.promociones;

    if (!promocion) return;

    document.querySelectorAll('[data-promocion]').forEach(banner => {
        banner.hidden = !promocion.activa;

        const titulo = banner.querySelector('[data-promocion-titulo]');
        const texto = banner.querySelector('[data-promocion-texto]');
        const enlace = banner.querySelector('[data-promocion-enlace]');

        if (titulo) titulo.textContent = promocion.titulo || '';
        if (texto) texto.textContent = promocion.texto || '';

        if (enlace) {
            enlace.textContent = promocion.textoEnlace || 'Ver más';
            enlace.hidden = !promocion.enlace;

            if (promocion.enlace) enlace.href = promocion.enlace;
        }
    });
}

function aplicarContenido(contenido) {
    Object.assign(CONTENIDO, contenido || {});

    aplicarTexto();
    aplicarImagenes();
    aplicarEnlaces();
    aplicarListas();
    aplicarPromocion();

    document.dispatchEvent(new CustomEvent('contenido-listo', { detail: CONTENIDO }));
}

async function cargarContenido() {
    if (promesaContenido) return promesaContenido;

    promesaContenido = (async () => {
        try {
            const datos = await API.get('/api/contenido');

            Object.assign(CONTENIDO, datos.contenido || {});
            contenidoCargado = true;
            aplicarContenido(CONTENIDO);
        } catch {
            contenidoCargado = false;
        }

        esperasContenido.splice(0).forEach(escucha => escucha(CONTENIDO));

        return CONTENIDO;
    })();

    return promesaContenido;
}

cargarContenido();
