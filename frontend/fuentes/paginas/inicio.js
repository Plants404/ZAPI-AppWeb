'use strict';

module.exports = {
    archivo: 'index.html',
    seccion: 'inicio',
    titulo: 'ZAPI | Vivero agroecológico en Montevideo',
    descripcion: 'Plantas, kits de huerta y acompañamiento para crear y mantener espacios verdes en Montevideo.',
    productos: true,
    opiniones: true,
    contenido: `
<section class="section hero" id="inicio">
    <div class="hero-grid">
      <div class="hero-copy">
        <h1>Transformamos espacios con naturaleza.</h1>
        <p class="hero-lead">En <strong>ZAPI</strong> conectamos a las personas con la naturaleza a traves de soluciones agroecologicas integrales.</p>
        <ul class="hero-features hero-beneficios">
            <li><strong>Plantas de calidad:</strong> Cuidadosamente seleccionadas.</li>
            <li><strong>Asesoramiento profesional:</strong> Paso a paso.</li>
            <li><strong>Cuidado simple:</strong> Para que tu espacio prospere.</li>
        </ul>
        <div class="hero-ctas">
            <a class="boton boton-primario" href="./catalogo.html">Explorar catalogo</a>
            <a class="boton boton-secundario" href="./servicios.html">Conocer nuestros servicios</a>
        </div>
      </div>
      <img src="./public/img/plants-hero.opt.jpg" alt="Plantas de interior verdes en un ambiente luminoso" width="1200" height="800" fetchpriority="high">
    </div>

    <div class="home-products-carousel" role="region" aria-label="Productos destacados">
        <div class="carousel-header">
            <h2>Productos destacados</h2>
        </div>
        <div class="carousel-viewport">
            <div class="carousel-track" id="productosDestacados"></div>
        </div>
    </div>
</section>

<section class="section testimonios" id="testimonios" data-parte-de="inicio">
    <div class="testimonios-cabecera">
        <span class="contacto-eyebrow">TESTIMONIOS</span>
        <h2>Lo que dicen nuestros clientes</h2>
        <p>Historias de quienes ya transformaron sus espacios con ZAPI.</p>
    </div>
    <div class="testimonios-grilla" id="testimoniosLista" role="list" aria-label="Testimonios de clientes">
        <p class="estado-vacio">Todavía no publicamos opiniones. Si compraste con nosotros, nos encantara leer tu experiencia.</p>
    </div>
    <div class="testimonios-accion">
        <button class="btn-testimonio boton boton-secundario" type="button" data-abrir-testimonio>
            <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
            Dejar mi opinion
        </button>
    </div>
</section>`,
    scripts: ['inicio.js', 'testimonios.js']
};
