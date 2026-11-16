'use strict';

/* Menú de navegación móvil. En pantallas grandes la barra está siempre
   visible; por debajo de 1024 px el botón hamburguesa abre el panel. */

const botonMenu = document.getElementById("navToggle");
const navegacion = document.getElementById("navPrincipal");
const fondoMenu = document.getElementById("navBackdrop");
const hojaMenu = document.getElementById("hojaMenu");
const escritorio = window.matchMedia("(min-width: 1024px)");
const movil = window.matchMedia("(max-width: 1023px)");

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

/* Estado de sesión en la barra: si hay sesión, "Ingresar" pasa a ser el
   nombre de la persona (con acceso a su cuenta) y aparece "Salir". */
(function sesionEnBarra() {
    const enlaceIngresar = document.querySelector("#navPrincipal a[href$='login.html']");
    if (!enlaceIngresar || typeof window.urlApi !== "function") return;

    const origen = function (ruta) {
        return typeof window.urlDelSitio === "function" ? window.urlDelSitio(ruta) : ruta;
    };

    fetch(window.urlApi("/api/auth/yo"), { credentials: "include" })
        .then(respuesta => (respuesta.ok ? respuesta.json() : null))
        .then(datos => {
            if (!datos || !datos.ok) return;

            const esAdmin = datos.rol === "admin";
            const nombre = String(datos.nombre || datos.email || "Mi cuenta").trim().split(/\s+/)[0];

            enlaceIngresar.textContent = esAdmin ? "Panel" : nombre;
            enlaceIngresar.setAttribute("href", origen(esAdmin ? "/admin.html" : "/pedidos.html"));
            enlaceIngresar.setAttribute("title", datos.email || "");

            const salir = document.createElement("li");
            salir.innerHTML = '<a class="nav-link nav-enlace" href="#" data-salir>Salir</a>';
            enlaceIngresar.parentElement.after(salir);

            const hoja = document.querySelector(".bottom-sheet-ingresar");
            if (hoja) {
                hoja.textContent = esAdmin ? "Ir al panel" : "Mi cuenta · " + nombre;
                hoja.setAttribute("href", origen(esAdmin ? "/admin.html" : "/pedidos.html"));
                hoja.style.setProperty("display", "flex", "important");
            }

            document.addEventListener("click", evento => {
                if (!evento.target.closest("[data-salir]")) return;
                evento.preventDefault();
                fetch(window.urlApi("/api/auth/logout"), { method: "POST", credentials: "include" })
                    .catch(() => null)
                    .then(() => { window.location.href = origen("/index.html"); });
            });
        })
        .catch(() => null);
})();
