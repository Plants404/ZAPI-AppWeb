'use strict';

/* Carrusel de destacados en Inicio: inyecta las tarjetas originales del
   catalogo (window.tarjetaProducto, la misma que usa #productGrid) en
   #homeProductTrack. Diseno, modal y "Agregar al carrito" funcionan sin
   duplicar codigo: los clics los atienden los delegados de catalogo.js
   a nivel documento. */

function renderDestacados() {

    const bloque = document.querySelector(".home-products-carousel");
    const pista = document.getElementById("homeProductTrack");

    if (!bloque || !pista) return;

    if (typeof window.tarjetaProducto !== "function"
        || !Array.isArray(PRODUCTOS)
        || PRODUCTOS.length === 0) {
        bloque.hidden = true;
        return;
    }

    pista.innerHTML = PRODUCTOS.map(function (producto) {
        return window.tarjetaProducto(producto);
    }).join("");

    if (typeof pintarStockEnPantalla === "function") {
        pintarStockEnPantalla();
    }

    actualizarFlechasCarrusel();

}


function moverCarrusel(direccion) {

    const pista = document.getElementById("homeProductTrack");

    if (!pista) return;

    const paso = Math.max(pista.clientWidth * 0.85, 200);

    const sinMovimiento = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    pista.scrollBy({
        left: direccion * paso,
        behavior: sinMovimiento ? "auto" : "smooth"
    });

}


function actualizarFlechasCarrusel() {

    const pista = document.getElementById("homeProductTrack");

    if (!pista || pista.offsetParent === null) return;

    const anterior = document.querySelector(".carousel-nav-btn.prev");
    const siguiente = document.querySelector(".carousel-nav-btn.next");

    if (!anterior || !siguiente) return;

    const maximo = pista.scrollWidth - pista.clientWidth;

    anterior.disabled = pista.scrollLeft <= 1;
    siguiente.disabled = pista.scrollLeft >= maximo - 1;

}


alCargarElCatalogo(function () {

    renderDestacados();

});


document.addEventListener("click", function (evento) {

    if (!(evento.target instanceof Element)) return;

    if (evento.target.closest(".carousel-nav-btn.prev")) {
        moverCarrusel(-1);
    } else if (evento.target.closest(".carousel-nav-btn.next")) {
        moverCarrusel(1);
    }

});


(function () {

    let turno = false;

    function alDesplazar() {

        if (turno) return;
        turno = true;

        requestAnimationFrame(function () {
            turno = false;
            actualizarFlechasCarrusel();
        });

    }

    document.addEventListener("scroll", function (evento) {

        if (evento.target instanceof Element
            && evento.target.id === "homeProductTrack") {
            alDesplazar();
        }

    }, true);

    window.addEventListener("resize", actualizarFlechasCarrusel);

})();
