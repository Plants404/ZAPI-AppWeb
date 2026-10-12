'use strict';
/* ============================================================
   LOGIN · ZAPI
   ------------------------------------------------------------
   Comportamiento del personaje "Brotecito" (12 caras SVG
   apiladas en #hd) y del formulario.

   Estados (#hd[data-state]) y cara que muestran:
   - happy   al cargar (1,8 s); cara 1 y vuelve a idle
   - idle    reposo: cara 1, sigue el cursor y guiña de a ratos
   - look    foco en el correo: cara 1, inclina -3° y corre -2 %
   - hide    foco en la contraseña: cara 5 (las manos tapan los ojos)
   - confuse correo inválido: cara 2, inclina -4° y vuelve a los 2,2 s
   - error   el servidor rechazó: cara 3 + sacudida
   - ok      entró: cara 4, a los 1,3 s la 8 y redirige a los 1,5 s

   Con la contraseña a la vista (data-peek) el estado hide muestra
   la cara 7 (guiño), como si se asomara.

   Va en archivo aparte para respetar la CSP (script-src 'self').
   ============================================================ */
(function () {

    const $ = (s) => document.querySelector(s);
    const hd = $('#hd');
    const tilt = $('#tilt');
    const pp = $('#pp');
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

    const cl = (v, a, b) => Math.max(a, Math.min(b, v));

    /* Cara que corresponde a cada estado. */
    const CARA = { happy: 1, idle: 1, look: 1, hide: 5, confuse: 2, error: 3, ok: 4 };
    let estado = 'happy';
    let tm;

    /* La contraseña a la vista asoma la cara que guiña. */
    function caraActual() {
        return estado === 'hide' && hd.hasAttribute('data-peek') ? 7 : CARA[estado];
    }

    /* setCara: cambia la cara visible. Con quiet no hace el "pop"
       (el guiño del reposo no debe saltar). */
    function setCara(numero, quiet) {
        if (+hd.dataset.face === numero) return;
        hd.dataset.face = numero;
        if (quiet) return;
        pp.classList.remove('pop');
        void pp.offsetWidth;
        pp.classList.add('pop');
    }

    /* st: cambia el estado y, si viene, el mensaje. */
    function st(s, m) {
        estado = s;
        hd.dataset.state = s;
        if (m) msg.textContent = m;
        setCara(caraActual());
        if (s === 'ok') {
            setTimeout(function () { if (estado === 'ok') setCara(8); }, 1300);
        }
    }

    /* lean: inclina la cabeza (--r) y la corre de lado (--tx). */
    function lean(r, x) {
        tilt.style.setProperty('--r', r + 'deg');
        tilt.style.setProperty('--tx', x + '%');
    }

    function rest() { lean(0, 0); }

    const DEF = '¡Hola! Ingresá para seguir creciendo';

    /* Mismo formato que pide el diseño: acepta .com, .com.uy, etc. */
    function valid(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }

    /* Confusión por correo inválido. A los 2,2 s vuelve a idle,
       o a hide si el foco está en la contraseña. */
    function confuse() {
        clearTimeout(tm);
        st('confuse', 'Revisá el correo: falta el @ o el .com');
        lean(-4, 0);
        tm = setTimeout(function () {
            if (estado !== 'confuse') return;
            rest();
            if (document.activeElement === p) st('hide', 'Shh, no estoy mirando');
            else st('idle', DEF);
        }, 2200);
    }

    /* La cabeza sigue el cursor, solo en reposo (idle). */
    document.addEventListener('pointermove', function (e) {
        if (estado !== 'idle') return;
        const r = hd.getBoundingClientRect();
        const dx = cl((e.clientX - r.left - r.width / 2) / (r.width * 1.4), -1, 1);
        lean((dx * 4).toFixed(2), (dx * 2).toFixed(2));
    });

    /* Guiño en reposo: cara 7 durante 750 ms, cada 3,2-6,4 s,
       sin "pop" para que no salte. */
    function guino() {
        setTimeout(function () {
            if (estado === 'idle' || estado === 'look') {
                setCara(7, true);
                setTimeout(function () {
                    if (estado === 'idle' || estado === 'look') setCara(1, true);
                }, 750);
            }
            guino();
        }, 3200 + Math.random() * 3200);
    }
    guino();

    /* Entrada: saluda (happy) y a los 1,8 s queda en idle. */
    st('happy');
    setTimeout(function () { if (estado === 'happy') st('idle'); }, 1800);

    /* --- Correo --- */
    u.addEventListener('focus', function () {
        clearTimeout(tm);
        st('look', DEF);
        lean(-3, -2);
    });
    /* Al escribir, la inclinación crece con el largo del correo. */
    u.addEventListener('input', function () {
        lean(cl((u.value.length - 10) * .3, -3, 4), cl((u.value.length - 10) * .3, -2, 3));
    });
    u.addEventListener('blur', function () {
        if (u.value.trim() && !valid(u.value.trim())) confuse();
        else if (estado === 'look') { st('idle'); rest(); }
    });

    /* --- Contraseña --- */
    p.addEventListener('focus', function () {
        if (estado === 'confuse') return;
        st('hide', 'Shh, no estoy mirando');
        rest();
    });
    p.addEventListener('blur', function (e) {
        /* Si el foco pasa al botón VER, no se destapa: el botón
           vuelve a enfocar el campo enseguida. */
        if (e.relatedTarget === t) return;
        hd.removeAttribute('data-peek');
        if (estado === 'confuse') return;
        st('idle', DEF);
    });

    /* --- Botón VER / OCULTAR --- */
    t.addEventListener('click', function () {
        const mostrar = p.type === 'password';
        p.type = mostrar ? 'text' : 'password';
        t.textContent = mostrar ? 'OCULTAR' : 'VER';
        p.focus();
        if (mostrar) hd.setAttribute('data-peek', '');
        else hd.removeAttribute('data-peek');
        setCara(caraActual());
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
        st('idle', registro ? '¡Hola! Creá tu cuenta y empecemos' : DEF);
    }

    swap.addEventListener('click', function () {
        ponerModo(modo === 'login' ? 'registro' : 'login');
        (modo === 'registro' ? n : u).focus();
    });

    /* Sacude al personaje cuando el servidor rechaza los datos. */
    function sacudir() {
        shake.classList.remove('shake');
        void shake.offsetWidth;
        shake.classList.add('shake');
        setTimeout(function () {
            if (estado === 'error') st('idle', DEF);
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
            }, 1500);
        } catch (error) {
            st('error', 'No pudimos conectarnos. Probá de nuevo en un momento');
            sacudir();
        } finally {
            go.disabled = false;
        }
    });

})();
