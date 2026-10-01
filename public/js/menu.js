'use strict';

// El menu hamburguesa: abre y cierra el panel lateral del nav,
// mantiene aria-expanded sincronizado con el estado real,
// bloquea el scroll del body mientras esta abierto y deja
// cerrarlo con Escape, con clic en el fondo o al elegir un
// destino.
//
// El mismo header esta en index.html y catalogo.html, asi que
// todo se apoya en clases y no en la estructura de la pagina:
// en index el nav enruta con data-section y en catalogo.html
// son enlaces que llevan a otra pagina. El cierre funciona en los
// dos casos porque escucha el clic en el nav, no en cada link.

(function () {

    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('navPrincipal');
    const backdrop = document.getElementById('navBackdrop');
    const body = document.body;
    const header = document.querySelector('header');

    // Sin estos dos no hay menu: la pagina se deja como estaba.
    if (!toggle || !nav) return;

    // Evita duplicar listeners si el script se carga dos veces.
    if (nav.dataset.menuListo === 'si') return;
    nav.dataset.menuListo = 'si';

    let abierto = false;

    function enfocarPrimerLink() {
        const primero = nav.querySelector(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (primero instanceof HTMLElement) {
            primero.focus({ preventScroll: true });
        }
    }

    /* Lo que se puede enfocar mientras el menu esta abierto: los
       controles del panel mas los del header, que quedan por encima
       del velo y por lo tanto se siguen viendo y usando (la cruz de
       cerrar y el buscador). */
    function elementosEnfocables() {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]),' +
            ' [tabindex]:not([tabindex="-1"])';
        const zonas = [header, nav].filter(zona => zona);

        return zonas.flatMap(zona =>
            Array.from(zona.querySelectorAll(selector))
        ).filter(elemento =>
            /* offsetParent es null en un panel con visibility:hidden,
               asi que el filtro saca los links del menu cerrado. */
            elemento.offsetParent !== null
        );
    }

    /* Sin esto, el Tab sale del panel y se mete en el contenido de
       la pagina que esta detras del velo: el foco se pierde en algo
       que no se ve. El ciclo incluye el header, asi que la cruz y el
       buscador siguen siendo alcanzables. */
    function atraparFoco(evento) {
        if (evento.key !== 'Tab' || !abierto) return;

        const focusables = elementosEnfocables();

        if (!focusables.length) return;

        const primero = focusables[0];
        const ultimo = focusables[focusables.length - 1];
        const actual = document.activeElement;

        if (!focusables.includes(actual)) {
            evento.preventDefault();
            primero.focus({ preventScroll: true });
            return;
        }

        if (evento.shiftKey && actual === primero) {
            evento.preventDefault();
            ultimo.focus({ preventScroll: true });
        } else if (!evento.shiftKey && actual === ultimo) {
            evento.preventDefault();
            primero.focus({ preventScroll: true });
        }
    }

    function abrir() {
        if (abierto) return;
        abierto = true;

        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Cerrar menu de navegacion');
        nav.classList.add('esta-abierto');

        // Con el menu abierto el header queda transparente: asi el
        // boton de cerrar se ve sobre el panel y no sobre el fondo
        // del header, que se moveria con el scroll.
        header?.classList.add('menu-abierto');
        body.classList.add('no-scroll');
        // Al HTML, no al body, para poder bajar el chat y el boton
        // flotante del carrito y que no queden clickeables por
        // encima del velo del menu.
        document.documentElement.classList.add('menu-abierto');

        // El fondo se muestra primero y la clase al frame siguiente:
        // si se pusieran las dos cosas en el mismo tick, el navegador
        // las agruparia y la transicion de opacidad no se veria.
        if (backdrop) {
            backdrop.hidden = false;
            requestAnimationFrame(() => backdrop.classList.add('esta-activo'));
        }

        enfocarPrimerLink();
    }

    function cerrar() {
        if (!abierto) return;
        abierto = false;

        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu de navegacion');
        nav.classList.remove('esta-abierto');
        header?.classList.remove('menu-abierto');
        body.classList.remove('no-scroll');
        document.documentElement.classList.remove('menu-abierto');

        if (backdrop) {
            backdrop.classList.remove('esta-activo');
            // Se espera a que termine el desvanecido antes de sacarlo
            // del flujo, asi no desaparece de golpe a mitad del cierre.
            const quitar = () => { backdrop.hidden = true; };
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                quitar();
            } else {
                setTimeout(quitar, 300);
            }
        }

        // El foco vuelve al boton: si se deja en un link que se
        // esta desvanciendo, el proximo tab se pierde.
        toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', function () {
        if (abierto) cerrar();
        else abrir();
    });

    if (backdrop) {
        backdrop.addEventListener('click', cerrar);
    }

    // Escape cierra el menu. Se escucha en el documento y no en el
    // nav para que funcione tambien con el foco en el buscador o en
    // el fondo. El buscador corta la propagacion cuando tiene
    // algo escrito, porque ahi Escape limpia el campo.
    document.addEventListener('keydown', function (evento) {
        if (!abierto) return;

        if (evento.key === 'Escape') {
            evento.preventDefault();
            cerrar();
            return;
        }

        /* El Tab se atiende de forma sincrona, sin aplazar con
           requestAnimationFrame: el preventDefault tiene que correr
           antes de que el navegador mueva el foco, y para cuando
           corriera un frame el cambio ya habria pasado. */
        if (evento.key === 'Tab') atraparFoco(evento);
    });

    // Al elegir un destino el menu se cierra. Se escucha en el nav
    // porque todos los controles de navegacion viven adentro, tanto
    // los botones data-section de index.html como los enlaces de
    // catalogo.html.
    nav.addEventListener('click', function (evento) {
        if (!(evento.target instanceof Element)) return;
        const control = evento.target.closest('.nav-link, [data-section]');
        if (control && nav.contains(control)) cerrar();
    });

    // Al pasar a escritorio el nav vuelve a ser una barra horizontal
    // y el boton desaparece: si el panel quedara abierto, se veria
    // el header transparente sin nadie que lo pueda cerrar.
    const escritorio = window.matchMedia('(min-width: 1024px)');

    function alCambiarDeAncho() {
        if (escritorio.matches && abierto) cerrar();
    }

    if (typeof escritorio.addEventListener === 'function') {
        escritorio.addEventListener('change', alCambiarDeAncho);
    } else if (typeof escritorio.addListener === 'function') {
        // Safari viejo.
        escritorio.addListener(alCambiarDeAncho);
    }

})();
