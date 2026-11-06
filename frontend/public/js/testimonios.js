'use strict';

/* Formulario de opiniones. La API guarda la opinión como pendiente y el
   panel de administración decide cuándo se publica. Hace falta sesión de
   cliente: si no la hay, se vuelve al login. */

const dialogoTestimonio = document.getElementById('dialogoTestimonio');
const formularioTestimonio = document.getElementById('testimonioForm');

function abrirTestimonio(disparador) {
    if (!dialogoTestimonio) return;

    if (disparador && disparador.dataset.productoId) {
        dialogoTestimonio.dataset.productoId = disparador.dataset.productoId;
    }

    if (!dialogoTestimonio.open) {
        dialogoTestimonio.showModal();
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
    const desdeUrl = new URLSearchParams(window.location.search).get('producto');
    const id = Number(desdeDialogo || desdeUrl);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
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

    if (!SESION.usuario) {
        volverALogin();
        return;
    }

    if (boton) boton.disabled = true;
    if (textoBoton) textoBoton.textContent = 'Enviando…';
    mostrarEstadoFormulario(estado, '', '');

    try {
        await API.post('/api/testimonios', {
            autor: valorNombre,
            lugar: valorLugar,
            texto: valorTexto,
            estrellas: valorEstrellas,
            productoId: productoDelTestimonio()
        });

        formularioTestimonio.reset();
        mostrarEstadoFormulario(
            estado,
            '¡Gracias! Tu opinión queda pendiente de revisión.',
            'ok'
        );

        window.setTimeout(cerrarTestimonio, 1800);
    } catch (error) {
        if (error.estado === 401) {
            volverALogin();
            return;
        }

        if (error.datos && error.datos.campo === 'autor') {
            marcarErrorCampo('testimonioNombre', 'errorTestimonioNombre', mensajeDeError(error));
        } else if (error.datos && error.datos.campo === 'texto') {
            marcarErrorCampo('testimonioTexto', 'errorTestimonioTexto', mensajeDeError(error));
        } else {
            mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
        }
    } finally {
        if (boton) boton.disabled = false;
        if (textoBoton) textoBoton.textContent = 'Enviar opinión';
    }
}

if (dialogoTestimonio) {
    dialogoTestimonio.addEventListener('close', () => bloquearScroll(false));

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
