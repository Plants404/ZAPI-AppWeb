'use strict';
(function () {

    let usuario = null;

    function pintar() {
        document.documentElement.dataset.cuentas = window.REQUIERE_CUENTA
            ? (usuario ? 'si' : 'no')
            : 'off';

        const nombre = document.getElementById('navUsuarioNombre');
        if (nombre && usuario) nombre.textContent = 'Hola ' + usuario.nombre;

        const nombreSheet = document.querySelector('.bottom-sheet-hola');
        if (nombreSheet && usuario) nombreSheet.textContent = 'Hola ' + usuario.nombre;

        const salir = document.getElementById('navSalir');
        if (salir) salir.addEventListener('click', window.zapiAuth.salir);
    }

    function prepararMenuDeCuenta() {
        if (!window.REQUIERE_CUENTA) return;

        const boton = document.getElementById('navUsuarioBoton');
        const menu = document.getElementById('navUsuarioMenu');

        if (!boton || !menu) return;

        /* En el drawer (mobile/tablet) el bloque de cuenta se muestra
           desplegado por defecto, para que Carrito y Mis pedidos queden
           visibles; en escritorio sigue siendo un menu desplegable. */
        const enDrawer = window.matchMedia('(max-width: 1023px)');

        let abierto = enDrawer.matches;

        function pintarEstado() {
            menu.hidden = !abierto;
            boton.setAttribute('aria-expanded', String(abierto));
        }

        function abrir() {
            abierto = true;
            pintarEstado();
        }

        function cerrar() {
            if (!abierto) return;
            abierto = false;
            pintarEstado();
        }

        /* stopPropagation: evita que el clic que abre cierre la ventanita en el acto. */
        boton.addEventListener('click', function (evento) {
            evento.stopPropagation();
            if (abierto) cerrar();
            else abrir();
        });

        document.addEventListener('click', function (evento) {
            if (!abierto) return;
            if (!menu.contains(evento.target) && evento.target !== boton) cerrar();
        });

        document.addEventListener('keydown', function (evento) {
            if (!abierto || evento.key !== 'Escape') return;
            cerrar();
            boton.focus({ preventScroll: true });
        });

        menu.addEventListener('click', cerrar);

        /* Al cruzar el punto de corte, el estado por defecto se ajusta
           al modo: desplegado en el drawer, cerrado en escritorio. */
        function alCambiarDeModo() {
            abierto = enDrawer.matches;
            pintarEstado();
        }

        if (typeof enDrawer.addEventListener === 'function') {
            enDrawer.addEventListener('change', alCambiarDeModo);
        } else if (typeof enDrawer.addListener === 'function') {
            enDrawer.addListener(alCambiarDeModo);
        }

        pintarEstado();
    }

    /* La vuelta se guarda relativa a la raiz del sitio (sin subpath):
       con el pathname absoluto el retorno duplicaba el subdirectorio
       en GitHub Pages (/repo/repo/...). */
    function rutaRelativaAlSitio() {
        let raiz = '/';

        try {
            raiz = new URL(window.urlDelSitio('/'), window.location.href).pathname;
        } catch (error) {
            raiz = '/';
        }

        const actual = window.location.pathname;

        const sinRaiz = actual.indexOf(raiz) === 0
            ? actual.slice(raiz.length)
            : actual.replace(/^\/+/, '');

        return sinRaiz + window.location.search;
    }

    function exigirCuenta() {
        if (!window.REQUIERE_CUENTA) return true;

        if (usuario) return true;

        window.location.href = window.urlDelSitio('login.html')
            + '?volver=' + encodeURIComponent(rutaRelativaAlSitio());

        return false;
    }

    function hayBackend() {
        const fn = window.hayApiConfigurada;
        return typeof fn !== 'function' || fn();
    }

    async function salir() {
        if (hayBackend()) {
            try {
                await fetch(window.urlApi('/api/auth/logout'), { method: 'POST', credentials: 'include' });
            } catch (error) {
            }
        }

        try {
            window.localStorage.removeItem('zapiCart');
        } catch (error) {
        }

        window.location.href = window.urlDelSitio('index.html');
    }

    const sesion = (window.REQUIERE_CUENTA && hayBackend())
        ? fetch(window.urlApi('/api/auth/yo'), { credentials: 'include' })
            .then(function (res) { return res.json(); })
            .then(function (datos) {
                usuario = datos && datos.usuario ? datos.usuario : null;
            })
            .catch(function () {
                usuario = null;
            })
        : Promise.resolve().then(function () {
            usuario = null;
        });

    const listo = sesion.then(function () {
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
