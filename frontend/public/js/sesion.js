'use strict';

/* Sesión compartida por todas las páginas. El servidor decide el rol; acá
   solo se pinta el hueco del encabezado. El menú de usuario aparece cuando
   GET /api/auth/yo devuelve una sesión válida. */

const SESION = {
    cargada: false,
    usuario: null
};

let promesaSesion = null;
const esperasSesion = [];

function cuandoSesionLista(escucha) {
    if (SESION.cargada) {
        escucha(SESION.usuario);
        return;
    }

    if (typeof escucha === "function") esperasSesion.push(escucha);
}

function rutaActualRelativa() {
    const ruta = window.location.pathname.replace(/^\/+/, "");
    const partes = ruta.split("/").filter(Boolean);
    const indice = partes.lastIndexOf("frontend");

    if (indice >= 0) partes.splice(0, indice + 1);

    return (partes.join("/") || "index.html") + window.location.search;
}

function inicialDe(nombre) {
    return Array.from(String(nombre || "?").trim())[0].toUpperCase();
}

function pintarSesion(usuario) {
    const contenedor = document.querySelector("[data-sesion]");

    if (!contenedor) return;

    if (!usuario) {
        contenedor.innerHTML = `<a class="sesion-ingresar" href="${rutaConRaiz("login.html?volver=" + encodeURIComponent(rutaActualRelativa()))}">Ingresar</a>`;
        return;
    }

    const esAdmin = usuario.role === "superadmin";
    const enlaceCuenta = esAdmin ? rutaConRaiz("admin/index.html") : rutaConRaiz("cuenta.html");
    const textoCuenta = esAdmin ? "Panel de administración" : "Mi cuenta";

    contenedor.innerHTML = `
        <div class="sesion-usuario">
            <button class="sesion-boton" type="button" aria-expanded="false" aria-controls="sesionMenu">
                <span class="sesion-avatar" aria-hidden="true">${escaparHTML(inicialDe(usuario.nombre))}</span>
                <span class="sesion-nombre">${escaparHTML(usuario.nombre)}</span>
                <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
            </button>
            <div class="sesion-menu" id="sesionMenu" hidden>
                <span class="sesion-rol">${esAdmin ? "Superadministrador" : "Cliente"}</span>
                <a href="${enlaceCuenta}">${textoCuenta}</a>
                <a href="${rutaConRaiz("cuenta.html")}">Mis pedidos</a>
                <button type="button" data-cerrar-sesion>Cerrar sesión</button>
            </div>
        </div>`;

    const boton = contenedor.querySelector(".sesion-boton");
    const menu = contenedor.querySelector(".sesion-menu");

    boton.addEventListener("click", () => {
        const abierto = !menu.hidden;

        menu.hidden = abierto;
        boton.setAttribute("aria-expanded", String(!abierto));
    });

    document.addEventListener("click", evento => {
        if (menu.hidden || contenedor.contains(evento.target)) return;
        menu.hidden = true;
        boton.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape" || menu.hidden) return;
        menu.hidden = true;
        boton.setAttribute("aria-expanded", "false");
        boton.focus();
    });

    contenedor.querySelector("[data-cerrar-sesion]").addEventListener("click", async () => {
        try {
            await API.post("/api/auth/logout");
        } catch {
            /* Aunque falle la red, la sesión local deja de mostrarse. */
        }

        SESION.usuario = null;
        pintarSesion(null);
        window.location.href = rutaConRaiz("index.html");
    });
}

async function cargarSesion() {
    if (promesaSesion) return promesaSesion;

    promesaSesion = (async () => {
        try {
            const datos = await API.get("/api/auth/yo");
            SESION.usuario = datos.usuario;
        } catch (error) {
            SESION.usuario = null;

            if (error.estado !== 401 && error.estado !== 403) {
                /* Sin red la página sigue funcionando como visitante. */
            }
        }

        SESION.cargada = true;
        pintarSesion(SESION.usuario);
        esperasSesion.splice(0).forEach(escucha => escucha(SESION.usuario));
        document.dispatchEvent(new CustomEvent("sesion-lista", { detail: SESION.usuario }));

        return SESION.usuario;
    })();

    return promesaSesion;
}

cargarSesion();
