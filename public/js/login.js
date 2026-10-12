'use strict';
/* ============================================================
   LOGIN · ZAPI
   ------------------------------------------------------------
   Comportamiento del personaje animado y del formulario.

   Estados del contenedor (#hd[data-state]):
   - happy   al cargar (1,8 s) y vuelve a idle
   - idle    ojos abiertos y sonrisa suave
   - hide    foco en la contraseña (las manos tapan los ojos)
   - error   correo válido pero contraseña < 4: llanto + sacudida
   - ok      datos correctos: lentes, estrellas, pícara y saltitos
   - confuse correo inválido: sorpresa, boca "o", signos y cabeza -4°

   Va en archivo aparte para respetar la CSP (script-src 'self').
   ============================================================ */
(function () {

    const $ = (s) => document.querySelector(s);
    const hd = $('#hd');
    const tilt = $('#tilt');
    const msg = $('#msg');
    const u = $('#u');
    const p = $('#p');
    const n = $('#n');
    const fn = $('#fn');
    const t = $('#t');
    const go = $('#go');
    const swap = $('#swap');
    const swapTexto = $('#swapTexto');
    const titulo = $('#titulo');
    const shake = $('#shake');
    const form = $('#f');

    /* La máscara del iris llega por JS (no por style inline: la CSP
       del sitio solo permite style-src 'self'). */
    $('#irw').style.setProperty('--m', 'url(/personaje/ojos-blanco.png)');

    const cl = (v, a, b) => Math.max(a, Math.min(b, v));

    /* st: cambia el estado del personaje y, si viene, el mensaje. */
    function st(s, m) {
        hd.dataset.state = s;
        if (m) msg.textContent = m;
    }

    const DEF = '¡Hola! Ingresá para seguir creciendo';
    let tm;

    /* Mismo formato que pide el diseño: acepta .com, .com.uy, etc. */
    function valid(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }

    /* restore: deja la inclinación en cero. */
    function rest() {
        tilt.style.setProperty('--r', '0deg');
    }

    /* Confusión por correo inválido. A los 2,2 s vuelve a idle,
       o a hide si el foco está en la contraseña. */
    function confuse() {
        clearTimeout(tm);
        st('confuse', 'Revisá el correo: falta el @ o el .com');
        tilt.style.setProperty('--r', '-4deg');
        tm = setTimeout(function () {
            if (hd.dataset.state !== 'confuse') return;
            rest();
            if (document.activeElement === p) st('hide', 'Shh, no estoy mirando');
            else st('idle', DEF);
        }, 2200);
    }

    /* aim: mueve el iris. x e y llegan normalizados a ~[-60, 60]
       y ~[-50, 50]; el desplazamiento máximo es 2,2 % del ancho
       (horizontal) y 1,6 % (vertical). */
    function aim(x, y) {
        const w = hd.clientWidth;
        hd.style.setProperty('--ix', (x / 60 * w * 0.022).toFixed(2) + 'px');
        hd.style.setProperty('--iy', (y / 50 * w * 0.016).toFixed(2) + 'px');
    }

    /* Los ojos siguen el cursor y la cabeza se inclina hasta ±3°,
       pero solo en reposo (idle). */
    document.addEventListener('pointermove', function (e) {
        if (hd.dataset.state !== 'idle') return;
        const r = hd.getBoundingClientRect();
        const dx = cl((e.clientX - r.left - r.width / 2) / (r.width * 1.2), -1, 1);
        const dy = cl((e.clientY - r.top - r.height * 0.7) / (r.height * 1.2), -1, 1);
        aim(dx * 60, dy * 50);
        tilt.style.setProperty('--r', (dx * 3).toFixed(2) + 'deg');
    });

    /* Parpadeo: 140 ms entre ojos felices y abiertos, cada 2,4-5,2 s. */
    function blink() {
        hd.classList.add('blink');
        setTimeout(() => hd.classList.remove('blink'), 140);
        setTimeout(blink, 2400 + Math.random() * 2800);
    }
    blink();

    /* Entrada: saluda (happy) y a los 1,8 s queda en idle. */
    st('happy');
    setTimeout(() => st('idle'), 1800);

    /* --- Correo --- */
    u.addEventListener('focus', function () {
        clearTimeout(tm);
        st('idle', DEF);
        aim(0, 40);
        rest();
    });
    u.addEventListener('blur', function () {
        if (u.value.trim() && !valid(u.value.trim())) confuse();
    });
    /* Al escribir mira hacia abajo y hacia el lado, según el largo. */
    u.addEventListener('input', function () {
        aim(cl((u.value.length - 10) * 5, -45, 45), 40);
        tilt.style.setProperty('--r', cl((u.value.length - 10) * 0.25, -2.5, 2.5) + 'deg');
    });

    /* --- Contraseña --- */
    p.addEventListener('focus', function () {
        if (hd.dataset.state === 'confuse') return;
        st('hide', 'Shh, no estoy mirando');
        rest();
    });
    p.addEventListener('blur', function (e) {
        /* Si el foco pasa al botón VER, no se destapa: el botón
           vuelve a enfocar el campo enseguida. */
        if (e.relatedTarget === t) return;
        hd.removeAttribute('data-peek');
        if (hd.dataset.state === 'confuse') return;
        st('idle', DEF);
    });

    /* --- Botón VER / OCULTAR --- */
    t.addEventListener('click', function () {
        const show = p.type === 'password';
        p.type = show ? 'text' : 'password';
        t.textContent = show ? 'OCULTAR' : 'VER';
        p.focus();
        if (show) hd.setAttribute('data-peek', '');
        else hd.removeAttribute('data-peek');
    });

    /* --- Modo: ingresar o crear cuenta --- */
    let modo = 'login';

    function ponerModo(m) {
        modo = m;
        const registro = m === 'registro';

        fn.hidden = !registro;
        titulo.textContent = registro ? 'Creá tu cuenta' : 'Bienvenido';
        go.textContent = registro ? 'Crear cuenta' : 'Ingresar';
        swapTexto.textContent = registro ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?';
        swap.textContent = registro ? 'Ingresar' : 'Crear una';
        p.autocomplete = registro ? 'new-password' : 'current-password';
        st('idle', registro
            ? '¡Hola! Creá tu cuenta y empecemos'
            : DEF);
    }

    swap.addEventListener('click', function () {
        ponerModo(modo === 'login' ? 'registro' : 'login');
        (modo === 'registro' ? n : u).focus();
    });

    /* Sacude al personaje cuando los datos no cierran. */
    function sacudir() {
        shake.classList.remove('shake');
        void shake.offsetWidth;
        shake.classList.add('shake');
        setTimeout(function () {
            if (hd.dataset.state === 'error') st('idle', DEF);
        }, 2400);
    }

    /* A dónde volver después de entrar: ?volver=/algo, solo rutas
       internas (nunca //otro-sitio ni http://...). */
    function destino() {
        const volver = new URLSearchParams(window.location.search).get('volver');

        if (volver && volver.charAt(0) === '/' && volver.charAt(1) !== '/') return volver;

        return '/';
    }

    /* --- Envío: alta o login contra /api/auth --- */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const correo = u.value.trim();

        if (!valid(correo)) {
            confuse();
            return;
        }

        if (modo === 'registro' && n.value.trim().length < 2) {
            st('confuse', 'Escribí tu nombre para crear la cuenta');
            return;
        }

        const ruta = modo === 'login' ? '/api/auth/login' : '/api/auth/registro';
        const cuerpo = modo === 'login'
            ? { email: correo, clave: p.value }
            : { nombre: n.value.trim(), email: correo, clave: p.value };

        go.disabled = true;

        try {
            const respuesta = await fetch(ruta, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(cuerpo),
            });

            const datos = await respuesta.json().catch(function () { return {}; });

            if (!respuesta.ok) {
                st('error', datos.error || 'Ups, revisá tus datos e intentá de nuevo');
                sacudir();
                return;
            }

            st('ok', '¡Listo! Entrando…');
            window.setTimeout(function () {
                window.location.href = destino();
            }, 900);
        } catch (error) {
            st('error', 'No pudimos conectarnos. Probá de nuevo en un momento');
            sacudir();
        } finally {
            go.disabled = false;
        }
    });

})();
