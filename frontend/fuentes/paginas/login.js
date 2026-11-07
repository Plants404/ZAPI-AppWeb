'use strict';

module.exports = {
    archivo: 'login.html',
    seccion: 'login',
    titulo: 'Ingresar | ZAPI Vivero Agroecológico',
    descripcion: 'Ingresá a tu cuenta de ZAPI para seguir tus pedidos o administrar el vivero.',
    robots: 'noindex, nofollow',
    contenido: `
<section class="login-pagina">
    <aside class="login-presentacion">
        <span class="etiqueta">Tu espacio verde</span>
        <h1>Todo tu jardín, en un solo lugar.</h1>
        <p>Con tu cuenta podés seguir tus pedidos, cancelarlos mientras están pendientes y compartir tu experiencia con otros clientes.</p>
        <ul class="lista-ventajas">
            <li><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span><span>Historial y detalle de cada pedido.</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span><span>Seguimiento del estado de tu entrega.</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">rate_review</span><span>Opiniones moderadas por el equipo.</span></li>
        </ul>
        <p class="login-nota">¿Todavía no compraste? <a class="enlace-flecha" href="./catalogo.html">Explorá el catálogo <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a></p>
    </aside>

    <div class="login-card">
        <div class="login-pestanas" role="tablist" aria-label="Acceso o registro">
            <button class="login-pestana activo" type="button" role="tab" aria-selected="true" data-modo-login="ingresar">Ingresar</button>
            <button class="login-pestana" type="button" role="tab" aria-selected="false" data-modo-login="registro">Crear cuenta</button>
        </div>

        <h2 id="loginTitulo">Ingresá a tu cuenta</h2>

        <form class="login-form" id="loginForm" novalidate>
            <label class="campo-label" for="loginEmail">Correo electrónico</label>
            <input class="campo-input" id="loginEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="160" aria-describedby="errorLoginEmail">
            <span class="campo-error" id="errorLoginEmail"></span>

            <label class="campo-label" for="loginClave">Contraseña</label>
            <input class="campo-input" id="loginClave" name="clave" type="password" autocomplete="current-password" maxlength="128" aria-describedby="errorLoginClave">
            <span class="campo-error" id="errorLoginClave"></span>

            <p class="formulario-estado" id="loginEstado" role="status" aria-live="polite" hidden></p>
            <button class="boton boton-primario boton-bloque" id="loginEnviar" type="submit">Ingresar</button>
        </form>

        <form class="login-form" id="registroForm" novalidate hidden>
            <label class="campo-label" for="registroNombre">Nombre y apellido</label>
            <input class="campo-input" id="registroNombre" name="nombre" type="text" autocomplete="name" maxlength="120" aria-describedby="errorRegistroNombre">
            <span class="campo-error" id="errorRegistroNombre"></span>

            <label class="campo-label" for="registroEmail">Correo electrónico</label>
            <input class="campo-input" id="registroEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="160" aria-describedby="errorRegistroEmail">
            <span class="campo-error" id="errorRegistroEmail"></span>

            <label class="campo-label" for="registroTelefono">Teléfono (opcional)</label>
            <input class="campo-input" id="registroTelefono" name="telefono" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" aria-describedby="errorRegistroTelefono">
            <span class="campo-error" id="errorRegistroTelefono"></span>

            <label class="campo-label" for="registroClave">Contraseña</label>
            <input class="campo-input" id="registroClave" name="clave" type="password" autocomplete="new-password" minlength="8" maxlength="128" aria-describedby="errorRegistroClave">
            <span class="campo-error" id="errorRegistroClave"></span>

            <label class="campo-label" for="registroClave2">Repetí la contraseña</label>
            <input class="campo-input" id="registroClave2" name="clave2" type="password" autocomplete="new-password" minlength="8" maxlength="128" aria-describedby="errorRegistroClave2">
            <span class="campo-error" id="errorRegistroClave2"></span>

            <p class="formulario-estado" id="registroEstado" role="status" aria-live="polite" hidden></p>
            <button class="boton boton-primario boton-bloque" id="registroEnviar" type="submit">Crear cuenta</button>
        </form>

        <p class="login-legal">Al crear una cuenta aceptás que usemos tus datos para gestionar tus pedidos. Nunca compartimos tu información.</p>
    </div>
</section>`,
    scripts: ['login.js']
};
