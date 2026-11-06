'use strict';

/* Búsqueda del encabezado. En el catálogo filtra en vivo; en el resto de
   las páginas el formulario navega a catalogo.html?q=… y el catálogo
   aplica el término al cargar. */

const formularioBusqueda = document.getElementById("headerSearch");
const entradaBusqueda = document.getElementById("searchInput");
const limpiarBusqueda = document.getElementById("searchClear");
const estadoBusqueda = document.getElementById("searchStatus");

function sincronizarBotonLimpiar() {
    if (limpiarBusqueda) limpiarBusqueda.hidden = !entradaBusqueda.value;
}

function anunciarResultados(termino, cantidad) {
    if (!estadoBusqueda) return;

    const mensaje = termino && cantidad > 0
        ? cantidad + (cantidad === 1 ? " producto" : " productos") + ' para "' + termino + '".'
        : "";

    if (estadoBusqueda.textContent !== mensaje) estadoBusqueda.textContent = mensaje;
}

function refrescarCampoBuscador(texto) {
    entradaBusqueda.value = texto;
    sincronizarBotonLimpiar();
    anunciarResultados(texto.trim(), 0);
}

function buscarEnElCatalogo(texto) {
    const encontrados = window.aplicarBusqueda(texto);

    entradaBusqueda.value = texto;
    sincronizarBotonLimpiar();
    anunciarResultados(texto.trim(), encontrados);
}

if (formularioBusqueda && entradaBusqueda) {
    const hayCatalogo = typeof window.aplicarBusqueda === "function";

    formularioBusqueda.addEventListener("submit", evento => {
        if (!hayCatalogo) return;

        evento.preventDefault();
        buscarEnElCatalogo(entradaBusqueda.value);
    });

    entradaBusqueda.addEventListener("input", () => {
        sincronizarBotonLimpiar();

        if (hayCatalogo) buscarEnElCatalogo(entradaBusqueda.value);
        else anunciarResultados("", 0);
    });

    entradaBusqueda.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && entradaBusqueda.value) {
            evento.preventDefault();

            if (hayCatalogo) buscarEnElCatalogo("");
            else {
                entradaBusqueda.value = "";
                sincronizarBotonLimpiar();
            }
        }
    });

    if (limpiarBusqueda) {
        limpiarBusqueda.addEventListener("click", () => {
            if (hayCatalogo) buscarEnElCatalogo("");
            else {
                entradaBusqueda.value = "";
                sincronizarBotonLimpiar();
            }

            entradaBusqueda.focus();
        });
    }

    if (hayCatalogo) {
        const termino = new URLSearchParams(window.location.search).get("q");

        if (termino) buscarEnElCatalogo(termino);
    }

    sincronizarBotonLimpiar();
}
