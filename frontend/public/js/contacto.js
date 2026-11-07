'use strict';

/* Formulario de contacto. Si EmailJS esta configurado se envia por correo;
   si no, se abre WhatsApp con la consulta precargada. */

const formularioContacto = document.getElementById('contactoForm');

const CAMPOS_CONTACTO = [
    { id: 'contactoNombre', error: 'errorNombre', vacio: 'Escribí tu nombre', corto: 'Escribí tu nombre completo', minimo: 2 },
    { id: 'contactoCorreo', error: 'errorCorreo', vacio: 'Escribí tu correo electrónico', corto: 'Revisá el correo electrónico', tipo: 'correo' },
    { id: 'contactoAsunto', error: 'errorAsunto', vacio: 'Escribí el asunto', corto: 'Escribí un asunto más descriptivo', minimo: 3 },
    { id: 'contactoTelefono', error: 'errorTelefono', vacio: '', corto: 'Revisá el teléfono de contacto', tipo: 'telefono', opcional: true },
    { id: 'contactoConsulta', error: 'errorConsulta', vacio: 'Contanos sobre tu consulta', corto: 'Contanos un poco más sobre tu consulta', minimo: 10 }
];

function revisarCampoContacto(campo) {
    const entrada = document.getElementById(campo.id);

    if (!entrada) return '';

    const valor = entrada.value.trim();

    if (!valor) {
        const mensaje = campo.opcional ? '' : campo.vacio;

        marcarErrorCampo(campo.id, campo.error, mensaje);
        return mensaje;
    }

    if (campo.tipo === 'correo' && !validarCorreo(valor)) {
        marcarErrorCampo(campo.id, campo.error, campo.corto);
        return campo.corto;
    }

    if (campo.tipo === 'telefono' && !validarTelefono(valor)) {
        marcarErrorCampo(campo.id, campo.error, campo.corto);
        return campo.corto;
    }

    if (campo.minimo && valor.length < campo.minimo) {
        marcarErrorCampo(campo.id, campo.error, campo.corto);
        return campo.corto;
    }

    marcarErrorCampo(campo.id, campo.error, '');
    return '';
}

function leerCampoContacto(id) {
    const campo = document.getElementById(id);
    return campo ? limpiarValor(campo.value) : '';
}

function datosDeContacto() {
    return {
        nombre: leerCampoContacto('contactoNombre'),
        email: leerCampoContacto('contactoCorreo'),
        asunto: leerCampoContacto('contactoAsunto'),
        telefono: leerCampoContacto('contactoTelefono'),
        mensaje: leerCampoContacto('contactoConsulta')
    };
}

function actualizarContadorContacto() {
    const consulta = document.getElementById('contactoConsulta');
    const contador = document.getElementById('contactoContador');

    if (!consulta || !contador) return;

    const limite = Number(consulta.getAttribute('maxlength')) || 2000;
    const restantes = Math.max(0, limite - consulta.value.length);

    contador.textContent = restantes + '/' + limite;
    contador.classList.toggle('contador-cerca', restantes <= 100);
}

function mostrarConfirmacionContacto() {
    const panel = document.getElementById('contactoOk');
    const titulo = document.getElementById('contactoOkTitulo');

    if (formularioContacto) formularioContacto.hidden = true;
    if (panel) panel.hidden = false;
    if (titulo) titulo.focus();
}

function reiniciarContacto() {
    const panel = document.getElementById('contactoOk');

    if (formularioContacto) {
        formularioContacto.reset();
        formularioContacto.hidden = false;
        limpiarErrores(formularioContacto);
    }

    if (panel) panel.hidden = true;

    mostrarEstadoFormulario(document.getElementById('contactoEstado'), '', '');
    actualizarContadorContacto();

    const nombre = document.getElementById('contactoNombre');
    if (nombre) nombre.focus();
}

function mensajeDeContacto(datos) {
    const partes = [
        'Hola ZAPI, tengo una consulta:',
        '',
        'Nombre: ' + datos.nombre,
        'Correo: ' + datos.email,
        'Telefono: ' + datos.telefono,
        'Asunto: ' + datos.asunto,
        '',
        'Mensaje:',
        datos.mensaje
    ];

    return partes.filter(Boolean).join('\n');
}

async function enviarContacto(evento) {
    evento.preventDefault();

    const estado = document.getElementById('contactoEstado');
    const boton = document.getElementById('contactoEnviar');
    const textoBoton = document.getElementById('contactoEnviarTexto');
    const sitio = document.getElementById('contactoSitio');

    if (!formularioContacto) return;

    limpiarErrores(formularioContacto);

    let primerError = null;

    for (const campo of CAMPOS_CONTACTO) {
        if (revisarCampoContacto(campo) && !primerError) primerError = campo.id;
    }

    if (primerError) {
        mostrarEstadoFormulario(estado, 'Revisá los campos marcados.', 'error');
        document.getElementById(primerError).focus();
        return;
    }

    if (sitio && sitio.value.trim()) return;

    const datos = datosDeContacto();

    if (boton) boton.disabled = true;
    if (textoBoton) textoBoton.textContent = 'Enviando…';
    mostrarEstadoFormulario(estado, '', '');

    try {
        const configurado = await enviarCorreoEmailJS(NEGOCIO.emailjs.plantillaContacto, {
            nombre: datos.nombre,
            email: datos.email,
            telefono: datos.telefono,
            asunto: datos.asunto,
            mensaje: datos.mensaje
        });

        if (configurado) {
            formularioContacto.reset();
            actualizarContadorContacto();
            mostrarConfirmacionContacto();
            return;
        }
    } catch {
        /* Si EmailJS falla o no esta configurado, se abre WhatsApp. */
    }

    abrirWhatsApp(mensajeDeContacto(datos), true);
    mostrarEstadoFormulario(estado, 'Te respondemos por WhatsApp.');

    if (boton) boton.disabled = false;
    if (textoBoton) textoBoton.textContent = 'Enviar mensaje';
}

if (formularioContacto) {
    formularioContacto.addEventListener('submit', enviarContacto);

    CAMPOS_CONTACTO.forEach(campo => {
        const entrada = document.getElementById(campo.id);

        if (!entrada) return;

        entrada.addEventListener('input', () => {
            if (entrada.getAttribute('aria-invalid') === 'true') {
                marcarErrorCampo(campo.id, campo.error, '');
            }
        });

        entrada.addEventListener('blur', () => {
            if (entrada.value.trim()) revisarCampoContacto(campo);
        });
    });

    const consulta = document.getElementById('contactoConsulta');

    if (consulta) consulta.addEventListener('input', actualizarContadorContacto);

    const reiniciar = document.getElementById('contactoReiniciar');

    if (reiniciar) reiniciar.addEventListener('click', reiniciarContacto);

    actualizarContadorContacto();
}
