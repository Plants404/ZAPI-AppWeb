import { Link } from 'react-router-dom'
import { useInterfaz } from '../estado/interfaz.jsx'
import { useAgregarAlCarrito } from '../estado/agregar.js'
import { formatearPrecio, textoDeStock, claseDeStock, slug } from '../data/negocio.js'

function unidadesDe(producto) {
  const stock = Number(producto.stock)
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}

// Tarjeta de un producto (catálogo e inicio).
function ProductoCard({ producto }) {
  const { abrirProducto } = useInterfaz()
  const [agregar, agregado] = useAgregarAlCarrito()
  const unidades = unidadesDe(producto)
  const agotado = unidades === 0
  const stockVisual = agotado ? 'agotado' : unidades <= 3 ? 'pocas' : ''
  const fotos = Array.isArray(producto.imagenes) && producto.imagenes.length ? producto.imagenes : [producto.imagen].filter(Boolean)
  const ficha = '/producto/' + (producto.slug || slug(producto.nombre))
  const datos = Array.isArray(producto.infoDeVenta) ? producto.infoDeVenta.filter(Boolean) : []
  const beneficios = datos.length ? datos : [producto.descripcion].filter(Boolean)
  const etiqueta = agotado ? `Sin stock: ${producto.nombre}` : `Agregar ${producto.nombre} al carrito`

  return (
    <article className={'product-card tarjeta-producto' + (agotado ? ' tarjeta-agotada' : '')} data-id={producto.id}>
      <div className="product-visual">
        <Link className="product-visual-link tarjeta-imagen" to={ficha} onClick={e => { e.preventDefault(); abrirProducto(producto.id) }} aria-label={`Ver ${producto.nombre}`}>
          <img src={fotos[0] || ''} alt={producto.nombre} loading="lazy" width="798" height="1200" />
          <span className={`product-stock-pill stock ${claseDeStock(unidades)} ${stockVisual}`}>{textoDeStock(unidades)}</span>
          <span className="product-beneficios-lista">
            {beneficios.map(item => (
              <span className="product-beneficio-item" key={item}>
                <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                <span>{item}</span>
              </span>
            ))}
          </span>
        </Link>
        <button className={'add-cart boton-agregar' + (agregado ? ' agregado added' : '')} type="button" aria-label={etiqueta} disabled={agotado} onClick={() => agregar(producto.id)}>
          <span className="material-symbols-outlined" aria-hidden="true">{agotado ? 'block' : agregado ? 'check' : 'add'}</span>
        </button>
      </div>
      <div className="product-body tarjeta-cuerpo">
        <div className="product-heading">
          <h3 className="product-name"><Link className="product-link" to={ficha} onClick={e => { e.preventDefault(); abrirProducto(producto.id) }}>{producto.nombre}</Link></h3>
          <div className="product-price"><span className="current">{formatearPrecio(producto.precioBase)}</span></div>
        </div>
        <div className="product-tags"><span className="product-badge">{producto.categoria}</span></div>
        <div className="product-benefit"><span className="benefit-icon" aria-hidden="true">✓</span><span>{beneficios[0] || ''}</span></div>
        <ul className="product-beneficios-tactil">
          {beneficios.map(item => <li key={item}><span className="benefit-icon" aria-hidden="true">✓</span><span>{item}</span></li>)}
        </ul>
      </div>
    </article>
  )
}

export default ProductoCard
