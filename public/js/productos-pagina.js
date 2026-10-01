'use strict';

/* ==========================================================
   PAGINA DE PRODUCTO
   ------------------------------------------------------------
   Esta pagina es HTML plano: el precio, la descripcion y las
   fotos ya estan escritos por tools/generar-productos.js, asi
   que se ven bien aunque el script no cargue. Acá solo esta lo
   que necesita JavaScript:

     - cambiar la foto grande al tocar una miniatura;
     - agregar al carrito.

   El carrito lo maneja productos.js, que se carga antes que
   este archivo: agregarProductoAlCarrito es una funcion global.
   Si ese script no estuviera, el boton se apaga en vez de
   romper la pagina.
   ========================================================== */

(function () {

    const principal = document.getElementById('fotoPrincipal');
    const miniaturas = document.querySelectorAll('.producto-miniatura');
    const boton = document.querySelector('.agregar');
    const aviso = document.querySelector('.producto-aviso');

    /* --- galeria --- */

    if (principal && miniaturas.length) {
        miniaturas.forEach(miniatura => {
            miniatura.addEventListener('click', function () {
                principal.src = miniatura.dataset.src;

                miniaturas.forEach(otra => otra.classList.remove('activa'));
                miniatura.classList.add('activa');
            });
        });
    }

    /* --- agregar al carrito --- */

    if (!boton) return;

    if (typeof agregarProductoAlCarrito !== 'function') {
        boton.disabled = true;
        boton.textContent = 'Carrito no disponible';
        return;
    }

    boton.addEventListener('click', function () {

        agregarProductoAlCarrito(boton.dataset.id);

        if (!aviso) return;

        aviso.textContent = 'Agregado al carrito.';
        aviso.classList.remove('error');

        /* El texto se borra solo para que el role="status" vuelva a
           anunciarlo la proxima vez que se toque el boton. */
        setTimeout(function () {
            aviso.textContent = '';
        }, 3000);

    });

})();
