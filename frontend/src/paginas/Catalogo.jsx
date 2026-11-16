import ProductoCard from '../components/ProductoCard.jsx'
import { PRODUCTOS, CATEGORIAS } from '../data/productos.js'

function Catalogo() {
  return (
      <section className="section catalog" id="catalogo">
        <div className="catalog-header banner-pagina">
          <div className="catalog-intro">
            <span className="catalog-eyebrow">Catálogo vivo</span>
            <h1 className="catalog-title">Catálogo</h1>
            <p className="catalog-lead">Elegí hoy tus plantas. Nosotros preparamos todo; vos solo disfrutás el proceso.</p>
          </div>
          <ul className="banner-ventajas">
            <li>
              <span aria-hidden="true">✓</span>Precios fijos y garantizados
            </li>
            <li>
              <span aria-hidden="true">✓</span>Stock actualizado
            </li>
            <li>
              <span aria-hidden="true">✓</span>Envío gratis desde <span data-envio-gratis=""></span>
            </li>
          </ul>
        </div>
        <div className="catalog-container">
          <div className="catalog-filterbar">
            <span className="catalog-filterbar-label" id="catalogFiltersLabel">Explorá por categoría</span>
            <div className="catalog-filters catalogo-filtros" id="catalogFilters" role="group" aria-labelledby="catalogFiltersLabel">
              {['Todas', ...CATEGORIAS].map(categoria => (
              <button key={categoria} className={'catalog-filter catalogo-filtro' + (categoria === 'Todas' ? ' activo' : '')} type="button" aria-pressed={categoria === 'Todas'}>
                {categoria}
              </button>
            ))}
              <span className="catalog-filter-indicator" id="catalogFilterIndicator" aria-hidden="true"></span>
            </div>
            <div className="catalog-toolbar">
              <p className="catalog-count" id="catalogCount" aria-live="polite">{PRODUCTOS.length} productos</p>
              <label className="catalog-sort-label" htmlFor="catalogSort">Ordenar <select className="catalog-sort" id="catalogSort"><option value="recomendados">Orden original</option><option value="precio-asc">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option><option value="nombre">Nombre: A–Z</option></select></label>
            </div>
          </div>
          <div className="catalog-grid productos-grid" id="productGrid">
            {PRODUCTOS.map(producto => <ProductoCard key={producto.id} producto={producto} />)}
          </div>
        </div>
      </section>
  )
}

export default Catalogo
