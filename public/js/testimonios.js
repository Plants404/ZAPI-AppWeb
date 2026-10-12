/* ==========================================================
   TESTIMONIOS
   ------------------------------------------------------------
   Dibuja las opiniones de la seccion de inicio en una grilla
   responsiva: se muestran TODAS a la vez, en una columna en el
   celular, dos en tablet y tres en escritorio. Cuantas entran por
   fila lo decide el CSS (ver styles.css), no este script.

   Antes esto era un carrusel que mostraba de a paginas y escondia el
   resto detras de flechas y puntos. Se saco: con pocas opiniones no
   valia la pena navegar para verlas.

   De donde salen los datos
   ------------------------
   De GET /api/testimonios, el endpoint propio: el servidor las
   tiene en la base y las sirve con esta forma. Si la API no esta
   levantada -el sitio servido estatico- o falla, se cae a
   public/data/testimonios.json, que es el mismo JSON del que
   siembra la API y sale de datos/testimonios.js con
   npm run generar:testimonios.

   Con las dos fuentes caidas la grilla muestra el estado vacio
   ("Todavia no hay opiniones publicadas") en vez de romperse: la
   home nunca queda dependiendo de que la API este arriba.

   La forma de cada opinion es la misma en las dos fuentes y la que
   ya usaba el bloque, asi que cambiar de fuente no obliga a
   redibujar nada:

     { autor, lugar, texto, estrellas, fecha, producto_id }

   producto_id es opcional: cuando viene, se dibuja una etiqueta
   "Sobre: <nombre>" que abre la ficha de ese producto. El nombre no
   viaja en la opinion: se busca en el catalogo ya cargado
   (PRODUCTOS), asi que si el producto no existe no se dibuja nada.

   Por que un endpoint propio y no la API de Google directo
   --------------------------------------------------------
   El fetch a la API de Google no puede hacerse desde el navegador:
   habria que escribir la clave en el HTML, y una CSP propia con
   connect-src 'self' bloquearia la llamada igual. Por eso las
   opiniones se piden a este endpoint, que seria quien las pida con
   la clave, que nunca se escribe en el HTML.

   Si algun dia la fuente pasa a ser Google Places, dos cosas a
   tener en cuenta: devuelve como mucho cinco opiniones por llamada
   y pide un maxReviewPerPage mayor que cinco; para ver mas hay que
   seguir el nextPageToken. Conviene guardar el resultado en el
   servidor para no gastar cuota en cada visita.
   ========================================================== */

/* Las fuentes, en orden: primero la API (opiniones vivas, de la
   base), despues el JSON versionado (el mismo que siembra la API).
   Se prueban de a una y se corta en la primera que traiga algo. */
const FUENTES_OPINIONES = [
    "/api/testimonios",
    "/public/data/testimonios.json"
];

/* Devuelve las opiniones de la primera fuente que responda, o una
   lista vacia si ninguna lo hace (la grilla muestra su estado
   vacio). Nunca tira: un fetch caido no puede dejar la home a
   medio dibujar. */
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

            /* Se prueba la siguiente fuente. */

        }

    }

    return [];
}

(async function grillaDeOpiniones() {

    const contenedor = document.getElementById("testimoniosCarrusel");

    /* Esta seccion solo existe en index.html. En catalogo.html y en
       carrito.html no hay nada que dibujar, y el script se sale
       derecho sin tirar error (y sin pedir la API al pedo). */
    if (!contenedor) return;

    /* Las opiniones se piden antes de dibujar: con la lista vacia
       pintar() muestra el estado vacio. */
    const opiniones = await cargarOpiniones();

    /* ------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------ */

    /* Las iniciales del avatar: primera letra del nombre y del
       apellido, como maximo. Con "Familia Bentancor" queda "FB". */
    function iniciales(nombre) {
        return String(nombre || "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(pieza => Array.from(pieza)[0] || "")
            .join("")
            .toUpperCase();
    }

    /* Se dibujan cinco estrellas: las llenas de la nota, una a media
       si la nota tiene decimal, y las vacias hasta completar las
       cinco. El ancho de la de media lo hace CSS con un degradado.

       El role="img" del contenedor hace que el lector de pantalla
       lea solo la nota y no cinco veces la palabra "estrella". */
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

    /* La fecha va como "agosto de 2026": el formato largo del
       navegador sale en ingles (Aug 14, 2026) y no va con un sitio
       en espanol. Si la fecha no existe o esta mal, se omite en vez
       de imprimir "Invalid Date". */
    function pintarFecha(iso) {
        const fecha = new Date(iso);

        if (Number.isNaN(fecha.getTime())) return "";

        const texto = fecha.toLocaleDateString("es-UY", {
            month: "long",
            year: "numeric"
        });

        return '<span class="opinion-fecha">' + escaparHTML(texto) + '</span>';
    }

    /* Si la opinion apunta a un producto, la etiqueta que abre su
       ficha. Arranca oculta y sin texto: el nombre se busca recien
       cuando el catalogo termino de bajar (ver engancharlo mas
       abajo), y si el id no existe la etiqueta se saca entera. Sin
       producto_id no se dibuja nada. */
    function productoBoton(opinion) {
        if (!opinion.producto_id) return "";

        return '<button class="opinion-producto" type="button" data-producto="' +
            escaparHTML(opinion.producto_id) + '" hidden>' +
            '<span class="material-symbols-outlined" aria-hidden="true">eco</span>' +
            '<span data-producto-nombre></span>' +
            '</button>';
    }

    /* ------------------------------------------------------------
       Markup
       ------------------------------------------------------------ */

    function pintar() {
        if (!opiniones.length) {
            contenedor.classList.add("sin-opiniones");
            contenedor.innerHTML =
                '<p class="testimonios-vacio">Todavía no hay opiniones publicadas.</p>';
            return;
        }

        const total = opiniones.length;

        /* La grilla es el propio contenedor: cada opinion es una
           tarjeta y el CSS decide cuantas entran por fila. El
           role="listitem" del article va con el role="list" que el
           contenedor trae del HTML. */
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

        /* Las etiquetas de producto: el nombre y el click recien
           cuando el catalogo este. Si el id no esta en el catalogo,
           la etiqueta se saca. abrirModalProducto es de modal.js y
           solo existe en las paginas que lo cargan (la home lo
           carga); si no esta, la etiqueta queda como texto sin
           accion. */
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
                    /* Se usa "!==" y no "===" a proposito: el
                       verificador busca "window.algo =" para saber
                       quien DEFINE un global, y un "===" despues del
                       nombre se lee como una definicion. */
                    if (typeof window.abrirModalProducto !== "function") return;

                    window.abrirModalProducto(id, boton);
                });
            });
        });
    }

    pintar();
})();
