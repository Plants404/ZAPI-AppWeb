'use strict';

module.exports = {
    archivo: 'catalogo.html',
    seccion: 'catalogo',
    titulo: 'Catálogo | ZAPI Vivero Agroecológico',
    descripcion: 'Plantas, aromáticas, suculentas y kits de huerta de ZAPI. Precios fijos y stock actualizado.',
    contenido: `
<section class="banner-pagina">
    <div>
        <span class="etiqueta">Catálogo vivo</span>
        <h1>Elegí hoy tus plantas.</h1>
        <p>Nosotros preparamos todo; vos solo disfrutás el proceso. Precios fijos y stock real de nuestro vivero en Montevideo.</p>
    </div>
    <ul class="banner-ventajas">
        <li><span class="material-symbols-outlined" aria-hidden="true">verified</span> Precios fijos, garantizados</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span> Stock actualizado</li>
        <li><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span> Envío gratis desde <span data-envio-gratis></span></li>
    </ul>
</section>

<section class="catalogo" aria-labelledby="tituloCatalogo">
    <div class="seccion-cabecera">
        <span class="etiqueta">Explorá por categoría</span>
        <h2 id="tituloCatalogo">Nuestros productos</h2>
    </div>
    <div class="catalogo-filtros" id="catalogFilters" role="group" aria-label="Filtrar productos por categoría"></div>
    <p class="catalogo-conteo" id="catalogCount" aria-live="polite"></p>
    <div class="productos-grid" id="productGrid"></div>
</section>`,
    scripts: ['catalogo.js']
};
