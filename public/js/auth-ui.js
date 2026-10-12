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
        if (nombre && usuario) nombre.textContent = usuario.nombre;

        const salir = document.getElementById('navSalir');
        if (salir) salir.addEventListener('click', window.zapiAuth.salir);
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
        });

    window.zapiAuth = {
        listo: listo,
        get usuario() { return usuario; },
        get autenticado() { return Boolean(usuario); },
        exigirCuenta: exigirCuenta,
        salir: salir,
    };

})();
