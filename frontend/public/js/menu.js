'use strict';

/* Menú de navegación móvil. En pantallas grandes la barra está siempre
   visible; por debajo de 1024 px el botón hamburguesa abre el panel. */

const botonMenu = document.getElementById("navToggle");
const navegacion = document.getElementById("navPrincipal");
const fondoMenu = document.getElementById("navBackdrop");
const escritorio = window.matchMedia("(min-width: 1024px)");

let menuAbierto = false;

function sincronizarMenu() {
    if (!navegacion) return;

    const oculto = !escritorio.matches && !menuAbierto;

    navegacion.inert = oculto;

    if (oculto) navegacion.setAttribute("aria-hidden", "true");
    else navegacion.removeAttribute("aria-hidden");
}

function abrirMenu() {
    if (!botonMenu || !navegacion || menuAbierto) return;

    menuAbierto = true;
    document.body.classList.add("menu-abierto");
    navegacion.classList.add("esta-abierto");

    botonMenu.setAttribute("aria-expanded", "true");
    botonMenu.setAttribute("aria-label", "Cerrar menú de navegación");

    if (fondoMenu) {
        fondoMenu.hidden = false;
        fondoMenu.classList.add("visible");
    }

    bloquearScroll(true);
    sincronizarMenu();

    const primerEnlace = navegacion.querySelector("a");
    if (primerEnlace) primerEnlace.focus();
}

function cerrarMenu() {
    if (!botonMenu || !navegacion || !menuAbierto) return;

    menuAbierto = false;
    document.body.classList.remove("menu-abierto");
    navegacion.classList.remove("esta-abierto");

    botonMenu.setAttribute("aria-expanded", "false");
    botonMenu.setAttribute("aria-label", "Abrir menú de navegación");

    if (fondoMenu) {
        fondoMenu.classList.remove("visible");
        fondoMenu.hidden = true;
    }

    bloquearScroll(false);
    sincronizarMenu();
    botonMenu.focus();
}

if (botonMenu && navegacion) {
    botonMenu.addEventListener("click", () => {
        if (menuAbierto) cerrarMenu();
        else abrirMenu();
    });

    if (fondoMenu) fondoMenu.addEventListener("click", cerrarMenu);

    navegacion.addEventListener("click", evento => {
        if (evento.target.closest("a")) cerrarMenu();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && menuAbierto) {
            evento.preventDefault();
            cerrarMenu();
        }
    });

    const alCambiarAncho = () => {
        if (escritorio.matches) cerrarMenu();
        else sincronizarMenu();
    };

    if (typeof escritorio.addEventListener === "function") {
        escritorio.addEventListener("change", alCambiarAncho);
    } else {
        escritorio.addListener(alCambiarAncho);
    }

    sincronizarMenu();
}
