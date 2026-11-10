'use strict';

module.exports = {
    archivo: 'catalogo.html',
    seccion: 'catalogo',
    titulo: 'Catalogo | ZAPI Vivero Agroecologico',
    descripcion: 'Plantas, aromaticas, suculentas y kits de huerta de ZAPI. Precios fijos y stock actualizado.',
    productos: true,
    contenido: `
<section class="section catalog" id="catalogo">
    <div class="catalog-header banner-pagina">
        <div class="catalog-intro">
            <span class="catalog-eyebrow">Catálogo vivo</span>
            <h1 class="catalog-title">Catálogo</h1>
            <p class="catalog-lead">Elegí hoy tus plantas. Nosotros preparamos todo; vos solo disfrutás el proceso.</p>
        </div>
        <ul class="banner-ventajas">
            <li><span aria-hidden="true">✓</span>Precios fijos y garantizados</li>
            <li><span aria-hidden="true">✓</span>Stock actualizado</li>
            <li><span aria-hidden="true">✓</span>Envío gratis desde <span data-envio-gratis></span></li>
        </ul>
    </div>

    <div class="catalog-container">
        <div class="catalog-filterbar">
            <span class="catalog-filterbar-label" id="catalogFiltersLabel">Explorá por categoría</span>
            <div class="catalog-filters catalogo-filtros" id="catalogFilters" role="group" aria-labelledby="catalogFiltersLabel">
                <span class="catalog-filter-indicator" id="catalogFilterIndicator" aria-hidden="true"></span>
            </div>
            <div class="catalog-toolbar">
                <p class="catalog-count" id="catalogCount" aria-live="polite"></p>
                <label class="catalog-sort-label" for="catalogSort">Ordenar
                    <select class="catalog-sort" id="catalogSort">
                        <option value="recomendados">Orden original</option>
                        <option value="precio-asc">Precio: menor a mayor</option>
                        <option value="precio-desc">Precio: mayor a menor</option>
                        <option value="nombre">Nombre: A–Z</option>
                    </select>
                </label>
            </div>
        </div>
        <div class="catalog-grid productos-grid" id="productGrid"></div>
    </div>
</section>`,
    scripts: ['catalogo.js']
};
