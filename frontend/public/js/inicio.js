'use strict';

/* Portada: dibuja los productos destacados usando el mismo constructor de
   tarjetas que el catalogo. Los testimonios ya van renderizados en el HTML
   generado; este script solo se encarga de los destacados. */

function renderDestacados() {
    const grilla = document.getElementById('productosDestacados');

    if (!grilla) return;

    const destacados = PRODUCTOS.filter(producto => producto.destacado).slice(0, 4);
    const lista = destacados.length ? destacados : PRODUCTOS.slice(0, 4);

    if (!lista.length) {
        grilla.innerHTML = '<p class="estado-vacio">Todavía no hay productos publicados.</p>';
        return;
    }

    grilla.innerHTML = lista.map(producto => htmlTarjetaProducto(producto)).join('');
}

renderDestacados();
