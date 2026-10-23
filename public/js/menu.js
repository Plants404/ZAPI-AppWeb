'use strict';

(function () {

    const toggle = document.getElementById('navToggle');
    const sheet = document.getElementById('hojaMenu');
    const backdrop = document.getElementById('navBackdrop');
    const body = document.body;
    const html = document.documentElement;
    const header = document.querySelector('header');

    if (!toggle || !sheet) return;

    if (sheet.dataset.menuListo === 'si') return;
    sheet.dataset.menuListo = 'si';

    let abierto = false;
    let scrollY = 0;
    let iosLock = false;

    function focusables() {
        return Array.from(sheet.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(function (el) {
            return el.offsetParent !== null;
        });
    }

    function trapFocus(evento) {
        if (evento.key !== 'Tab' || !abierto) return;

        const foc = focusables();
        if (!foc.length) return;

        const primero = foc[0];
        const ultimo = foc[foc.length - 1];
        const actual = document.activeElement;

        if (!foc.includes(actual)) {
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

    function actualizarAriaLabel() {
        const badge = toggle.querySelector('.cart-count-toggle');
        const count = badge ? badge.textContent : '0';
        const plural = count === '1' ? 'producto' : 'productos';
        const accion = abierto ? 'Cerrar' : 'Abrir';
        toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        toggle.setAttribute(
            'aria-label',
            accion + ' menú de navegación, Carrito, ' + count + ' ' + plural
        );
    }

    function copiarNombreSesion() {
        const nombreDesktop = document.getElementById('navUsuarioNombre');
        const nombreSheet = sheet.querySelector('.bottom-sheet-hola');
        if (nombreDesktop && nombreSheet && nombreDesktop.textContent) {
            nombreSheet.textContent = nombreDesktop.textContent;
        }
    }

    function bloquearScroll() {
        scrollY = window.scrollY || window.pageYOffset || 0;
        html.style.scrollBehavior = 'auto';

        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            body.style.top = '-' + scrollY + 'px';
            body.style.position = 'fixed';
            body.style.width = '100%';
            iosLock = true;
        }
    }

    function desbloquearScroll() {
        html.style.scrollBehavior = '';

        if (iosLock) {
            const y = scrollY;
            body.style.position = '';
            body.style.top = '';
            iosLock = false;
            requestAnimationFrame(function () {
                window.scrollTo(0, y);
            });
        }
    }

    function abrir() {
        if (abierto) return;
        abierto = true;

        sheet.hidden = false;
        sheet.removeAttribute('inert');
        sheet.offsetHeight;
        sheet.classList.add('esta-abierto');

        header?.classList.add('menu-abierto');
        html.classList.add('menu-abierto');

        if (backdrop) {
            backdrop.hidden = false;
            requestAnimationFrame(function () {
                backdrop.classList.add('esta-activo');
            });
        }

        actualizarAriaLabel();
        copiarNombreSesion();
        bloquearScroll();

        const cerrarBtn = sheet.querySelector('.bottom-sheet-cerrar');
        const foc = focusables();
        const target = cerrarBtn || foc[0];
        if (target instanceof HTMLElement) {
            target.focus({ preventScroll: true });
        }
    }

    function cerrar() {
        if (!abierto) return;
        abierto = false;

        sheet.classList.remove('esta-abierto');
        header?.classList.remove('menu-abierto');
        html.classList.remove('menu-abierto');

        actualizarAriaLabel();
        desbloquearScroll();

        if (backdrop) {
            backdrop.classList.remove('esta-activo');
            let quitar = function () { backdrop.hidden = true; };
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                quitar();
            } else {
                setTimeout(quitar, 250);
            }
        }

        let ocultar = function () {
            sheet.hidden = true;
            sheet.setAttribute('inert', '');
        };
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            ocultar();
        } else {
            setTimeout(ocultar, 250);
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

    sheet.addEventListener('click', function (evento) {
        if (!(evento.target instanceof Element)) return;
        const link = evento.target.closest('a');
        if (link && sheet.contains(link)) cerrar();
    });

    const salirSheet = sheet.querySelector('[data-auth-salir]');
    if (salirSheet && window.zapiAuth) {
        salirSheet.addEventListener('click', function () {
            cerrar();
            window.zapiAuth.salir();
        });
    }

    document.addEventListener('keydown', function (evento) {
        if (!abierto) return;

        if (evento.key === 'Escape') {
            evento.preventDefault();
            cerrar();
            return;
        }

        if (evento.key === 'Tab') trapFocus(evento);
    });

    const escritorio = window.matchMedia('(min-width: 1024px)');
    function alCambiarDeAncho() {
        if (escritorio.matches && abierto) cerrar();
    }

    if (typeof escritorio.addEventListener === 'function') {
        escritorio.addEventListener('change', alCambiarDeAncho);
    } else if (typeof escritorio.addListener === 'function') {
        escritorio.addListener(alCambiarDeAncho);
    }

})();
