import { NEGOCIO, formatearPrecio } from '../data/negocio.js'
import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { filtrarProductos } from '../data/buscar.js'
import ProductoCard from '../components/ProductoCard.jsx'
import { EstadoCatalogo, useCatalogo } from '../estado/catalogo.jsx'

// Catálogo: filtro por categoría, orden y búsqueda (la búsqueda viene de la cabecera: ?q=...).
function Catalogo() {
  const [params, setParams] = useSearchParams()
  const { productos, categorias, cargando, error, recargar } = useCatalogo()
  const busqueda = (params.get('q') || '').trim()
  const [categoria, setCategoria] = useState('')
  const [orden, setOrden] = useState('recomendados')
  const barra = useRef(null)
  const [indicador, setIndicador] = useState(null)

  const visibles = filtrarProductos(productos, { categoria, busqueda })
  if (orden === 'precio-asc') visibles.sort((a, b) => a.precioBase - b.precioBase)
  else if (orden === 'precio-desc') visibles.sort((a, b) => b.precioBase - a.precioBase)
  else if (orden === 'nombre') visibles.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  // La "píldora" que se desliza detrás del filtro activo: se mide el botón activo.
  useLayoutEffect(() => {
    const medir = () => {
      const activo = barra.current?.querySelector('.catalog-filter.activo')
      if (activo) setIndicador({ width: activo.offsetWidth, height: activo.offsetHeight, transform: `translateX(${activo.offsetLeft}px)`, opacity: 1 })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [categoria])

  function elegir(nueva, evento) {
    setCategoria(nueva)
    const boton = evento.currentTarget
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    boton.scrollIntoView?.({ behavior: sinMovimiento ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

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
              <span aria-hidden="true">✓</span>Envío gratis desde {formatearPrecio(NEGOCIO.envioGratis)}
            </li>
          </ul>
        </div>
        <div className="catalog-container">
          <div className="catalog-filterbar">
            <span className="catalog-filterbar-label" id="catalogFiltersLabel">Explorá por categoría</span>
            <div className={'catalog-filters catalogo-filtros' + (indicador ? ' con-indicador' : '')} id="catalogFilters" role="group" aria-labelledby="catalogFiltersLabel" ref={barra}>
              {['', ...categorias].map(valor => (
                <button key={valor || 'todas'} className={'catalog-filter catalogo-filtro' + (valor === categoria ? ' activo' : '')} type="button" aria-pressed={valor === categoria} onClick={e => elegir(valor, e)}>
                  {valor || 'Todas'}
                </button>
              ))}
              <span className="catalog-filter-indicator" id="catalogFilterIndicator" aria-hidden="true" style={indicador || undefined}></span>
            </div>
            <div className="catalog-toolbar">
              <p className="catalog-count" id="catalogCount" aria-live="polite">{cargando ? 'Cargando…' : visibles.length === 1 ? '1 producto' : visibles.length + ' productos'}</p>
              <label className="catalog-sort-label" htmlFor="catalogSort">Ordenar <select className="catalog-sort" id="catalogSort" value={orden} onChange={e => setOrden(e.target.value)}><option value="recomendados">Orden original</option><option value="precio-asc">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option><option value="nombre">Nombre: A–Z</option></select></label>
            </div>
          </div>
          <div className="catalog-grid productos-grid" id="productGrid">
            {cargando || error
              ? <EstadoCatalogo cargando={cargando} error={error} recargar={recargar} />
              : visibles.length
              ? visibles.map(producto => <ProductoCard key={producto.id} producto={producto} />)
              : (
                <p className="estado-vacio">
                  {busqueda ? `No encontramos productos para "${busqueda}".` : 'No hay productos en esta categoria por ahora.'}{' '}
                  <button className="boton-texto" type="button" onClick={() => { setParams({}, { replace: true }); setCategoria('') }}>Limpiar busqueda</button>
                </p>
              )}
          </div>
        </div>
      </section>
  )
}

export default Catalogo
