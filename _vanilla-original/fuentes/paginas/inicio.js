'use strict';

const { TESTIMONIOS } = require('../../datos/testimonios.js');

const escapar = texto => String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const tarjetaTestimonio = t => `
        <article class="resena-tarjeta" role="listitem">
            <p class="resena-estrellas" role="img" aria-label="${t.estrellas} de 5 estrellas">${'★'.repeat(t.estrellas)}${'☆'.repeat(5 - t.estrellas)}</p>
            <blockquote class="resena-texto">${escapar(t.texto)}</blockquote>
            <footer class="resena-autor">
                <strong>${escapar(t.autor)}</strong>
                <span>${escapar(t.lugar)}${t.producto ? ' · ' + escapar(t.producto) : ''}</span>
            </footer>
        </article>`;

const listaTestimonios = TESTIMONIOS.length
    ? TESTIMONIOS.map(tarjetaTestimonio).join('')
    : '<p class="estado-vacio">Todavía no publicamos opiniones. Si compraste con nosotros, nos encantara leer tu experiencia.</p>';

module.exports = {
    archivo: 'index.html',
    seccion: 'inicio',
    titulo: 'ZAPI | Vivero agroecológico en Montevideo',
    descripcion: 'Plantas, kits de huerta y acompañamiento para crear y mantener espacios verdes en Montevideo.',
    productos: true,
    opiniones: true,
    contenido: `
<section class="hero" id="inicio">
    <div class="hero-grid">
      <div class="hero-copy">
        <h1>Transformamos espacios con naturaleza.</h1>
        <p class="hero-lead">En <strong>ZAPI</strong> conectamos a las personas con la naturaleza a través de soluciones agroecológicas integrales.</p>
        <ul class="hero-features hero-beneficios">
            <li><span aria-hidden="true">✓</span><span><strong>Plantas de calidad:</strong> Cuidadosamente seleccionadas.</span></li>
            <li><span aria-hidden="true">✓</span><span><strong>Asesoramiento profesional:</strong> Paso a paso.</span></li>
            <li><span aria-hidden="true">✓</span><span><strong>Cuidado simple:</strong> Para que tu espacio prospere.</span></li>
        </ul>
        <div class="hero-ctas">
            <a class="boton boton-primario" href="./catalogo.html">Explorar catálogo</a>
            <a class="boton boton-secundario" href="./servicios.html">Conocer nuestros servicios</a>
        </div>
      </div>
      <img class="hero-visual" src="./public/img/plants-hero.opt.jpg" alt="Plantas de interior verdes en un ambiente luminoso" width="1200" height="800" fetchpriority="high">
    </div>

    <div class="destacados home-products-carousel" role="region" aria-label="Productos destacados">
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
    <div class="testimonios-grilla" id="testimoniosLista" role="list" aria-label="Testimonios de clientes">${listaTestimonios}
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
