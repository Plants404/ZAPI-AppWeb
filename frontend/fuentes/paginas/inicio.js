'use strict';

const { NEGOCIO } = require('../../public/js/negocio.js');

module.exports = {
    archivo: 'index.html',
    seccion: 'inicio',
    titulo: 'ZAPI | Vivero agroecológico en Montevideo',
    descripcion: 'Plantas, kits de huerta y acompañamiento para crear y mantener espacios verdes en Montevideo.',
    contenido: `
<section class="hero">
    <div class="hero-copy">
        <span class="etiqueta" data-contenido="portada.etiqueta">Vivero agroecológico · Montevideo</span>
        <h1 data-contenido="portada.titulo">Transformamos espacios con naturaleza.</h1>
        <p class="hero-lead" data-contenido="portada.subtitulo">En <strong>ZAPI</strong> conectamos a las personas con la naturaleza a través de soluciones agroecológicas integrales.</p>
        <ul class="hero-beneficios" data-contenido-lista="portada.beneficios">
            <li><span class="material-symbols-outlined" aria-hidden="true">verified</span> Plantas de calidad, cuidadosamente seleccionadas.</li>
            <li><span class="material-symbols-outlined" aria-hidden="true">support_agent</span> Asesoramiento profesional, paso a paso.</li>
            <li><span class="material-symbols-outlined" aria-hidden="true">water_drop</span> Cuidado simple para que tu espacio prospere.</li>
        </ul>
        <div class="hero-acciones">
            <a class="boton boton-primario" href="./catalogo.html">Explorar catálogo</a>
            <a class="boton boton-secundario" href="./servicios.html">Conocer nuestros servicios</a>
        </div>
    </div>
    <div class="hero-visual">
        <img src="./public/img/plants-hero.opt.jpg" alt="Plantas de interior verdes en un ambiente luminoso" width="1200" height="800" fetchpriority="high" data-contenido-imagen="portada.imagen">
        <p class="hero-sello"><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span> <span data-contenido="portada.sello">Envío gratis desde $${NEGOCIO.envioGratis.toLocaleString('es-UY')}</span></p>
    </div>
</section>

<section class="seccion destacados" aria-labelledby="tituloDestacados">
    <div class="seccion-cabecera seccion-cabecera-fila">
        <div>
            <span class="etiqueta">Elegidos para empezar</span>
            <h2 id="tituloDestacados">Productos destacados</h2>
        </div>
        <a class="enlace-flecha" href="./catalogo.html">Ver todo el catálogo <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
    </div>
    <div class="productos-grid" id="productosDestacados"></div>
</section>

<section class="seccion testimonios" aria-labelledby="tituloTestimonios">
    <div class="seccion-cabecera">
        <span class="etiqueta">Testimonios</span>
        <h2 id="tituloTestimonios">Lo que dicen nuestros clientes</h2>
        <p>Historias de quienes ya transformaron sus espacios con ZAPI.</p>
    </div>
    <div id="testimoniosLista"></div>
    <div class="testimonios-accion">
        <button class="boton boton-secundario" type="button" data-abrir-testimonio>
            <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
            Dejar mi opinión
        </button>
    </div>
</section>`,
    scripts: ['inicio.js', 'testimonios.js']
};
