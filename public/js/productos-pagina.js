'use strict';

(function () {

    const principal = document.getElementById('fotoPrincipal');
    const miniaturas = document.querySelectorAll('.producto-miniatura');
    const boton = document.querySelector('.agregar');
    const aviso = document.querySelector('.producto-aviso');

    if (principal && miniaturas.length) {
        miniaturas.forEach(miniatura => {
            miniatura.addEventListener('click', function () {
                principal.src = miniatura.dataset.src;

                miniaturas.forEach((otra) => otra.classList.remove('activa'));
                miniatura.classList.add('activa');
            });
        });
    }

    if (!boton) return;

    if (typeof agregarProductoAlCarrito !== 'function') {
        boton.disabled = true;
        boton.textContent = 'Carrito no disponible';
        return;
    }

    /* Se apaga hasta que alCargarElCatalogo lo prenda: con el fetch, la función existe antes que los datos. */
    boton.disabled = true;

    alCargarElCatalogo(function () {
        boton.disabled = false;
    });

    boton.addEventListener('click', function () {

        agregarProductoAlCarrito(boton.dataset.id);

        if (!aviso) return;

        aviso.textContent = 'Agregado al carrito.';
        aviso.classList.remove('error');

        setTimeout(function () {
            aviso.textContent = '';
        }, 3000);

    });

})();
