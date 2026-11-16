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
    const tabLogin = $('#tabLogin');
    const tabRegistro = $('#tabRegistro');
    const p2 = $('#p2');
    const extra = $('#extra');
    const errN = $('#errN');
    const errU = $('#errU');
    const errP = $('#errP');
    const errP2 = $('#errP2');
    const fuerzaRelleno = $('#fuerzaRelleno');
    const fuerzaTexto = $('#fuerzaTexto');
    const reqs = $('#reqs');
    const CLAVE_MINIMA = 12;
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
    const DEF_REGISTRO = '¡Hola! Creá tu cuenta y empecemos';

    function defMsg() {
        return modo === 'registro' ? DEF_REGISTRO : DEF;
    }

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
            else st('idle', defMsg());
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
        st('look', defMsg());
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
        st('idle', defMsg());
    });

    p2.addEventListener('focus', function () {
        if (estado === 'confuse') return;
        st('hide', 'Shh, no estoy mirando');
        rest();
    });
    p2.addEventListener('blur', function (e) {
        if (e.relatedTarget === t) return;
        hd.removeAttribute('data-peek');
        if (estado === 'confuse') return;
        st('idle', defMsg());
    });

    t.addEventListener('click', function () {
        const mostrar = p.type === 'password';
        p.type = mostrar ? 'text' : 'password';
        p2.type = p.type;
        t.textContent = mostrar ? 'OCULTAR' : 'VER';
        p.focus();
        if (mostrar) hd.setAttribute('data-peek', '');
        else hd.removeAttribute('data-peek');
        setCara(caraActual());
    });

    let modo = 'login';

    /* ----- Ayudas del formulario de registro ----- */

    function ponerError(campo, mensaje) {
        const mapa = { n: errN, u: errU, p: errP, p2: errP2 };
        const entrada = { n: n, u: u, p: p, p2: p2 }[campo];
        mapa[campo].textContent = mensaje || '';
        entrada.classList.toggle('malo', Boolean(mensaje));
        if (mensaje) entrada.setAttribute('aria-invalid', 'true');
        else entrada.removeAttribute('aria-invalid');
    }

    function limpiarErrores() {
        ['n', 'u', 'p', 'p2'].forEach(function (c) { ponerError(c, ''); });
    }

    function puntajeClave(v) {
        let puntos = 0;
        if (v.length >= CLAVE_MINIMA) puntos += 1;
        if (v.length >= 16) puntos += 1;
        if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos += 1;
        if (/\d/.test(v) && /[a-zA-Z]/.test(v)) puntos += 1;
        if (/[^a-zA-Z0-9]/.test(v)) puntos += 1;
        return v.length < CLAVE_MINIMA ? Math.min(puntos, 1) : Math.max(2, Math.min(puntos, 4));
    }

    function marcarReq(nombre, cumple) {
        const li = reqs.querySelector('[data-req="' + nombre + '"]');
        if (li) li.classList.toggle('ok', cumple);
    }

    function actualizarClave() {
        const v = p.value;
        const nivel = v ? puntajeClave(v) : 0;
        const textos = ['Escribí una contraseña', 'Muy corta', 'Aceptable', 'Buena', 'Muy fuerte'];

        fuerzaRelleno.className = nivel ? 'f' + nivel : '';
        fuerzaRelleno.style.width = (nivel * 25) + '%';
        fuerzaTexto.textContent = textos[nivel];
        marcarReq('largo', v.length >= CLAVE_MINIMA);
        marcarReq('mezcla', /\d/.test(v) && /[a-zA-Z]/.test(v));
        marcarReq('igual', v.length > 0 && v === p2.value);
    }

    p.addEventListener('input', function () { ponerError('p', ''); actualizarClave(); });
    p2.addEventListener('input', function () { ponerError('p2', ''); actualizarClave(); });
    n.addEventListener('input', function () { ponerError('n', ''); });
    u.addEventListener('input', function () { ponerError('u', ''); });

    function ponerModo(m) {
        modo = m;
        const registro = m === 'registro';

        fn.hidden = !registro;
        extra.hidden = !registro;
        tabLogin.setAttribute('aria-selected', String(!registro));
        tabRegistro.setAttribute('aria-selected', String(registro));
        titulo.textContent = registro ? 'Creá tu cuenta' : 'Bienvenido';
        go.textContent = registro ? 'Crear cuenta' : 'Ingresar';
        p.autocomplete = registro ? 'new-password' : 'current-password';
        p.placeholder = registro ? 'Mínimo 12 caracteres' : '••••••••';
        limpiarErrores();
        if (registro) actualizarClave();
        st('idle', defMsg());
    }

    tabLogin.addEventListener('click', function () {
        if (modo === 'login') return;
        ponerModo('login');
        u.focus();
    });
    tabRegistro.addEventListener('click', function () {
        if (modo === 'registro') return;
        ponerModo('registro');
        n.focus();
    });

    function sacudir() {
        shake.classList.remove('shake');
        void shake.offsetWidth;
        shake.classList.add('shake');
        setTimeout(function () {
            if (estado === 'error') st('idle', defMsg());
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

        limpiarErrores();

        if (!valid(correo)) {
            ponerError('u', 'Revisá el correo: falta el @ o el .com');
            confuse();
            return;
        }

        if (modo === 'registro') {
            let hayError = false;

            if (n.value.trim().length < 2) {
                ponerError('n', 'Escribí tu nombre (mínimo 2 letras).');
                hayError = true;
            }
            if (p.value.length < CLAVE_MINIMA) {
                ponerError('p', 'Usá al menos ' + CLAVE_MINIMA + ' caracteres.');
                hayError = true;
            }
            if (p2.value !== p.value) {
                ponerError('p2', 'Las contraseñas no coinciden.');
                hayError = true;
            }
            if (hayError) {
                st('confuse', 'Revisá los campos marcados');
                sacudir();
                return;
            }
        } else if (!p.value) {
            ponerError('p', 'Escribí tu contraseña.');
            st('confuse', 'Falta la contraseña');
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
        const fnHayApi = window.hayApiConfigurada;
        if (typeof fnHayApi !== 'function' || !fnHayApi()) {
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
                if (respuesta.status === 409) ponerError('u', datos.error || 'Ya existe una cuenta con ese correo.');
                if (respuesta.status === 400 && /contraseña/i.test(datos.error || '')) ponerError('p', datos.error);
                st('error', datos.error || 'Ups, revisá tus datos e intentá de nuevo');
                sacudir();
                return;
            }

            /* Registrarse no inicia sesión por sí solo: se entra enseguida con los mismos datos. */
            let sesion = datos;
            if (modo === 'registro') {
                const entrada = await fetch(window.urlApi('/api/auth/login'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: correo, clave: p.value }),
                });
                sesion = await entrada.json().catch(function () { return {}; });
                if (!entrada.ok) {
                    st('error', 'Tu cuenta se creó. Ingresá con tu correo y contraseña.');
                    ponerModo('login');
                    return;
                }
            }

            st('ok', modo === 'registro' ? '¡Cuenta creada! Entrando…' : '¡Listo! Entrando…');
            window.setTimeout(function () {
                const destinoFinal = sesion && sesion.rol === 'admin'
                    ? window.urlDelSitio('/admin.html')
                    : destino();
                window.location.href = destinoFinal;
            }, 1500);
        } catch {
            st('error', 'No pudimos conectarnos. Revisá la conexión e intentá de nuevo.');
            sacudir();
        } finally {
            go.disabled = false;
        }
    });

    if (typeof window.hayApiConfigurada !== 'function' || !window.hayApiConfigurada()) {
        u.disabled = true;
        p.disabled = true;
        t.disabled = true;
        go.disabled = true;
        tabLogin.disabled = true;
        tabRegistro.disabled = true;
        st('error', 'El acceso requiere una API configurada. Contactá al equipo.');
    }

})();
