'use strict';

const { NEGOCIO } = require('../../public/js/negocio.js');

module.exports = {
    archivo: 'contacto.html',
    seccion: 'contacto',
    titulo: 'Contacto | ZAPI Vivero Agroecologico',
    descripcion: 'Escribinos por consultas, proyectos de jardín o pedidos especiales. ZAPI responde en Montevideo.',
    contenido: `
<section class="banner-pagina">
    <div>
        <span class="etiqueta">Contacto</span>
        <h1>Empezá hoy a transformar tus espacios.</h1>
        <p>Contanos qué necesitás y te respondemos a la brevedad. También podés coordinar todo directamente por WhatsApp.</p>
    </div>
    <ul class="banner-ventajas">
        <li><span class="material-symbols-outlined" aria-hidden="true">verified_user</span> Presupuesto claro y personalizado</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">eco</span> Asesoramiento agroecológico</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">location_on</span> Atención cercana en Montevideo</li>
    </ul>
</section>

<section class="contacto-pagina">
    <aside class="contacto-info">
        <span class="etiqueta">Atención directa</span>
        <h2>Hablemos de tu espacio.</h2>
        <p>Respondemos consultas de hogares, empresas e instituciones. Si preferís una respuesta más rápida, escribinos por WhatsApp.</p>
        <ul class="contacto-datos">
            <li><span class="material-symbols-outlined" aria-hidden="true">chat</span><div><strong>WhatsApp</strong><a href="https://wa.me/${NEGOCIO.whatsapp}" target="_blank" rel="noopener">${NEGOCIO.whatsappVisible}</a></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">mail</span><div><strong>Correo</strong><a href="mailto:${NEGOCIO.email}">${NEGOCIO.email}</a></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">location_on</span><div><strong>Ubicación</strong><span>${NEGOCIO.direccion}</span></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">schedule</span><div><strong>Visitas</strong><span>Visitas coordinadas previamente por WhatsApp.</span></div></li>
        </ul>
        <a class="boton boton-primario boton-bloque" href="https://wa.me/${NEGOCIO.whatsapp}" target="_blank" rel="noopener">
            <span class="material-symbols-outlined" aria-hidden="true">chat</span> Escribir por WhatsApp
        </a>
    </aside>

    <div class="contacto-card">
        <div class="contacto-card-cabecera">
            <span class="etiqueta">Escribinos</span>
            <h2>Contanos qué necesitás.</h2>
        </div>

        <form class="contacto-form" id="contactoForm" novalidate>
            <div class="form-fila">
                <div>
                    <label class="campo-label" for="contactoNombre">Nombre <span aria-hidden="true">*</span></label>
                    <input class="campo-input" id="contactoNombre" name="nombre" type="text" autocomplete="name" maxlength="120" aria-describedby="errorNombre">
                    <span class="campo-error" id="errorNombre"></span>
                </div>
                <div>
                    <label class="campo-label" for="contactoCorreo">Correo electrónico <span aria-hidden="true">*</span></label>
                    <input class="campo-input" id="contactoCorreo" name="correo" type="email" autocomplete="email" maxlength="160" aria-describedby="errorCorreo">
                    <span class="campo-error" id="errorCorreo"></span>
                </div>
            </div>

            <div class="form-fila">
                <div>
                    <label class="campo-label" for="contactoAsunto">Asunto <span aria-hidden="true">*</span></label>
                    <input class="campo-input" id="contactoAsunto" name="asunto" type="text" maxlength="160" aria-describedby="errorAsunto">
                    <span class="campo-error" id="errorAsunto"></span>
                </div>
                <div>
                    <label class="campo-label" for="contactoTelefono">Teléfono (opcional)</label>
                    <input class="campo-input" id="contactoTelefono" name="telefono" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" aria-describedby="errorTelefono">
                    <span class="campo-error" id="errorTelefono"></span>
                </div>
            </div>

            <label class="campo-label" for="contactoConsulta">Mensaje <span aria-hidden="true">*</span></label>
            <textarea class="campo-input" id="contactoConsulta" name="consulta" rows="6" maxlength="2000" aria-describedby="errorConsulta contactoContador"></textarea>
            <span class="campo-error" id="errorConsulta"></span>
            <span class="contacto-contador" id="contactoContador">2000/2000</span>

            <div class="visually-hidden" aria-hidden="true">
                <label for="contactoSitio">Dejá este campo vacío</label>
                <input id="contactoSitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
            </div>

            <p class="formulario-estado" id="contactoEstado" role="status" aria-live="polite" hidden></p>
            <div class="contacto-pie">
                <p class="privacy-note">Tus datos solo se usan para responderte esta consulta. Los campos con * son obligatorios.</p>
                <button class="boton boton-primario" id="contactoEnviar" type="submit"><span id="contactoEnviarTexto">Enviar mensaje</span></button>
            </div>
        </form>

        <div class="contacto-confirmacion" id="contactoOk" hidden>
            <span class="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
            <h3 id="contactoOkTitulo" tabindex="-1">¡Gracias por escribirnos!</h3>
            <p>Recibimos tu consulta y te responderemos a la brevedad.</p>
            <button class="boton boton-secundario" id="contactoReiniciar" type="button">Enviar otra consulta</button>
        </div>
    </div>
</section>`,
    scripts: ['contacto.js']
};
