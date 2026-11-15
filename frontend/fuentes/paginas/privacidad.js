'use strict';

module.exports = {
    archivo: 'privacidad.html',
    seccion: 'privacidad',
    titulo: 'Privacidad | ZAPI',
    descripcion: 'Qué registramos, para qué y durante cuánto tiempo se guardan los datos.',
    contenido: `
<section class="hero-pagina">
    <div>
        <span class="etiqueta">Privacidad</span>
        <h1>Privacidad</h1>
        <p>Qué registramos, para qué y durante cuánto tiempo se guardan los datos.</p>
    </div>
</section>

<section class="seccion privacidad" aria-labelledby="tituloResponsable">
    <div class="seccion-cabecera">
        <span class="etiqueta">Responsable</span>
        <h2 id="tituloResponsable">Responsable</h2>
    </div>
    <p>ZAPI · Vivero Agroecológico<br>
    Congreso de Abril, Montevideo, Uruguay<br>
    Contacto: hola@zapi.uy · WhatsApp 098 268 560<br>
    Sitio: https://zapi.uy</p>
</section>

<section class="seccion privacidad">
    <div class="seccion-cabecera">
        <span class="etiqueta">Analítica de clientes</span>
        <h2>Analítica de clientes</h2>
    </div>
    <p>La analítica de este sitio no usa cookies. Si iniciás sesión, usamos una cookie técnica de sesión, necesaria para mantenerte conectado; no se usa para analítica.</p>
    <p>Registramos eventos anónimos de navegación para mejorar la tienda y el panel de administración. Los eventos se envían a los servidores de ZAPI.</p>
    <h3>Lo que se registra:</h3>
    <ul class="lista-ventajas">
        <li>Tipo de evento (lista cerrada): vista de página, clic en elemento clave, agregar al carrito, inicio de pedido, clic a WhatsApp.</li>
        <li>Identificador aleatorio de sesión del navegador. No es tu nombre, correo ni teléfono.</li>
        <li>Página visitada y elemento clickeado.</li>
        <li>Tipo de dispositivo: computadora o móvil.</li>
        <li>Fecha y hora del evento.</li>
    </ul>
    <p>La dirección IP no se guarda en la base de datos. El servidor la usa momentáneamente solo para limitar abusos, y el servicio de alojamiento puede registrar datos técnicos propios. Los eventos se borran automáticamente a los 90 días.</p>
    <p>El identificador se borra al cerrar la pestaña del navegador.</p>
</section>

<section class="seccion privacidad">
    <div class="seccion-cabecera">
        <span class="etiqueta">Pedidos y consultas</span>
        <h2>Pedidos y consultas</h2>
    </div>
    <p>Cuando armás un pedido, te pedimos nombre, teléfono, correo electrónico (opcional), zona y notas. Esos datos se usan solo para gestionar tu pedido. Se guardan en tu navegador, en "Mis pedidos", y se abre WhatsApp con el mensaje listo para que lo envíes; si lo envías, queda en la cuenta de WhatsApp de ZAPI.</p>
    <p>Cuando escribís una consulta, te pedimos nombre, correo electrónico, asunto, mensaje y, si querés, teléfono. Se usan solo para responderte. Se abre WhatsApp con tu mensaje listo para enviar; si lo envías, queda en la cuenta de WhatsApp de ZAPI.</p>
    <p>Cuando dejás una opinión, te pedimos nombre, lugar (opcional), texto y puntaje; funciona igual que una consulta.</p>
</section>

<section class="seccion privacidad">
    <div class="seccion-cabecera">
        <span class="etiqueta">Conservación de tus datos</span>
        <h2>Conservación de tus datos</h2>
    </div>
    <p>Lo que queda en tu navegador lo podés borrar vos en cualquier momento limpiando los datos del sitio. Las conversaciones de WhatsApp las conservamos hasta 1 año, salvo que nos pidas eliminarlas antes. Cuando ZAPI registre datos personales en su propio sistema, los conservará 1 año y luego los eliminará o los anonimizará, dejando solo montos y fechas para estadísticas del negocio.</p>
</section>
`,
    scripts: []
};
