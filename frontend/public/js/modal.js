'use strict';

/* Ficha rápida de producto. El modal es compartido por todas las
   páginas, así que vive una sola vez en la plantilla y este script se
   encarga de llenarlo. Los clics de las tarjetas y de los botones
   "Agregar" se atienden por delegación: no hace falta enganchar cada
   tarjeta recién dibujada. */

const modalProducto = document.getElementById("modalProducto");

let productoDelModal = null;
let galeriaDelModal = [];
let indiceDeLaGaleria = 0;
let disparadorDelModal = null;

function fotoConRaiz(foto) {
    return rutaConRaiz(foto);
}

function mostrarFotoDelModal(indice) {
    const total = galeriaDelModal.length;

    if (!total) return;

    indiceDeLaGaleria = (indice + total) % total;

    const foto = galeriaDelModal[indiceDeLaGaleria];
    const imagen = document.getElementById("carruselImg");
    const contador = document.getElementById("carruselContador");

    imagen.src = fotoConRaiz(foto);
    imagen.alt = productoDelModal.nombre + ", foto " + (indiceDeLaGaleria + 1) + " de " + total;

    if (contador) {
        contador.textContent = total > 1 ? (indiceDeLaGaleria + 1) + " / " + total : "";
    }

    document.querySelectorAll("#carruselMiniaturas .carrusel-miniatura").forEach((miniatura, posicion) => {
        const activa = posicion === indiceDeLaGaleria;

        miniatura.classList.toggle("activa", activa);
        miniatura.setAttribute("aria-current", activa ? "true" : "false");
    });
}

function pintarGaleriaDelModal(producto) {
    const miniaturas = document.getElementById("carruselMiniaturas");

    galeriaDelModal = producto.imagenes.length ? producto.imagenes.slice() : [producto.imagen];
    miniaturas.innerHTML = galeriaDelModal.map((foto, indice) => `
        <button class="carrusel-miniatura" type="button" data-indice="${indice}" aria-label="Ver foto ${indice + 1} de ${galeriaDelModal.length}">
            <img src="${fotoConRaiz(foto)}" alt="" loading="lazy">
        </button>`).join("");

    mostrarFotoDelModal(0);
}

function abrirModalProducto(id, disparador) {
    const producto = obtenerProducto(id);

    if (!producto || !modalProducto) return;

    productoDelModal = producto;
    disparadorDelModal = disparador || null;

    document.getElementById("modalCategoria").textContent = producto.categoria;
    document.getElementById("modalTitulo").textContent = producto.nombre;
    document.getElementById("modalDescripcion").textContent = producto.descripcion;
    document.getElementById("modalPrecio").textContent = formatearPrecio(producto.precioBase);

    const stock = document.getElementById("modalStock");
    stock.textContent = textoDeStock(unidadesDe(producto.id));
    stock.className = "stock " + claseDeStock(unidadesDe(producto.id));

    document.getElementById("modalInfo").innerHTML = producto.infoDeVenta
        .map(item => `<li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>${escaparHTML(item)}</span></li>`)
        .join("");

    const agregar = document.getElementById("modalAgregar");
    const agotado = unidadesDe(producto.id) === 0;

    agregar.dataset.id = String(producto.id);
    agregar.disabled = agotado;
    agregar.innerHTML = agotado
        ? '<span class="material-symbols-outlined" aria-hidden="true">block</span> Sin stock'
        : '<span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito';

    const ficha = document.getElementById("modalFicha");

    ficha.href = rutaFicha(producto, raizDelSitio());
    ficha.hidden = false;

    pintarGaleriaDelModal(producto);

    if (!modalProducto.open) {
        modalProducto.showModal();
        bloquearScroll(true);
    }

    modalProducto.querySelector(".modal-caja").scrollTop = 0;
}

function cerrarModalProducto() {
    if (!modalProducto || !modalProducto.open) return;

    modalProducto.close();
}

function agregarDesdeElModal() {
    const boton = document.getElementById("modalAgregar");
    const id = Number(boton.dataset.id);
    const producto = obtenerProducto(id);

    if (!producto || !agregarProductoAlCarrito(id)) {
        mostrarAviso("Sin stock", "No quedan más unidades de este producto.");
        return;
    }

    avisarAgregado(boton, producto);
}

function avisarAgregado(boton, producto) {
    const contenidoOriginal = boton.innerHTML;

    boton.classList.add("agregado");
    boton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check</span> ¡Agregado!';

    window.clearTimeout(boton.dataset.reloj);

    const reloj = window.setTimeout(() => {
        boton.classList.remove("agregado");
        boton.innerHTML = contenidoOriginal;
        delete boton.dataset.reloj;
    }, 1400);

    boton.dataset.reloj = String(reloj);

    if (producto) {
        mostrarAviso("Agregado al carrito", producto.nombre + " ya está en tu pedido.");
    }
}

if (modalProducto) {
    const caja = modalProducto.querySelector(".modal-caja");
    const miniaturas = document.getElementById("carruselMiniaturas");

    modalProducto.querySelectorAll("[data-cerrar-modal]").forEach(boton => {
        boton.addEventListener("click", cerrarModalProducto);
    });

    modalProducto.addEventListener("close", () => {
        bloquearScroll(false);
        productoDelModal = null;
        galeriaDelModal = [];

        if (disparadorDelModal && disparadorDelModal.isConnected) disparadorDelModal.focus();
        disparadorDelModal = null;
    });

    modalProducto.addEventListener("click", evento => {
        if (evento.target === modalProducto || evento.target === caja) cerrarModalProducto();
    });

    modalProducto.querySelector(".carrusel-prev").addEventListener("click", () => mostrarFotoDelModal(indiceDeLaGaleria - 1));
    modalProducto.querySelector(".carrusel-next").addEventListener("click", () => mostrarFotoDelModal(indiceDeLaGaleria + 1));

    miniaturas.addEventListener("click", evento => {
        const miniatura = evento.target.closest(".carrusel-miniatura");
        if (miniatura) mostrarFotoDelModal(Number(miniatura.dataset.indice));
    });

    document.getElementById("modalAgregar").addEventListener("click", agregarDesdeElModal);

    modalProducto.addEventListener("keydown", evento => {
        if (galeriaDelModal.length < 2) return;

        if (evento.key === "ArrowLeft") {
            evento.preventDefault();
            mostrarFotoDelModal(indiceDeLaGaleria - 1);
        }

        if (evento.key === "ArrowRight") {
            evento.preventDefault();
            mostrarFotoDelModal(indiceDeLaGaleria + 1);
        }
    });
}

document.addEventListener("click", evento => {
    const abrir = evento.target.closest("[data-abrir-producto]");

    if (abrir) {
        evento.preventDefault();
        abrirModalProducto(Number(abrir.dataset.abrirProducto), abrir);
        return;
    }

    const agregar = evento.target.closest("[data-agregar-producto]");

    if (!agregar || agregar.closest(".modal-producto")) return;

    evento.preventDefault();

    const producto = obtenerProducto(agregar.dataset.agregarProducto);

    if (!producto) return;

    if (!agregarProductoAlCarrito(producto.id)) {
        mostrarAviso("Sin stock", "No quedan más unidades de " + producto.nombre + ".");
        return;
    }

    avisarAgregado(agregar, producto);
});
