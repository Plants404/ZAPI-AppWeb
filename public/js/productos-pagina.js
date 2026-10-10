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
   este archivo. Si ese script no estuviera, el boton se apaga en
   vez de romper la pagina.
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

                miniaturas.forEach((otra) => otra.classList.remove('activa'));
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

    /* El boton espera al catalogo antes de habilitarse.

       agregarProductoAlCarrito busca el producto por id dentro de
       PRODUCTOS para saber el nombre, el precio y la foto. Con el
       catalogo en un fetch, esa lista esta vacia hasta que baja el
       JSON, y una funcion que existe no dice si el catalogo llego.
       El guard de arriba, que mira que exista la funcion, ya no
       alcanza: pasaria y el click caeria en un return sin efecto,
       con el boton aparentemente vivo y sin pasar nada.

       Asi que se apaga hasta que alCargarElCatalogo lo vuelva a
       prender, y si el catalogo no llega nunca, alCargarElCatalogo
       no corre y el boton queda apagado: es preferible un boton
       deshabilitado a uno que no hace nada. */
    boton.disabled = true;

    alCargarElCatalogo(function () {
        boton.disabled = false;
    });

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
