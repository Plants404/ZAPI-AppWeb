'use strict';

/* Menú de navegación móvil. En pantallas grandes la barra está siempre
   visible; por debajo de 1024 px el botón hamburguesa abre el panel. */

const botonMenu = document.getElementById("navToggle");
const navegacion = document.getElementById("navPrincipal");
const fondoMenu = document.getElementById("navBackdrop");
const hojaMenu = document.getElementById("hojaMenu");
const escritorio = window.matchMedia("(min-width: 1024px)");
const movil = window.matchMedia("(max-width: 767px)");

let menuAbierto = false;

function sincronizarMenu() {
    if (!navegacion) return;

    const hojaActiva = Boolean(hojaMenu && movil.matches && menuAbierto);
    const oculto = !escritorio.matches && (!menuAbierto || hojaActiva);

    navegacion.inert = oculto;

    if (oculto) navegacion.setAttribute("aria-hidden", "true");
    else navegacion.removeAttribute("aria-hidden");

    if (hojaMenu) hojaMenu.inert = !hojaActiva;
}

function abrirMenu() {
    if (!botonMenu || !navegacion || menuAbierto) return;

    menuAbierto = true;
    document.body.classList.add("menu-abierto");
    const usarHoja = Boolean(hojaMenu && movil.matches);

    if (usarHoja) {
        hojaMenu.hidden = false;
        window.requestAnimationFrame(() => hojaMenu.classList.add("esta-abierto"));
    } else {
        navegacion.classList.add("esta-abierto");
    }

    botonMenu.setAttribute("aria-expanded", "true");
    botonMenu.setAttribute("aria-label", "Cerrar menú de navegación");

    if (fondoMenu) {
        fondoMenu.hidden = false;
        fondoMenu.classList.add("visible");
        fondoMenu.classList.add("esta-activo");
    }

    bloquearScroll(true);
    sincronizarMenu();

    const panel = usarHoja ? hojaMenu : navegacion;
    const primerEnlace = panel.querySelector("a");
    if (primerEnlace) primerEnlace.focus();
}

function cerrarMenu() {
    if (!botonMenu || !navegacion || !menuAbierto) return;

    menuAbierto = false;
    document.body.classList.remove("menu-abierto");
    navegacion.classList.remove("esta-abierto");
    if (hojaMenu) hojaMenu.classList.remove("esta-abierto");

    botonMenu.setAttribute("aria-expanded", "false");
    botonMenu.setAttribute("aria-label", "Abrir menú de navegación");

    if (fondoMenu) {
        fondoMenu.classList.remove("visible");
        fondoMenu.classList.remove("esta-activo");
        fondoMenu.hidden = true;
    }

    bloquearScroll(false);
    sincronizarMenu();
    if (hojaMenu) {
        window.setTimeout(() => {
            if (!menuAbierto) hojaMenu.hidden = true;
        }, 250);
    }
    botonMenu.focus();
}

if (botonMenu && navegacion) {
    botonMenu.addEventListener("click", () => {
        if (menuAbierto) cerrarMenu();
        else abrirMenu();
    });

    if (fondoMenu) fondoMenu.addEventListener("click", cerrarMenu);
    if (hojaMenu) {
        hojaMenu.querySelector(".bottom-sheet-cerrar").addEventListener("click", cerrarMenu);
        hojaMenu.addEventListener("click", evento => {
            if (evento.target.closest("a")) cerrarMenu();
        });
        hojaMenu.addEventListener("click", evento => {
            if (evento.target === hojaMenu) cerrarMenu();
        });
    }

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

    if (typeof movil.addEventListener === "function") {
        movil.addEventListener("change", alCambiarAncho);
    } else {
        movil.addListener(alCambiarAncho);
    }

    sincronizarMenu();
}
