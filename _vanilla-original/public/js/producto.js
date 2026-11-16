'use strict';

/* Ficha de producto generada estaticamente. Este script solo maneja la
   galeria de miniaturas; el boton "Agregar" se atiende por delegacion
   desde modal.js en toda la pagina. */

const productoId = Number(document.body.dataset.productoId || 0);
const producto = obtenerProducto(productoId);

if (!producto) {
    const error = document.getElementById('productoError');
    const detalle = document.getElementById('productoDetalle');
    if (detalle) detalle.hidden = true;
    if (error) error.hidden = false;
    // No hay nothing more to do without a valid product.
}

const fotos = producto ? fotosDeProducto(producto) : [];
const principal = document.getElementById('productoImagen');
const miniaturas = document.getElementById('productoMiniaturas');

function mostrarFoto(indice) {
    if (!producto || !fotos.length || !principal) return;

    const foto = fotos[indice];
    principal.src = rutaConRaiz(foto);
    principal.alt = producto.nombre + ', foto ' + (indice + 1) + ' de ' + fotos.length;

    if (miniaturas) {
        miniaturas.querySelectorAll('.producto-miniatura').forEach((boton, posicion) => {
            const activa = posicion === indice;
            boton.classList.toggle('activa', activa);
            boton.setAttribute('aria-current', activa ? 'true' : 'false');
        });
    }
}

if (miniaturas && fotos.length > 1) {
    miniaturas.hidden = false;
    miniaturas.addEventListener('click', evento => {
        const boton = evento.target.closest('[data-indice-foto]');
        if (!boton) return;
        mostrarFoto(Number(boton.dataset.indiceFoto));
    });
} else if (miniaturas) {
    miniaturas.hidden = true;
}

if (fotos.length) {
    mostrarFoto(0);
}
