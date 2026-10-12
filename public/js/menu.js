'use strict';

(function () {

    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('navPrincipal');
    const backdrop = document.getElementById('navBackdrop');
    const body = document.body;
    const header = document.querySelector('header');

    if (!toggle || !nav) return;

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

    function elementosEnfocables() {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]),' +
            ' [tabindex]:not([tabindex="-1"])';
        const zonas = [header, nav].filter(zona => zona);

        return zonas.flatMap(zona =>
            Array.from(zona.querySelectorAll(selector))
        ).filter(elemento =>
            elemento.offsetParent !== null
        );
    }

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

        header?.classList.add('menu-abierto');
        body.classList.add('no-scroll');
        /* Velar el HTML completo, no solo el body, para que el chat y el botón del carrito no queden encima. */
        document.documentElement.classList.add('menu-abierto');

        // El fondo se muestra primero y la clase al frame siguiente, o el navegador agrupa y no se ve la transición.
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
            // Se espera el desvanecido antes de sacarlo del flujo.
            const quitar = () => { backdrop.hidden = true; };
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                quitar();
            } else {
                setTimeout(quitar, 300);
            }
        }

        toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', function () {
        if (abierto) cerrar();
        else abrir();
    });

    if (backdrop) {
        backdrop.addEventListener('click', cerrar);
    }

    document.addEventListener('keydown', function (evento) {
        if (!abierto) return;

        if (evento.key === 'Escape') {
            evento.preventDefault();
            cerrar();
            return;
        }

        /* El Tab va síncrono: preventDefault debe correr antes de que el navegador mueva el foco. */
        if (evento.key === 'Tab') atraparFoco(evento);
    });

    nav.addEventListener('click', function (evento) {
        if (!(evento.target instanceof Element)) return;
        const control = evento.target.closest('.nav-link, [data-section], .nav-usuario-item');
        if (control && nav.contains(control)) cerrar();
    });

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
