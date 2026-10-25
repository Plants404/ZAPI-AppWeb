'use strict';
(function () {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
    const REINICIO_MS = 9500;

    function ciclo() {
        const escena = document.getElementById('planta404');
        if (!escena) return;

        window.setInterval(function () {
            if (reducir.matches) return;

            escena.classList.remove('go');
            void escena.offsetWidth;              // fuerza reflow
            escena.classList.add('go');
        }, REINICIO_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ciclo);
    } else {
        ciclo();
    }
})();
