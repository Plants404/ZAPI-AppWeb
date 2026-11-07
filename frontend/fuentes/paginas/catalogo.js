'use strict';

module.exports = {
    archivo: 'catalogo.html',
    seccion: 'catalogo',
    titulo: 'Catalogo | ZAPI Vivero Agroecologico',
    descripcion: 'Plantas, aromaticas, suculentas y kits de huerta de ZAPI. Precios fijos y stock actualizado.',
    productos: true,
    contenido: `
<section class="section catalog" id="catalogo">
    <div class="catalog-header zapi-hero-banner">
        <div class="zapi-hero-grid">
            <div class="zapi-hero-content">
                <h1 class="zapi-hero-title">CATÁLOGO VIVO</h1>
                <p class="zapi-hero-description">Elegí hoy tus plantas. Nosotros preparamos todo; vos solo disfrutás el proceso.</p>
            </div>
            <div class="zapi-hero-trust">
                <div class="zapi-hero-trust-item"><div class="zapi-hero-trust-icon"><span class="material-symbols-outlined" aria-hidden="true">verified</span></div><div class="zapi-hero-trust-text">Precios fijos y garantizados</div></div>
                <div class="zapi-hero-trust-item"><div class="zapi-hero-trust-icon"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span></div><div class="zapi-hero-trust-text">Stock actualizado</div></div>
                <div class="zapi-hero-trust-item"><div class="zapi-hero-trust-icon"><span class="material-symbols-outlined" aria-hidden="true">local_shipping</span></div><div class="zapi-hero-trust-text">Envío gratis desde <span data-envio-gratis></span></div></div>
            </div>
        </div>
    </div>

    <div class="catalog-filterbar">
        <span class="catalog-filterbar-label" id="catalogFiltersLabel">Explorá por categoría</span>
        <div class="catalog-filters catalogo-filtros" id="catalogFilters" role="group" aria-labelledby="catalogFiltersLabel">
            <span class="catalog-filter-indicator" id="catalogFilterIndicator" aria-hidden="true"></span>
        </div>
    </div>
    <p class="catalog-count visually-hidden" id="catalogCount" aria-live="polite"></p>
    <div class="catalog-grid productos-grid" id="productGrid"></div>
</section>`,
    scripts: ['catalogo.js']
};
