'use strict';

/* Formulario de opinion. Si EmailJS esta configurado se envia por correo;
   si no, se abre WhatsApp con el testimonio precargado. El dialogo solo
   existe en las paginas que lo declaran (opiniones: true). */

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
    const id = Number(desdeDialogo);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function mensajeDeTestimonio(datos) {
    const partes = [
        'Hola ZAPI, me gustaría compartir una opinión:',
        '',
        'Autor: ' + datos.autor,
        'Lugar: ' + (datos.lugar || '—'),
        'Puntaje: ' + datos.estrellas + ' estrellas',
        '',
        'Opinión:',
        datos.texto
    ];

    if (datos.productoId) {
        partes.splice(3, 0, 'Producto: ' + datos.productoId);
    }

    return partes.filter(Boolean).join('\n');
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
        const configurado = await enviarCorreoEmailJS(NEGOCIO.emailjs.plantillaTestimonio, {
            autor: datos.autor,
            lugar: datos.lugar,
            estrellas: datos.estrellas,
            texto: datos.texto,
            productoId: datos.productoId || ''
        });

        if (configurado) {
            formularioTestimonio.reset();
            mostrarEstadoFormulario(estado, '¡Gracias! Tu opinión queda registrada.', 'ok');
            window.setTimeout(cerrarTestimonio, 1800);
            return;
        }
    } catch {
        /* Si EmailJS falla o no está configurado, se abre WhatsApp. */
    }

    abrirWhatsApp(mensajeDeTestimonio(datos), true);
    mostrarEstadoFormulario(estado, 'Tu opinión se enviará por WhatsApp.');

    if (boton) boton.disabled = false;
    if (textoBoton) textoBoton.textContent = 'Enviar opinión';
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
