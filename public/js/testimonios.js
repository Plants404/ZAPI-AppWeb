/* ==========================================================
   TESTIMONIOS
   ------------------------------------------------------------
   Dibuja el carrusel de opiniones de la seccion de inicio.

   De donde salen los datos
   ------------------------
   Hoy salen de la constante OPINIONES de mas abajo, que hace de
   lista a mano. Todo lo demas vive alrededor de la forma de cada
   opinion, asi que conectar la API de Google despues no obliga a
   redibujar nada: alcanza con entregar la misma forma.

     { autor, lugar, texto, estrellas, fecha }

   Cuantas se ven a la vez
   -----------------------
   No hay un numero fijo aca: lo decide el CSS con --por-vista (3 en
   escritorio, 2 en tablet, 1 en celular) y el script lo lee. El
   avance es de a paginas completas, no de a opinion.

   Cuando se quiera conectar Google Places (o el widget de
   opiniones), el cambio es de donde salen los datos, no de como se
   muestran. Dos avisos utiles para cuando llegue ese momento:

   1. El fetch a la API de Google no puede hacerse desde el
      navegador: habria que escribir la clave en el HTML, y una CSP
      propia con connect-src 'self' bloquearia la llamada igual. Hay
      que pedir las opiniones a un endpoint propio (por ejemplo
      GET /api/testimonios) y que ese endpoint las pida con la
      clave, que nunca se escribe en el HTML.
   2. Google devuelve como mucho cinco opiniones por llamada y pide
      un maxReviewPerPage mayor que cinco; para ver mas hay que
      seguir el nextPageToken. Conviene guardar el resultado en el
      servidor para no gastar cuota en cada visita.

   La constante OPINIONES queda como respaldo: si la API todavia no
   esta conectada o falla, el carrusel se dibuja igual.

   OJO con estos textos
   -------------------
   Los de abajo son de ejemplo, para ver como queda la seccion: no
   son opiniones de clientes reales y no hay que publicarlos como si
   lo fueran. Cuando entren las de verdad (de Google o escritas a
   mano), se reemplazan estas por las nuevas y el resto no se toca.
   ========================================================== */

const OPINIONES = [
    {
        autor: "María Gómez",
        lugar: "Montevideo",
        texto: "Compré dos aromáticas para la cocina y llegaron sanas y con la guía de cuidados. A las dos semanas ya las estaba usando para las comidas.",
        estrellas: 5,
        fecha: "2026-08-14"
    },
    {
        autor: "Diego Fernández",
        lugar: "Ciudad de la Costa",
        texto: "Nos hicieron el diseño de la huerta del colegio. El equipo entendió lo que necesitan los chicos y nos dejaron claro cómo seguir con el mantenimiento.",
        estrellas: 5,
        fecha: "2026-07-02"
    },
    {
        autor: "Lucía Sánchez",
        lugar: "Punta del Este",
        texto: "Me tasteó y por eso sigo comprando. Los precios del catálogo son fijos hasta que se avisa, y siempre avisan antes de cambiar algo.",
        estrellas: 4,
        fecha: "2026-06-21"
    },
    {
        autor: "Andrés Pérez",
        lugar: "Salto",
        texto: "Encargamos el mantenimiento de un patio chico. Es un trabajo prolijo, ordenado y se nota el cambio en el estado de las plantas.",
        estrellas: 4.5,
        fecha: "2026-05-30"
    },
    {
        autor: "Familia Bentancor",
        lugar: "Canelones",
        texto: "Pedimos la huerta familiar completa y nos explican cada paso. Después de un mes ya estábamos comiendo de lo que sembramos.",
        estrellas: 5,
        fecha: "2026-05-11"
    }
];

/* Cada cuanto avanza solo, en milisegundos. Con un solo testimonio
   no hay carrusel que avance, asi que el tiempo no se usa. */
const OPINIONES_INTERVALO = 7000;

/* Cuanto tiene que moverse el dedo para que cuente como deslizar, en
   pixeles. 40 es un recorrido corto y a proposito, para no cambiar de
   opinion con un temblor de la mano. */
const OPINIONES_DESLIZAR = 40;

(function carruselDeOpiniones() {

    const contenedor = document.getElementById("testimoniosCarrusel");

    /* Esta seccion solo existe en index.html. En catalogo.html y en
       carrito.html no hay nada que dibujar, y el script se sale
       derecho sin tirar error. */
    if (!contenedor) return;

    const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

    const opiniones = OPINIONES.filter(Boolean);

    let indice = 0;
    let temporizador = null;
    let pausado = false;
    let arrastrando = false;
    let movio = false;
    let inicioX = 0;

    let pista = null;
    let btnAnterior = null;
    let btnSiguiente = null;
    let puntos = null;
    let contador = null;
    let anuncio = null;
    let slides = [];

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

    /* ------------------------------------------------------------
       Cuantas se ven a la vez
       ------------------------------------------------------------ */

    /* El numero de opiniones por vista vive en el CSS (--por-vista)
       y se lee de ahi en vez de repetirlo en el JS: si el ancho de la
       tarjeta cambia en un breakpoint, el script se entera solo y no
       pueden quedar desincronizados. */
    function porVista() {
        const valor = parseInt(
            getComputedStyle(contenedor).getPropertyValue("--por-vista"),
            10
        );

        return Number.isFinite(valor) && valor > 0 ? valor : 1;
    }

    /* El carrusel avanza de a paginas completas, no de a opinion.
       Con 5 opiniones y 3 por vista son 2 paginas: la primera con
       tres y la segunda con las dos que quedan. La ultima pagina
       puede quedar con huecos, que es lo esperable: mejor un hueco
       que repetir opiniones. */
    function totalPaginas() {
        return Math.max(1, Math.ceil(opiniones.length / porVista()));
    }

    /* Rango de opiniones de una pagina, para el contador y para
       saber cuales quedan fuera de la vista. */
    function rangoDe(pagina) {
        const porPagina = porVista();
        const desde = pagina * porPagina;

        return {
            desde: desde,
            hasta: Math.min(opiniones.length, desde + porPagina)
        };
    }

    /* Los controles solo se muestran si hay algo para ir. Con dos
       opiniones en pantalla ancha entran las dos y no hay nada que
       mover, pero al achicar la ventana pasa a haber dos paginas y
       los controles tienen que aparecer: por eso la clase se recalcula
       en cada reajuste y no se decide una sola vez. */
    function actualizarControles() {
        contenedor.classList.toggle("sin-paginacion", totalPaginas() <= 1);
    }

    /* Un punto por pagina, no por opinion: con cinco opiniones y tres
       por vista los puntos son dos. Un punto por opinion dejaria
       puntos que nunca se pueden activar. */
    function pintarPuntos() {
        if (!puntos) return;

        const total = opiniones.length;
        const paginas = totalPaginas();

        puntos.innerHTML = Array.from({ length: paginas }, (_, i) => {
            const rango = rangoDe(i);
            const etiqueta = rango.hasta - rango.desde === 1
                ? "Ver la opinión " + (rango.desde + 1)
                : "Ver las opiniones " + (rango.desde + 1) + " a " + rango.hasta;

            return '<button class="opinion-punto" type="button" data-ir="' + i +
                '" aria-label="' + escaparHTML(etiqueta + " de " + total) + '"></button>';
        }).join("");

        actualizarControles();
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

        /* Con una sola opinion no hay a donde ir: se sacan los
           controles y el avance automatico. Lo decide
           actualizarControles(), que mira cuantas paginas hay y no
           cuantas opiniones. */
        const total = opiniones.length;

        const slidesHtml = opiniones.map((opinion, i) => `
            <article class="opinion-slide" role="group" aria-roledescription="diapositiva"
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
            </article>
        `).join("");

        /* Los controles se dibujan siempre y se ocultan por CSS con
           .sin-paginacion: si se dejaran fuera del markup, al
           achicar la ventana para aparecer de nuevo habria que
           rehacer el HTML entero. */
        const controlesHtml = `
            <div class="opinion-controles">
                <button class="opinion-flecha" type="button" data-anterior aria-label="Opiniones anteriores">
                    <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                </button>

                <div class="opinion-puntos" data-puntos role="group" aria-label="Ir a un grupo de opiniones"></div>

                <button class="opinion-flecha" type="button" data-siguiente aria-label="Opiniones siguientes">
                    <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
            </div>

            <p class="opinion-contador" data-contador></p>
        `;

        contenedor.innerHTML =
            '<div class="opinion-carrusel" data-carrusel>' +
            '<div class="opinion-pista" data-pista>' + slidesHtml + '</div>' +
            controlesHtml +
            '<p class="visually-hidden" data-anuncio role="status" aria-live="polite"></p>' +
            '</div>';

        pista = contenedor.querySelector("[data-pista]");
        btnAnterior = contenedor.querySelector("[data-anterior]");
        btnSiguiente = contenedor.querySelector("[data-siguiente]");
        puntos = contenedor.querySelector("[data-puntos]");
        contador = contenedor.querySelector("[data-contador]");
        anuncio = contenedor.querySelector("[data-anuncio]");
        slides = Array.from(contenedor.querySelectorAll(".opinion-slide"));

        if (puntos) {
            puntos.addEventListener("click", (evento) => {
                const punto = evento.target.closest("[data-ir]");

                if (!punto) return;

                irA(Number(punto.dataset.ir));
            });
        }

        pintarPuntos();
        mostrar(0);
        programar();
    }

    /* ------------------------------------------------------------
       Movimiento
       ------------------------------------------------------------ */

    /* Va a la pagina pedida. El aviso al lector de pantalla se
       escribe solo cuando el cambio lo pidió la persona: si se
       anunciara en cada avance automatico, cada siete segundos se
       cortaria lo que esta leyendo. */
    function mostrar(nuevo, anunciar = false) {
        const paginas = totalPaginas();

        indice = (nuevo + paginas) % paginas;

        const rango = rangoDe(indice);

        if (pista) {
            /* El CSS multiplica --indice por el ancho de una pagina
               (100% + el hueco), asi que aca solo se pasa el numero
               de pagina. El ancho de la tarjeta no se calcula en el
               JS justamente para que no haya dos lugares que
               puedan desincronizarse. */
            pista.style.setProperty("--indice", indice);
        }

        slides.forEach((slide, i) => {
            const visible = i >= rango.desde && i < rango.hasta;

            slide.classList.toggle("activa", visible);

            /* Las que no se ven quedan fuera del arbol accesible. No
               hay nada enfocable adentro, asi que con esto el lector
               de pantalla lee las de la pagina que se esta mirando en
               vez de todas. */
            if (visible) {
                slide.removeAttribute("aria-hidden");
            } else {
                slide.setAttribute("aria-hidden", "true");
            }
        });

        if (puntos) {
            puntos.querySelectorAll("[data-ir]").forEach((punto, i) => {
                const activo = i === indice;

                punto.classList.toggle("activa", activo);

                if (activo) {
                    punto.setAttribute("aria-current", "true");
                } else {
                    punto.removeAttribute("aria-current");
                }
            });
        }

        if (contador) {
            /* Con una sola opinion por pagina alcanza con "2 de 5";
               con varias se ve el tramo: "1-3 de 5". */
            contador.textContent = rango.hasta - rango.desde === 1
                ? (rango.desde + 1) + " de " + opiniones.length
                : (rango.desde + 1) + "-" + rango.hasta + " de " + opiniones.length;
        }

        if (anunciar && anuncio) {
            const texto = rango.hasta - rango.desde === 1
                ? "Opinión " + (rango.desde + 1) + " de " + opiniones.length
                : "Opiniones " + (rango.desde + 1) + " a " + rango.hasta +
                  " de " + opiniones.length;

            anuncio.textContent = texto + ": " +
                opiniones.slice(rango.desde, rango.hasta)
                    .map(opinion => opinion.autor).join(", ");
        }
    }

    /* Ir a un punto concreto o mover el carrusel con los botones
       reinicia el avance automatico: si no, el temporizador antiguo
       podria hacer saltar la pagina a mitad de la lectura. */
    function irA(nuevo) {
        if (nuevo === indice) return;

        mostrar(nuevo, true);
        programar();
    }

    function anterior() {
        mostrar(indice - 1, true);
        programar();
    }

    function siguiente() {
        mostrar(indice + 1, true);
        programar();
    }

    /* Cuando el ancho de la ventana cruza un breakpoint cambia
       cuantas opiniones entran por pagina, y con eso la cantidad de
       paginas: hay que rehacer los puntos, recalcular el indice y
       volver a esconder los controles si quedo una sola pagina. */
    function reajustar() {
        pintarPuntos();
        mostrar(Math.min(indice, totalPaginas() - 1));
        programar();
    }

    ["(min-width: 640px)", "(min-width: 1024px)"].forEach((consulta) => {
        const corte = window.matchMedia(consulta);

        if (corte.addEventListener) {
            corte.addEventListener("change", reajustar);
        } else if (corte.addListener) {
            corte.addListener(reajustar);
        }
    });

    /* ------------------------------------------------------------
       Arranque
       ------------------------------------------------------------ */

    /* Pintar va aca y no al final del script a proposito: las
       flechas, los puntos y la pista se buscaran recien despues, y
       si se pintara al final estos escuchantes se engancharian a
       null (los controles todavia no existirian) y las flechas y el
       deslizar se quedarian sin funcionar. Solo los puntos
       funcionarian, porque su escuchante se registra dentro de
       pintar. */
    pintar();

    /* ------------------------------------------------------------
       Avance automatico
       ------------------------------------------------------------ */

    /* Con una sola pagina no hay nada que ir girando, y con
       reduced-motion el avance automatico esta descartado: es
       movimiento que la persona pidio expresamente no ver. */
    function puedeGirar() {
        return totalPaginas() > 1 && !menosMovimiento.matches && !document.hidden;
    }

    function programar() {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }

        if (pausado || !puedeGirar()) return;

        /* El avance automatico salta de pagina, no de opinion: con tres a
       la vez, cambiar de a una se veria raro. */
        temporizador = setInterval(() => mostrar(indice + 1), OPINIONES_INTERVALO);
    }

    /* Mientras el puntero esta encima o el foco esta adentro, el
       carrusel se queda quieto: nadie quiere que le cambie la
       opinion que esta leyendo. Al salir, vuelve a arrancar. */
    contenedor.addEventListener("mouseenter", () => {
        pausado = true;
        programar();
    });

    contenedor.addEventListener("mouseleave", () => {
        pausado = false;
        programar();
    });

    contenedor.addEventListener("focusin", () => {
        pausado = true;
        programar();
    });

    contenedor.addEventListener("focusout", (evento) => {
        /* Moving the focus from one control to another inside the
           carousel fires focusout and focusin. Without this check
           the carousel would resume for the microsecond in
           between. relatedTarget is where the focus is going. */
        if (evento.relatedTarget && contenedor.contains(evento.relatedTarget)) return;

        pausado = false;
        programar();
    });

    /* Si la preferencia de movimiento cambia con la pagina abierta,
       el carrusel lo tiene que notar: mirar la basta al cargar
       deja el intervalo corriendo. */
    if (menosMovimiento.addEventListener) {
        menosMovimiento.addEventListener("change", programar);
    } else if (menosMovimiento.addListener) {
        menosMovimiento.addListener(programar);
    }

    /* Cambiar de pestaña con el cursor encima del carrusel detiene el
       avance: si no, el temporizador sigue gastando cambios en una
       pestaña que nadie esta mirando. */
    document.addEventListener("visibilitychange", programar);

    /* ------------------------------------------------------------
       Botones y teclado
       ------------------------------------------------------------ */

    if (btnAnterior) {
        btnAnterior.addEventListener("click", anterior);
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", siguiente);
    }

    /* Las flechas cambian de pagina, pero solo con el foco dentro
       del carrusel: con el foco en el buscador del header, las
       flechas tienen que seguir sirviendo para otra cosa. */
    contenedor.addEventListener("keydown", (evento) => {
        if (evento.key === "ArrowLeft") {
            evento.preventDefault();
            anterior();
        } else if (evento.key === "ArrowRight") {
            evento.preventDefault();
            siguiente();
        }
    });

    /* ------------------------------------------------------------
       Gesto de deslizar
       ------------------------------------------------------------ */

    /* Los escuchantes van en la pista y no en el carrusel entero,
       para que el click de los botones y de los puntos no cuente
       como arrastre. Los pointer events cubren el dedo y el mouse
       con el mismo codigo. */
    if (pista) {
        pista.addEventListener("pointerdown", (evento) => {
            arrastrando = true;
            movio = false;
            inicioX = evento.clientX;

            pista.classList.add("deslizando");
        });

        pista.addEventListener("pointermove", (evento) => {
            if (!arrastrando) return;

            if (Math.abs(evento.clientX - inicioX) > OPINIONES_DESLIZAR) {
                movio = true;
            }
        });

        const soltar = (evento) => {
            if (!arrastrando) return;

            arrastrando = false;
            pista.classList.remove("deslizando");

            if (!movio) return;

            if (evento.clientX < inicioX) {
                siguiente();
            } else {
                anterior();
            }
        };

        pista.addEventListener("pointerup", soltar);
        pista.addEventListener("pointercancel", soltar);
    }
})();