'use strict';
/* ============================================================
   404 · ZAPI
   ------------------------------------------------------------
   Reinicio del ciclo de animacion de la pagina 404.
   Se mantiene en un archivo aparte para respetar la CSP
   (script-src 'self'): nada de JS inline.

   La animacion de entrada dura ~8s (a los 8s la planta se
   desvanece). Cada ~9.5s quitamos ".go", forzamos reflow y la
   volvemos a poner: eso reinicia todas las animaciones de una.
   Con "prefers-reduced-motion" no se arranca el bucle: la planta
   queda crecida y quieta (ver 404.css).
   ============================================================ */
(function () {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
    const REINICIO_MS = 9500;

    function ciclo() {
        const escena = document.getElementById('planta404');
        if (!escena) return;

        window.setInterval(function () {
            if (reducir.matches) return;          // respeta la preferencia

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
