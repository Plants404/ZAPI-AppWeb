'use strict';
(function () {

    const volver = encodeURIComponent(window.location.pathname + window.location.search);

    let usuario = null;

    function pintar() {
        document.documentElement.dataset.auth = usuario ? 'si' : 'no';

        const nombre = document.getElementById('navUsuarioNombre');
        if (nombre && usuario) nombre.textContent = 'Hola ' + usuario.nombre;

        const salir = document.getElementById('navSalir');
        if (salir) salir.addEventListener('click', window.zapiAuth.salir);
    }

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

        /* stopPropagation: evita que el clic que abre cierre la ventanita en el acto. */
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

        menu.addEventListener('click', cerrar);
    }

    function exigirCuenta() {
        if (usuario) return true;

        window.location.href = '/login.html?volver=' + volver;

        return false;
    }

    async function salir() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
        }

        try {
            window.localStorage.removeItem('zapiCart');
        } catch (error) {
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
