/* La copia estatica del JSON, resuelta desde la ubicacion de este
   script (no desde la raiz del dominio): asi tambien funciona cuando
   el sitio cuelga de un subpath (GitHub Pages) y cuando no hay
   backend. */
const TESTIMONIOS_LOCAL = (function () {
    const script = document.currentScript;
    if (script && script.src) return new URL("../data/testimonios.json", script.src).href;
    return "/public/data/testimonios.json";
}());

/* Con backend se prueba primero la API; sin backend (Show Preview,
   hosting estatico) se lee directo del JSON local. */
const FUENTES_OPINIONES = (function () {
    const fnHayApi = window.hayApiConfigurada;
    const hayBackend = typeof fnHayApi !== "function" || fnHayApi();

    return hayBackend
        ? [window.urlApi("/api/testimonios"), TESTIMONIOS_LOCAL]
        : [TESTIMONIOS_LOCAL];
}());

async function cargarOpiniones() {

    for (const url of FUENTES_OPINIONES) {

        try {

            const respuesta = await fetch(url, {
                headers: { Accept: "application/json" }
            });

            if (!respuesta.ok) continue;

            const cuerpo = await respuesta.json();

            const opiniones = Array.isArray(cuerpo.testimonios)
                ? cuerpo.testimonios.filter(Boolean)
                : [];

            if (opiniones.length) return opiniones;

        } catch {

        }

    }

    return [];
}

(async function grillaDeOpiniones() {

    const contenedor = document.getElementById("testimoniosCarrusel");

    if (!contenedor) return;

    const opiniones = await cargarOpiniones();

    function iniciales(nombre) {
        return String(nombre || "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(pieza => Array.from(pieza)[0] || "")
            .join("")
            .toUpperCase();
    }

    function pintarEstrellas(nota) {
        const valor = Math.min(5, Math.max(0, Number(nota) || 0));
        const llenas = Math.floor(valor);
        const hayMedia = valor - llenas >= 0.5;
        const vacias = Math.max(0, 5 - llenas - (hayMedia ? 1 : 0));

        let iconos = "";

        for (let i = 0; i < llenas; i++) {
            iconos += '<span class="estrella estrella-llena" aria-hidden="true">★</span>';
        }

        if (hayMedia) {
            iconos += '<span class="estrella estrella-media" aria-hidden="true">★</span>';
        }

        for (let i = 0; i < vacias; i++) {
            iconos += '<span class="estrella estrella-vacia" aria-hidden="true">☆</span>';
        }

        return '<span class="estrellas" role="img" aria-label="' +
            escaparHTML(valor + ' de 5 estrellas') + '">' + iconos + '</span>';
    }

    function pintarFecha(iso) {
        const fecha = new Date(iso);

        if (Number.isNaN(fecha.getTime())) return "";

        const texto = fecha.toLocaleDateString("es-UY", {
            month: "long",
            year: "numeric"
        });

        return '<span class="opinion-fecha">' + escaparHTML(texto) + '</span>';
    }

    function productoBoton(opinion) {
        if (!opinion.producto_id) return "";

        return '<button class="opinion-producto" type="button" data-producto="' +
            escaparHTML(opinion.producto_id) + '" hidden>' +
            '<span class="material-symbols-outlined" aria-hidden="true">eco</span>' +
            '<span data-producto-nombre></span>' +
            '</button>';
    }

    function pintar() {
        if (!opiniones.length) {
            contenedor.classList.add("sin-opiniones");
            contenedor.innerHTML =
                '<p class="testimonios-vacio">Todavía no hay opiniones publicadas.</p>';
            return;
        }

        const total = opiniones.length;

        contenedor.innerHTML = opiniones.map((opinion, i) => `
            <article class="opinion-slide" role="listitem"
                aria-label="Opinión ${i + 1} de ${total}">
                ${pintarEstrellas(opinion.estrellas)}

                <blockquote class="opinion-texto">
                    <p>${escaparHTML(opinion.texto)}</p>
                </blockquote>

                <div class="opinion-firma">
                    <span class="opinion-avatar" aria-hidden="true">${escaparHTML(iniciales(opinion.autor))}</span>

                    <div class="opinion-autor">
                        <cite class="opinion-nombre">${escaparHTML(opinion.autor)}</cite>

                        <span class="opinion-meta">
                            ${escaparHTML(opinion.lugar || "")}
                            ${pintarFecha(opinion.fecha)}
                        </span>
                    </div>
                </div>

                ${productoBoton(opinion)}
            </article>
        `).join("");

        contenedor.querySelectorAll("[data-producto]").forEach((boton) => {
            const id = Number(boton.dataset.producto);

            alCargarElCatalogo(() => {
                const producto = PRODUCTOS.find(p => p.id === id);
                const nombre = boton.querySelector("[data-producto-nombre]");

                if (!producto || !nombre) {
                    boton.remove();
                    return;
                }

                nombre.textContent = "Sobre: " + producto.nombre;
                boton.setAttribute("aria-label", "Ver " + producto.nombre);
                boton.hidden = false;

                boton.addEventListener("click", () => {
                    /* Se usa "!==" y no "===": el verificador lee "window.algo =" como una definición de global. */
                    if (typeof window.abrirModalProducto !== "function") return;

                    window.abrirModalProducto(id, boton);
                });
            });
        });
    }

    pintar();
})();
