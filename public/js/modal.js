const modalProducto = document.getElementById("modalProducto");

if (modalProducto) {

    const modalCaja = modalProducto.querySelector(".modal-caja");
    const modalCarrusel = document.getElementById("modalCarrusel");
    const carruselImg = document.getElementById("carruselImg");
    const carruselContador = document.getElementById("carruselContador");
    const carruselMiniaturas = document.getElementById("carruselMiniaturas");
    const modalAgregar = document.getElementById("modalAgregar");

    const modalCategoria = document.getElementById("modalCategoria");
    const modalTitulo = document.getElementById("modalTitulo");
    const modalDescripcion = document.getElementById("modalDescripcion");
    const modalPrecio = document.getElementById("modalPrecio");
    const modalStock = document.getElementById("modalStock");
    const modalInfo = document.getElementById("modalInfo");
    const modalFicha = document.getElementById("modalFicha");

    const btnCerrar = modalProducto.querySelectorAll("[data-cerrar-modal]");
    const btnPrev = modalProducto.querySelector(".carrusel-prev");
    const btnNext = modalProducto.querySelector(".carrusel-next");

    let galeriaActual = [];
    let indiceActual = 0;
    let productoAbierto = null;
    let tarjetaQueAbrio = null;
    let scrollBloqueado = false;

    /* Mismo criterio de slug que tools/generar-productos.js: deben coincidir. */
    function slugDe(texto) {
        return String(texto)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }


    function fotosDe(producto) {

        if (Array.isArray(producto.imagenes) && producto.imagenes.length) {

            return producto.imagenes;

        }

        return [producto.imagen];

    }

    function mostrarFoto(indice) {

        const total = galeriaActual.length;

        indiceActual = (indice + total) % total;

        carruselImg.src = galeriaActual[indiceActual];
        carruselImg.alt = `${productoAbierto.nombre}, foto ${indiceActual + 1} de ${total}`;

        if (total > 1) {

            carruselContador.textContent = `${indiceActual + 1} / ${total}`;

        }

        const miniaturas = carruselMiniaturas.querySelectorAll(".carrusel-miniatura");

        miniaturas.forEach((miniatura, i) => {

            const activa = i === indiceActual;

            miniatura.classList.toggle("activa", activa);
            miniatura.setAttribute("aria-current", activa ? "true" : "false");

        });

        if (total > 1) {

            [indiceActual - 1, indiceActual + 1].forEach(vecina => {

                const indice = (vecina + total) % total;
                const previa = new Image();
                previa.src = galeriaActual[indice];

            });

        }

    }

    function abrirModalProducto(id, tarjeta) {

        const producto = PRODUCTOS.find(p => p.id == id);

        if (!producto) return;

        productoAbierto = producto;
        tarjetaQueAbrio = tarjeta || null;
        galeriaActual = fotosDe(producto);

        modalCategoria.textContent = producto.categoria;
        modalTitulo.textContent = producto.nombre;
        modalDescripcion.textContent = producto.descripcion;
        modalPrecio.textContent = formatearPrecio(
            precios[producto.id] || producto.precioBase
        );

        if (modalStock) {
            modalStock.dataset.stock = producto.id;
            pintarStockDe(modalStock);
        }

        modalInfo.innerHTML = producto.infoDeVenta.map(item => `
            <li>
                <span class="material-symbols-outlined">check_circle</span>
                <span>${escaparHTML(item)}</span>
            </li>
        `).join("");

        modalAgregar.dataset.id = producto.id;
        modalAgregar.classList.remove("added");
        modalAgregar.innerHTML =
            `<span class="material-symbols-outlined">add_shopping_cart</span> Agregar al carrito`;

        if (modalFicha) {
            modalFicha.textContent = "Ver la ficha completa";
            modalFicha.href = "productos/" + slugDe(producto.nombre) + ".html";
            modalFicha.hidden = false;
        }

        modalCarrusel.classList.toggle("sin-carrusel", galeriaActual.length < 2);

        if (galeriaActual.length > 1) {

            carruselMiniaturas.innerHTML = galeriaActual.map((src, i) => `
                <button class="carrusel-miniatura" type="button" data-indice="${i}"
                    aria-label="Ver foto ${i + 1} de ${galeriaActual.length}">
                    <img src="${escaparHTML(src)}" alt="" loading="lazy">
                </button>
            `).join("");

        } else {

            carruselMiniaturas.innerHTML = "";

        }

        mostrarFoto(0);

        modalProducto.hidden = false;

        /* Reabrir dentro de los 250 ms del cierre: limpiar "cerrando" o la modal queda muerta al click. */
        modalProducto.classList.remove("cerrando");

        bloquearScroll(true);

        /* El reflow es síncrono y evita que el rAF se saltee el fade. */

        void modalProducto.offsetWidth;

        modalProducto.classList.add("abierto");

        modalCaja.scrollTop = 0;

        modalCaja.focus();

    }

    function cerrarModalProducto() {

        if (modalProducto.hidden) return;

        modalProducto.classList.remove("abierto");
        modalProducto.classList.add("cerrando");
        bloquearScroll(false);

        productoAbierto = null;
        galeriaActual = [];
        carruselImg.removeAttribute("src");

        setTimeout(() => {

            if (!modalProducto.classList.contains("abierto")) {

                modalProducto.hidden = true;
                modalProducto.classList.remove("cerrando");

            }

        }, 250);

        if (tarjetaQueAbrio) {

            tarjetaQueAbrio.focus();
            tarjetaQueAbrio = null;

        }

    }

    function bloquearScroll(bloquear) {

        if (bloquear) {

            const barra = window.innerWidth - document.documentElement.clientWidth;

            document.body.style.paddingRight = barra > 0 ? `${barra}px` : "";
            document.body.classList.add("modal-abierto");
            scrollBloqueado = true;

        } else if (scrollBloqueado) {

            document.body.classList.remove("modal-abierto");
            document.body.style.paddingRight = "";
            scrollBloqueado = false;

        }

    }

    function atraparFoco(evento) {

        if (evento.key !== "Tab") return;

        const focuses = Array.from(
            modalCaja.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")
        ).filter(elemento => elemento.getClientRects().length > 0);

        if (!focuses.length) return;

        const primero = focuses[0];
        const ultimo = focuses[focuses.length - 1];

        /* Con Shift+Tab el foco puede estar en el contenedor, no en un extremo: se compara contra el borde. */
        if (evento.shiftKey) {

            const enBorde = document.activeElement === primero ||
                document.activeElement === modalCaja ||
                !focoDentroDeModal();

            if (enBorde) {

                evento.preventDefault();
                ultimo.focus();

            }

        } else if (document.activeElement === ultimo || !focoDentroDeModal()) {

            evento.preventDefault();
            primero.focus();

        }

    }

    function focoDentroDeModal() {

        return modalCaja.contains(document.activeElement);

    }

    function agregarDesdeModal() {

        const id = Number(modalAgregar.dataset.id);

        if (!id) return;

        document.dispatchEvent(new CustomEvent("modal:agregar", {
            detail: { id }
        }));

        modalAgregar.classList.add("added");

        modalAgregar.innerHTML =
            `<span class="material-symbols-outlined">check</span> ¡Agregado!`;

        setTimeout(() => {

            modalAgregar.classList.remove("added");
            modalAgregar.innerHTML =
                `<span class="material-symbols-outlined">add_shopping_cart</span> Agregar al carrito`;

        }, 1400);

    }


    btnPrev.addEventListener("click", () => mostrarFoto(indiceActual - 1));
    btnNext.addEventListener("click", () => mostrarFoto(indiceActual + 1));

    carruselMiniaturas.addEventListener("click", function (event) {

        const miniatura = event.target.closest(".carrusel-miniatura");

        if (miniatura) mostrarFoto(Number(miniatura.dataset.indice));

    });

    btnCerrar.forEach(boton => boton.addEventListener("click", cerrarModalProducto));

    modalAgregar.addEventListener("click", agregarDesdeModal);


    document.addEventListener("keydown", function (event) {

        if (modalProducto.hidden) return;

        if (event.key === "Escape") {

            event.preventDefault();
            cerrarModalProducto();
            return;

        }

        if (event.key === "Tab") {

            atraparFoco(event);
            return;

        }

        if (galeriaActual.length > 1) {

            if (event.key === "ArrowLeft") {

                event.preventDefault();
                mostrarFoto(indiceActual - 1);

            }

            if (event.key === "ArrowRight") {

                event.preventDefault();
                mostrarFoto(indiceActual + 1);

            }

        }

    });


    window.abrirModalProducto = abrirModalProducto;
    window.cerrarModalProducto = cerrarModalProducto;

}
