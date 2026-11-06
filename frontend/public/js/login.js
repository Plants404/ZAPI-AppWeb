'use strict';

/* Único formulario de acceso. El servidor decide el rol: cliente o
   superadministrador. El registro público siempre crea un cliente. */

const formularioLogin = document.getElementById('loginForm');
const formularioRegistro = document.getElementById('registroForm');
const pestanasLogin = document.querySelectorAll('[data-modo-login]');

const CAMPOS_LOGIN = {
    email: { id: 'loginEmail', error: 'errorLoginEmail' },
    clave: { id: 'loginClave', error: 'errorLoginClave' }
};

const CAMPOS_REGISTRO = {
    nombre: { id: 'registroNombre', error: 'errorRegistroNombre' },
    email: { id: 'registroEmail', error: 'errorRegistroEmail' },
    telefono: { id: 'registroTelefono', error: 'errorRegistroTelefono' },
    clave: { id: 'registroClave', error: 'errorRegistroClave' }
};

function destinoSeguro(usuario) {
    const volver = new URLSearchParams(window.location.search).get('volver');
    const porDefecto = usuario.role === 'superadmin' ? 'admin/index.html' : 'cuenta.html';

    if (!volver) return rutaConRaiz(porDefecto);

    const limpio = String(volver).trim();

    if (!limpio || /^[a-z][a-z0-9+.-]*:/i.test(limpio) || limpio.startsWith('//') || limpio.startsWith('/')) {
        return rutaConRaiz(porDefecto);
    }

    if (usuario.role !== 'superadmin' && limpio.startsWith('admin/')) {
        return rutaConRaiz('cuenta.html');
    }

    if (limpio.startsWith('login.html')) return rutaConRaiz(porDefecto);

    return rutaConRaiz(limpio);
}

function irAlDestino(usuario) {
    window.location.href = destinoSeguro(usuario);
}

function mostrarModo(modo) {
    const esRegistro = modo === 'registro';

    if (formularioLogin) formularioLogin.hidden = esRegistro;
    if (formularioRegistro) formularioRegistro.hidden = !esRegistro;

    pestanasLogin.forEach(boton => {
        const activo = boton.dataset.modoLogin === modo;

        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-selected', String(activo));
    });

    const titulo = document.getElementById('loginTitulo');

    if (titulo) titulo.textContent = esRegistro ? 'Creá tu cuenta' : 'Ingresá a tu cuenta';

    const primero = esRegistro
        ? document.getElementById('registroNombre')
        : document.getElementById('loginEmail');

    if (primero) primero.focus();
}

function marcarCampo(mapa, campo, mensaje) {
    const definicion = mapa[campo];

    if (!definicion) return false;

    marcarErrorCampo(definicion.id, definicion.error, mensaje);
    document.getElementById(definicion.id).focus();
    return true;
}

function validarLogin() {
    const email = document.getElementById('loginEmail');
    const clave = document.getElementById('loginClave');

    if (!email || !clave) return false;

    limpiarErrores(formularioLogin);

    if (!validarCorreo(email.value.trim())) {
        marcarErrorCampo('loginEmail', 'errorLoginEmail', 'Revisá el correo electrónico');
        email.focus();
        return false;
    }

    if (!clave.value) {
        marcarErrorCampo('loginClave', 'errorLoginClave', 'Escribí tu contraseña');
        clave.focus();
        return false;
    }

    return true;
}

function validarRegistro() {
    const nombre = document.getElementById('registroNombre');
    const email = document.getElementById('registroEmail');
    const telefono = document.getElementById('registroTelefono');
    const clave = document.getElementById('registroClave');
    const clave2 = document.getElementById('registroClave2');

    if (!nombre || !email || !clave || !clave2) return false;

    limpiarErrores(formularioRegistro);

    if (nombre.value.trim().length < 2) {
        marcarErrorCampo('registroNombre', 'errorRegistroNombre', 'Escribí tu nombre');
        nombre.focus();
        return false;
    }

    if (!validarCorreo(email.value.trim())) {
        marcarErrorCampo('registroEmail', 'errorRegistroEmail', 'Revisá el correo electrónico');
        email.focus();
        return false;
    }

    if (telefono && telefono.value.trim() && !validarTelefono(telefono.value)) {
        marcarErrorCampo('registroTelefono', 'errorRegistroTelefono', 'Revisá el teléfono');
        telefono.focus();
        return false;
    }

    if (clave.value.length < 8) {
        marcarErrorCampo('registroClave', 'errorRegistroClave', 'La contraseña debe tener al menos 8 caracteres');
        clave.focus();
        return false;
    }

    if (clave.value !== clave2.value) {
        marcarErrorCampo('registroClave2', 'errorRegistroClave2', 'Las contraseñas no coinciden');
        clave2.focus();
        return false;
    }

    return true;
}

function bloquearBoton(boton, bloqueado, texto) {
    if (!boton) return;

    boton.disabled = bloqueado;

    if (texto) boton.textContent = texto;
}

async function enviarLogin(evento) {
    evento.preventDefault();

    if (!validarLogin()) return;

    const estado = document.getElementById('loginEstado');
    const boton = document.getElementById('loginEnviar');

    bloquearBoton(boton, true, 'Ingresando…');
    mostrarEstadoFormulario(estado, '', '');

    try {
        const datos = await API.post('/api/auth/login', {
            email: document.getElementById('loginEmail').value.trim(),
            clave: document.getElementById('loginClave').value
        });

        irAlDestino(datos.usuario);
    } catch (error) {
        const campo = error.datos && error.datos.campo;

        if (!marcarCampo(CAMPOS_LOGIN, campo, mensajeDeError(error))) {
            mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
        }
    } finally {
        bloquearBoton(boton, false, 'Ingresar');
    }
}

async function enviarRegistro(evento) {
    evento.preventDefault();

    if (!validarRegistro()) return;

    const estado = document.getElementById('registroEstado');
    const boton = document.getElementById('registroEnviar');
    const telefono = document.getElementById('registroTelefono');

    bloquearBoton(boton, true, 'Creando cuenta…');
    mostrarEstadoFormulario(estado, '', '');

    try {
        const datos = await API.post('/api/auth/registro', {
            nombre: document.getElementById('registroNombre').value.trim(),
            email: document.getElementById('registroEmail').value.trim(),
            telefono: telefono && telefono.value.trim() ? telefono.value.trim() : undefined,
            clave: document.getElementById('registroClave').value
        });

        irAlDestino(datos.usuario);
    } catch (error) {
        const campo = error.datos && error.datos.campo;

        if (!marcarCampo(CAMPOS_REGISTRO, campo, mensajeDeError(error))) {
            mostrarEstadoFormulario(estado, mensajeDeError(error), 'error');
        }
    } finally {
        bloquearBoton(boton, false, 'Crear cuenta');
    }
}

pestanasLogin.forEach(boton => {
    boton.addEventListener('click', () => mostrarModo(boton.dataset.modoLogin));
});

if (formularioLogin) formularioLogin.addEventListener('submit', enviarLogin);
if (formularioRegistro) formularioRegistro.addEventListener('submit', enviarRegistro);

cuandoConfigLista(config => {
    const pestanaRegistro = document.querySelector('[data-modo-login="registro"]');

    if (pestanaRegistro) pestanaRegistro.hidden = !config.registroAbierto;
});

cuandoSesionLista(usuario => {
    if (usuario) irAlDestino(usuario);
});

mostrarModo('ingresar');
