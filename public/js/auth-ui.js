'use strict';
/* ============================================================
   ESTADO DE CUENTA · ZAPI
   ------------------------------------------------------------
   Le pregunta al servidor si hay sesión (GET /api/auth/yo) y
   marca el <html> con data-auth="si" o "no". El CSS usa ese
   atributo para mostrar el carrito y el bloque de cuenta solo
   cuando corresponde: mientras el estado no está resuelto, el
   carrito queda oculto (así no parpadea para nadie).

   Deja window.zapiAuth para el resto del sitio:
     listo            Promise que se resuelve al terminar la consulta
     usuario          { id, email, nombre } o null
     autenticado      booleano
     exigirCuenta()   si no hay cuenta, manda a login y devuelve false
     salir()          cierra la sesión, limpia el carrito local y
                      vuelve al inicio

   Va en archivo aparte para respetar la CSP (script-src 'self').
   ============================================================ */
(function () {

    /* A dónde volver después de entrar: la página actual con su
       búsqueda, para no perder el contexto (?seccion=...). */
    const volver = encodeURIComponent(window.location.pathname + window.location.search);

    let usuario = null;

    /* El botón Salir está en el markup de la cuenta; se engancha
       una sola vez, cuando ya existe. */
    function pintar() {
        document.documentElement.dataset.auth = usuario ? 'si' : 'no';

        const nombre = document.getElementById('navUsuarioNombre');
        if (nombre && usuario) nombre.textContent = 'Hola ' + usuario.nombre;

        const salir = document.getElementById('navSalir');
        if (salir) salir.addEventListener('click', window.zapiAuth.salir);
    }

    /* ============================================================
       MENU DE CUENTA
       ------------------------------------------------------------
       El nombre de usuario abre una ventanita con el carrito y
       Salir. Se cierra al elegir algo, al hacer clic fuera y con
       Escape. En index.html el carrito enruta con data-section y
       en catalogo.html es un enlace a carrito.html; la ventanita
       es la misma para los dos.
       ============================================================ */
    function prepararMenuDeCuenta() {
        const boton = document.getElementById('navUsuarioBoton');
        const menu = document.getElementById('navUsuarioMenu');

        if (!boton || !menu) return;

        let abierto = false;

        function abrir() {
            abierto = true;
            boton.setAttribute('aria-expanded', 'true');
            menu.hidden = false;
        }

        function cerrar() {
            if (!abierto) return;
            abierto = false;
            boton.setAttribute('aria-expanded', 'false');
            menu.hidden = true;
        }

        /* stopPropagation evita que el clic que abre caiga tambien
           en el listener del documento y lo cierre en el acto. */
        boton.addEventListener('click', function (evento) {
            evento.stopPropagation();
            if (abierto) cerrar();
            else abrir();
        });

        document.addEventListener('click', function (evento) {
            if (!abierto) return;
            if (!menu.contains(evento.target)) cerrar();
        });

        document.addEventListener('keydown', function (evento) {
            if (!abierto || evento.key !== 'Escape') return;
            cerrar();
            boton.focus({ preventScroll: true });
        });

        /* Al elegir el carrito o Salir la ventanita se cierra; el
           clic sigue de largo hacia su seccion o su enlace. */
        menu.addEventListener('click', cerrar);
    }

    /* Devuelve true si hay cuenta. Si no, manda al login con la
       página actual como destino y devuelve false, para que quien
       llama corte la acción (por ejemplo, agregar al carrito). */
    function exigirCuenta() {
        if (usuario) return true;

        window.location.href = '/login.html?volver=' + volver;

        return false;
    }

    async function salir() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
            /* Aunque falle la red, se sigue: abajo se limpia igual. */
        }

        try {
            window.localStorage.removeItem('zapiCart');
        } catch (error) {
            /* almacenamiento bloqueado o lleno */
        }

        window.location.href = '/';
    }

    const listo = fetch('/api/auth/yo', { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (datos) {
            usuario = datos && datos.usuario ? datos.usuario : null;
        })
        .catch(function () {
            usuario = null;
        })
        .then(function () {
            pintar();
            prepararMenuDeCuenta();
        });

    window.zapiAuth = {
        listo: listo,
        get usuario() { return usuario; },
        get autenticado() { return Boolean(usuario); },
        exigirCuenta: exigirCuenta,
        salir: salir,
    };

})();
