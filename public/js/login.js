'use strict';
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

    const CARA = { happy: 1, idle: 1, look: 1, hide: 5, confuse: 2, error: 3, ok: 4 };
    let estado = 'happy';
    let tm;

    function caraActual() {
        return estado === 'hide' && hd.hasAttribute('data-peek') ? 7 : CARA[estado];
    }

    function setCara(numero, quiet) {
        if (+hd.dataset.face === numero) return;
        hd.dataset.face = numero;
        if (quiet) return;
        pp.classList.remove('pop');
        void pp.offsetWidth;
        pp.classList.add('pop');
    }

    function st(s, m) {
        estado = s;
        hd.dataset.state = s;
        if (m) msg.textContent = m;
        setCara(caraActual());
        if (s === 'ok') {
            setTimeout(function () { if (estado === 'ok') setCara(8); }, 1300);
        }
    }

    function lean(r, x) {
        tilt.style.setProperty('--r', r + 'deg');
        tilt.style.setProperty('--tx', x + '%');
    }

    function rest() { lean(0, 0); }

    const DEF = '¡Hola! Ingresá para seguir creciendo';

    function valid(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }

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

    document.addEventListener('pointermove', function (e) {
        if (estado !== 'idle') return;
        const r = hd.getBoundingClientRect();
        const dx = cl((e.clientX - r.left - r.width / 2) / (r.width * 1.4), -1, 1);
        lean((dx * 4).toFixed(2), (dx * 2).toFixed(2));
    });

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

    st('happy');
    setTimeout(function () { if (estado === 'happy') st('idle'); }, 1800);

    u.addEventListener('focus', function () {
        clearTimeout(tm);
        st('look', DEF);
        lean(-3, -2);
    });
    u.addEventListener('input', function () {
        lean(cl((u.value.length - 10) * .3, -3, 4), cl((u.value.length - 10) * .3, -2, 3));
    });
    u.addEventListener('blur', function () {
        if (u.value.trim() && !valid(u.value.trim())) confuse();
        else if (estado === 'look') { st('idle'); rest(); }
    });

    p.addEventListener('focus', function () {
        if (estado === 'confuse') return;
        st('hide', 'Shh, no estoy mirando');
        rest();
    });
    p.addEventListener('blur', function (e) {
        if (e.relatedTarget === t) return;
        hd.removeAttribute('data-peek');
        if (estado === 'confuse') return;
        st('idle', DEF);
    });

    t.addEventListener('click', function () {
        const mostrar = p.type === 'password';
        p.type = mostrar ? 'text' : 'password';
        t.textContent = mostrar ? 'OCULTAR' : 'VER';
        p.focus();
        if (mostrar) hd.setAttribute('data-peek', '');
        else hd.removeAttribute('data-peek');
        setCara(caraActual());
    });

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

    function sacudir() {
        shake.classList.remove('shake');
        void shake.offsetWidth;
        shake.classList.add('shake');
        setTimeout(function () {
            if (estado === 'error') st('idle', DEF);
        }, 2400);
    }

    /* Solo rutas internas (nunca //otro-sitio ni http://...): evita open redirect. */
    function destino() {
        const volver = new URLSearchParams(window.location.search).get('volver');

        if (volver && volver.charAt(0) === '/' && volver.charAt(1) !== '/') return volver;

        return '/';
    }

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
                /* Si contesta JSON es el backend: un 401 con "error" o
                   el fallback de datos. Si NO es JSON, el pedido lo
                   atendio un servidor estatico (vista previa), que no
                   tiene /api/auth/login: avisar de eso y no de los
                   datos, que estan bien. */
                const esBackend = (respuesta.headers.get('content-type') || '')
                    .indexOf('application/json') !== -1;

                st('error', datos.error || (esBackend
                    ? 'Ups, revisá tus datos e intentá de nuevo'
                    : 'Esta página no la sirve el backend. Abrí el sitio con dev:memoria y usá esa dirección.'));
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
