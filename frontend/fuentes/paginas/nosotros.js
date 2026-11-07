'use strict';

const { NEGOCIO } = require('../../public/js/negocio.js');

module.exports = {
    archivo: 'nosotros.html',
    seccion: 'nosotros',
    titulo: 'Nosotros | ZAPI Vivero Agroecológico',
    descripcion: 'Conocé ZAPI: un vivero agroecológico que ayuda a empezar huertas y jardines con acompañamiento real.',
    contenido: `
<section class="banner-pagina banner-nosotros">
    <div>
        <span class="etiqueta" data-contenido="nosotros.etiqueta">Quiénes somos</span>
        <h1 data-contenido="nosotros.titulo">Empezar tu huerta o jardín puede ser tan simple como abrir una caja.</h1>
        <p data-contenido="nosotros.descripcion">No solo vendemos plantas: te ayudamos a crear tu primer rincón verde y a sostenerlo en el tiempo.</p>
    </div>
    <ul class="banner-ventajas">
        <li><span class="material-symbols-outlined" aria-hidden="true">chat</span> Pedido coordinado por WhatsApp</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span> Envío gratis desde <span data-envio-gratis></span></li>
        <li><span class="material-symbols-outlined" aria-hidden="true">eco</span> Acompañamiento para tu espacio verde</li>
    </ul>
</section>

<section class="seccion nosotros-duelo">
    <article class="panel panel-problema">
        <span class="etiqueta">El problema</span>
        <h2 data-contenido="nosotros.problemaTitulo">La idea entusiasma. El comienzo confunde.</h2>
        <p data-contenido="nosotros.problemaTexto">A casi todos nos gusta tener una huerta o un jardín y cuidarlo nosotros. Pero a la hora de empezar aparecen las dudas. Compramos una planta sin saber cómo cuidarla, se nos muere y lo dejamos.</p>
        <ul class="lista-preguntas">
            <li>¿Qué planto?</li>
            <li>¿Cómo empiezo?</li>
            <li>¿Va a funcionar?</li>
        </ul>
    </article>
    <article class="panel panel-solucion">
        <span class="etiqueta">La solución</span>
        <h2 data-contenido="nosotros.solucionTitulo">Un punto de partida pensado para principiantes.</h2>
        <p data-contenido="nosotros.solucionTexto">En ZAPI no te sumamos una planta más para dejarte solo. Te damos todo listo, explicado y con acompañamiento.</p>
        <ul class="lista-ventajas">
            <li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>Todo listo y explicado, sin decisiones difíciles.</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>Elegido para tu espacio: balcón, patio o jardín.</span></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>Seguimos cerca después de la compra.</span></li>
        </ul>
    </article>
</section>

<section class="seccion nosotros-pilares" aria-labelledby="tituloPilares">
    <div class="seccion-cabecera">
        <span class="etiqueta">Nuestros pilares</span>
        <h2 id="tituloPilares">Tres formas de empezar y de seguir</h2>
    </div>
    <div class="pilares-grid" data-contenido-lista="nosotros.pilares">
        <article><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span><h3>Kits para empezar</h3><p>Semillas orgánicas, sustrato, etiquetas y manual de cultivo. Abrís la caja y plantás.</p></article>
        <article><span class="material-symbols-outlined" aria-hidden="true">local_florist</span><h3>Plantas para tu espacio</h3><p>Producidas con enfoque agroecológico para tu huerta o jardín.</p></article>
        <article><span class="material-symbols-outlined" aria-hidden="true">water_drop</span><h3>Insumos para seguir</h3><p>Recargas y todo lo necesario para que tu espacio siga creciendo.</p></article>
    </div>
</section>

<section class="seccion nosotros-razones" aria-labelledby="tituloRazones">
    <div class="seccion-cabecera">
        <span class="etiqueta">Nuestras razones</span>
        <h2 id="tituloRazones">Por qué elegirnos</h2>
    </div>
    <div class="razones-grid" data-contenido-lista="nosotros.razones">
        <article><span aria-hidden="true">01</span><h3>Producción propia</h3><p>Producimos con enfoque agroecológico y elegimos el resto con criterio.</p></article>
        <article><span aria-hidden="true">02</span><h3>Diseño de punta a punta</h3><p>Del logo a la maceta: cuidamos cada detalle del producto.</p></article>
        <article><span aria-hidden="true">03</span><h3>Pensado para empezar de cero</h3><p>Sin dudas ni decisiones difíciles: todo llega listo y explicado.</p></article>
        <article><span aria-hidden="true">04</span><h3>Seguimos cerca después</h3><p>Te acompañamos para que tu huerta o jardín prosperen.</p></article>
    </div>
</section>

<section class="seccion nosotros-equipo" aria-labelledby="tituloEquipo">
    <div class="seccion-cabecera">
        <span class="etiqueta">Conocenos</span>
        <h2 id="tituloEquipo">El equipo</h2>
    </div>
    <div class="equipo-grid" data-contenido-lista="nosotros.equipo">
        <article class="persona">
            <span class="persona-avatar" aria-hidden="true">ML</span>
            <div><h3>Marcio Lahouratate</h3><p class="persona-rol">Producción y logística</p><p>Auxiliar técnico agrario y técnico en marketing. Estudia Ingeniería Agronómica y Desarrollo de Software.</p></div>
        </article>
        <article class="persona">
            <span class="persona-avatar" aria-hidden="true">PS</span>
            <div><h3>Pablo Souza</h3><p class="persona-rol">Administración y contabilidad</p><p>Auxiliar técnico administrativo. Estudia Contador Público y Técnico Administrativo.</p></div>
        </article>
    </div>
</section>

<section class="seccion nosotros-ubicacion" aria-labelledby="tituloUbicacion">
    <div class="ubicacion-info">
        <span class="etiqueta">Visitanos</span>
        <h2 id="tituloUbicacion">Dónde encontrarnos</h2>
        <p><span class="material-symbols-outlined" aria-hidden="true">location_on</span> ${NEGOCIO.direccion}</p>
        <a class="boton boton-secundario" href="https://www.google.com/maps/search/?api=1&amp;query=Congreso%20de%20Abril%2C%20Montevideo%2C%20Uruguay" target="_blank" rel="noopener noreferrer">
            <span class="material-symbols-outlined" aria-hidden="true">map</span> Abrir en Maps
        </a>
        <a class="enlace-flecha" href="./contacto.html">Coordinar una visita <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
    </div>
    <div class="ubicacion-mapa">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2998.275360784418!2d-56.2904353244652!3d-34.81855576887559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a1d3ff57bd9c4d%3A0x1cf65c4ff11dbdd6!2sCongreso%20de%20Abril%2C%2012600%20Montevideo%2C%20Departamento%20de%20Montevideo!5e1!3m2!1ses-419!2suy!4v1791834277368!5m2!1ses-419!2suy" title="Mapa de la ubicación de ZAPI en Montevideo" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
</section>`,
    scripts: []
};
