'use strict';

const SERVICIOS = [
    ['support_agent', 'Asesoramiento personalizado', 'Guía paso a paso adaptada a tu espacio y tu tiempo.'],
    ['yard', 'Diseño de jardines', 'Planificación estética y funcional para patios y balcones.'],
    ['agriculture', 'Huertas familiares', 'Proyectamos tu huerta urbana para cosechar alimentos en casa.'],
    ['local_florist', 'Selección de especies', 'Elegimos las plantas ideales según la luz y el clima de tu espacio.'],
    ['grass', 'Mantenimiento', 'Podas, nutrición del suelo y control orgánico de plagas.'],
    ['apartment', 'Proyectos para empresas', 'Ambientación verde para oficinas, comercios e instituciones.'],
    ['school', 'Talleres y capacitaciones', 'Aprendé siembra, compostaje y cuidados paso a paso.'],
    ['request_quote', 'Propuestas a medida', 'Contanos tu idea y armamos una solución personalizada.']
];

module.exports = {
    archivo: 'servicios.html',
    seccion: 'servicios',
    titulo: 'Servicios | ZAPI Vivero Agroecológico',
    descripcion: 'Asesoramiento, diseño de jardines y huertas, mantenimiento y proyectos verdes en Montevideo.',
    contenido: `
<section class="banner-pagina">
    <div>
        <span class="etiqueta" data-contenido="servicios.etiqueta">Servicios</span>
        <h1 data-contenido="servicios.titulo">Soluciones para cada proyecto.</h1>
        <p data-contenido="servicios.descripcion">Además de vender plantas, te ayudamos a planificar, desarrollar y mantener espacios verdes de forma eficiente.</p>
    </div>
    <ul class="banner-ventajas">
        <li><span class="material-symbols-outlined" aria-hidden="true">verified_user</span> Presupuesto claro y sin compromiso</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">eco</span> Enfoque 100% agroecológico</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">location_on</span> Atención cercana en Montevideo</li>
    </ul>
</section>

<section class="seccion servicios" aria-labelledby="tituloServicios">
    <div class="seccion-cabecera">
        <span class="etiqueta">Cómo trabajamos</span>
        <h2 id="tituloServicios">Del diagnóstico al cuidado cotidiano</h2>
        <p>Cada propuesta parte de tu espacio, tu tiempo disponible y el uso que querés darle.</p>
    </div>
    <div class="servicios-grid" data-contenido-lista="servicios.items">
${SERVICIOS.map(([icono, titulo, texto], indice) => `
        <article class="servicio-card">
            <div class="servicio-icono"><span class="material-symbols-outlined" aria-hidden="true">${icono}</span></div>
            <span class="servicio-numero" aria-hidden="true">${String(indice + 1).padStart(2, '0')}</span>
            <h3>${titulo}</h3>
            <p>${texto}</p>
            <a class="enlace-flecha" href="./contacto.html">Consultar <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
        </article>`).join('')}
    </div>
</section>

<section class="seccion servicios-cierre">
    <div>
        <span class="etiqueta">¿Necesitás algo a medida?</span>
        <h2>Contanos tu idea y la convertimos en un proyecto.</h2>
        <p>Respondemos consultas de hogares, empresas e instituciones de Montevideo.</p>
    </div>
    <a class="boton boton-primario" href="./contacto.html">Pedir presupuesto</a>
</section>`,
    scripts: []
};
