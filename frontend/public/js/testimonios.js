'use strict';

/* Formulario de opinion. La opinión se guarda en el servidor y se publica
   al instante en la portada. El dialogo solo existe en las paginas que lo
   declaran (opiniones: true). */

const dialogoTestimonio = document.getElementById('dialogoTestimonio');
const formularioTestimonio = document.getElementById('testimonioForm');

function abrirTestimonio(disparador) {
    if (!dialogoTestimonio) return;

    if (disparador && disparador.dataset.productoId) {
        dialogoTestimonio.dataset.productoId = disparador.dataset.productoId;
    }

    if (!dialogoTestimonio.open) {
        dialogoTestimonio.showModal();
        document.body.classList.add('con-testimonio-abierto');
        bloquearScroll(true);
    }

    const nombre = document.getElementById('testimonioNombre');
    if (nombre) nombre.focus();
}

function cerrarTestimonio() {
    if (!dialogoTestimonio || !dialogoTestimonio.open) return;

    dialogoTestimonio.close();
}

function productoDelTestimonio() {
    const desdeDialogo = dialogoTestimonio && dialogoTestimonio.dataset.productoId;
    const id = Number(desdeDialogo);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const ETIQUETAS_ESTRELLAS = { 1: 'Malo', 2: 'Regular', 3: 'Bueno', 4: 'Muy bueno', 5: 'Excelente' };
const selectorEstrellas = document.getElementById('testimonioEstrellasSelector');

function ponerEstrellas(valor) {
    const campo = document.getElementById('testimonioEstrellas');
    const texto = document.getElementById('testimonioEstrellasTexto');
    if (!selectorEstrellas || !campo) return;

    campo.value = String(valor);
    selectorEstrellas.querySelectorAll('.estrella-boton').forEach(boton => {
        const n = Number(boton.dataset.valor);
        boton.setAttribute('aria-checked', String(n === valor));
        boton.classList.toggle('activa', n <= valor);
        boton.tabIndex = n === valor ? 0 : -1;
    });
    if (texto) texto.textContent = ETIQUETAS_ESTRELLAS[valor] || '';
}

if (selectorEstrellas) {
    selectorEstrellas.addEventListener('click', evento => {
        const boton = evento.target.closest('.estrella-boton');
        if (boton) ponerEstrellas(Number(boton.dataset.valor));
    });
    selectorEstrellas.addEventListener('keydown', evento => {
        const actual = Number(document.getElementById('testimonioEstrellas').value) || 5;
        const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[evento.key];
        if (!delta) return;
        evento.preventDefault();
        const nuevo = Math.min(5, Math.max(1, actual + delta));
        ponerEstrellas(nuevo);
        selectorEstrellas.querySelector('[data-valor="' + nuevo + '"]').focus();
    });
    ponerEstrellas(5);
}

function escaparHtml(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tarjetaDeTestimonio(t) {
    const n = Math.min(5, Math.max(1, Number(t.estrellas) || 5));
    return '<article class="resena-tarjeta" role="listitem">'
        + '<p class="resena-estrellas" role="img" aria-label="' + n + ' de 5 estrellas">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</p>'
        + '<blockquote class="resena-texto">' + escaparHtml(t.texto) + '</blockquote>'
        + '<footer class="resena-autor"><strong>' + escaparHtml(t.autor) + '</strong>'
        + '<span>' + escaparHtml(t.lugar || '') + '</span></footer></article>';
}

/* Si el servidor tiene opiniones publicadas, la portada muestra esas. */
async function cargarTestimonios() {
    const lista = document.getElementById('testimoniosLista');
    if (!lista || typeof window.urlApi !== 'function') return;

    try {
        const respuesta = await fetch(window.urlApi('/api/testimonials'));
        if (!respuesta.ok) return;
        const { testimonials } = await respuesta.json();
        if (Array.isArray(testimonials) && testimonials.length) {
            lista.innerHTML = testimonials.map(tarjetaDeTestimonio).join('');
        }
    } catch {
        /* Sin servidor se quedan los testimonios ya dibujados en el HTML. */
    }
}

function agregarTestimonio(t) {
    const lista = document.getElementById('testimoniosLista');
    if (!lista) return;

    const vacio = lista.querySelector('.estado-vacio');
    if (vacio) vacio.remove();
    lista.insertAdjacentHTML('afterbegin', tarjetaDeTestimonio(t));
}

async function enviarTestimonio(evento) {
    evento.preventDefault();

    const estado = document.getElementById('testimonioEstado');
    const boton = document.getElementById('testimonioEnviar');
    const textoBoton = document.getElementById('testimonioEnviarTexto');
    const sitio = document.getElementById('testimonioSitio');
    const nombre = document.getElementById('testimonioNombre');
    const lugar = document.getElementById('testimonioLugar');
    const texto = document.getElementById('testimonioTexto');
    const estrellas = document.getElementById('testimonioEstrellas');

    if (!formularioTestimonio || !nombre || !texto || !estrellas) return;

    limpiarErrores(formularioTestimonio);

    const valorNombre = limpiarValor(nombre.value);
    const valorLugar = lugar ? limpiarValor(lugar.value) : '';
    const valorTexto = limpiarValor(texto.value);
    const valorEstrellas = Number(estrellas.value) || 5;

    if (valorNombre.length < 2) {
        marcarErrorCampo('testimonioNombre', 'errorTestimonioNombre', 'Escribí tu nombre');
        nombre.focus();
        return;
    }

    if (valorLugar.length > 120) {
        marcarErrorCampo('testimonioLugar', 'errorTestimonioLugar', 'El lugar no puede superar 120 caracteres');
        if (lugar) lugar.focus();
        return;
    }

    if (valorTexto.length < 10) {
        marcarErrorCampo('testimonioTexto', 'errorTestimonioTexto', 'Contanos un poco más sobre tu experiencia');
        texto.focus();
        return;
    }

    if (valorTexto.length > 600) {
        marcarErrorCampo('testimonioTexto', 'errorTestimonioTexto', 'La opinión no puede superar 600 caracteres');
        texto.focus();
        return;
    }

    if (sitio && sitio.value.trim()) return;

    if (boton) boton.disabled = true;
    if (textoBoton) textoBoton.textContent = 'Enviando…';
    mostrarEstadoFormulario(estado, '', '');

    const datos = {
        autor: valorNombre,
        lugar: valorLugar,
        texto: valorTexto,
        estrellas: valorEstrellas,
        productoId: productoDelTestimonio()
    };

    try {
        const respuesta = await fetch(window.urlApi('/api/testimonials'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            let mensaje = 'No pudimos publicar tu opinión. Probá de nuevo en un rato.';
            try { mensaje = (await respuesta.json()).error || mensaje; } catch { /* sin cuerpo */ }
            throw new Error(mensaje);
        }

        formularioTestimonio.reset();
        ponerEstrellas(5);
        agregarTestimonio(datos);
        mostrarEstadoFormulario(estado, '¡Gracias! Tu opinión ya está publicada.', 'ok');
        window.setTimeout(cerrarTestimonio, 1500);
    } catch (error) {
        mostrarEstadoFormulario(estado, error.message || 'No pudimos publicar tu opinión.', 'error');
    }

    if (boton) boton.disabled = false;
    if (textoBoton) textoBoton.textContent = 'Enviar opinión';
}

if (dialogoTestimonio) {
    dialogoTestimonio.addEventListener('close', () => {
        document.body.classList.remove('con-testimonio-abierto');
        bloquearScroll(false);
    });

    dialogoTestimonio.addEventListener('click', evento => {
        if (evento.target === dialogoTestimonio) cerrarTestimonio();
    });

    dialogoTestimonio.querySelectorAll('[data-cerrar-dialogo]').forEach(boton => {
        boton.addEventListener('click', cerrarTestimonio);
    });
}

document.addEventListener('click', evento => {
    const abrir = evento.target.closest('[data-abrir-testimonio]');

    if (!abrir) return;

    evento.preventDefault();
    abrirTestimonio(abrir);
});

if (formularioTestimonio) {
    formularioTestimonio.addEventListener('submit', enviarTestimonio);
}

cargarTestimonios();
