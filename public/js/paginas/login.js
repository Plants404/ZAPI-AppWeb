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

    /* Solo rutas internas relativas a la raiz del sitio ("carrito.html")
       o absolutas simples ("/carrito.html" vale en raiz): nunca
       //otro-sitio, esquemas ni backslashes. Asi no hay open redirect
       ni doble subdirectorio en GitHub Pages. */
    function esRutaInternaSegura(texto) {
        return typeof texto === 'string'
            && texto.length > 0
            && texto.indexOf('\\') === -1
            && texto.indexOf('//') !== 0
            && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(texto);
    }

    function destino() {
        const volver = new URLSearchParams(window.location.search).get('volver');

        if (esRutaInternaSegura(volver)) {
            return window.urlDelSitio(volver);
        }

        return window.urlDelSitio('/');
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

        const ruta = modo === 'login'
            ? window.urlApi('/api/auth/login')
            : window.urlApi('/api/auth/registro');
        const cuerpo = modo === 'login'
            ? { email: correo, clave: p.value }
            : { nombre: n.value.trim(), email: correo, clave: p.value };

        /* Sin backend configurado no se acepta una sesion local: la
           autenticacion siempre debe validarse en el servidor. */
        if (!ZAPI.hayBackend()) {
            st('error', 'La autenticación no está configurada. Contactá al equipo.');
            sacudir();
            return;
        }

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
        } catch {
            st('error', 'No pudimos conectarnos. Revisá la conexión e intentá de nuevo.');
            sacudir();
        } finally {
            go.disabled = false;
        }
    });

    if (!ZAPI.hayBackend()) {
        u.disabled = true;
        p.disabled = true;
        t.disabled = true;
        go.disabled = true;
        swap.disabled = true;
        st('error', 'El acceso requiere una API configurada. Contactá al equipo.');
    }

})();
