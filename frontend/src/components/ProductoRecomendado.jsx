import { Link } from 'react-router-dom'
import { useInterfaz } from '../estado/interfaz.jsx'
import { useAgregarAlCarrito } from '../estado/agregar.js'
import { unidadesDe } from '../estado/carrito.jsx'
import { formatearPrecio, textoDeStock, claseDeStock, slug } from '../data/negocio.js'

// Tarjeta chica de "Recomendamos para tu compra" (en el carrito).
function ProductoRecomendado({ producto }) {
  const { abrirProducto } = useInterfaz()
  const [agregar, agregado] = useAgregarAlCarrito()
  const unidades = unidadesDe(producto.id)
  const agotado = unidades === 0
  const stockVisual = agotado ? 'agotado' : unidades <= 3 ? 'pocas' : ''
  const ficha = '/producto/' + (producto.slug || slug(producto.nombre))
  const abrir = e => { e.preventDefault(); abrirProducto(producto.id) }

  return (
    <article className={'recommendation-card tarjeta-producto' + (agotado ? ' tarjeta-agotada' : '')} data-id={producto.id}>
      <Link className="recommendation-image tarjeta-imagen" to={ficha} onClick={abrir} aria-label={`Ver ${producto.nombre}`}>
        <img src={producto.imagen} alt={producto.nombre} loading="lazy" width="798" height="1200" />
        <span className={`product-stock-pill stock ${claseDeStock(unidades)} ${stockVisual}`}>{textoDeStock(unidades)}</span>
        <span className="recommendation-beneficios-lista">
          {(producto.infoDeVenta || []).map(item => (
            <span className="product-beneficio-item" key={item}><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><span>{item}</span></span>
          ))}
        </span>
      </Link>
      <div className="recommendation-info tarjeta-cuerpo">
        <h3 className="product-name"><Link className="product-link recommendation-link" to={ficha} onClick={abrir}>{producto.nombre}</Link></h3>
        <div className="product-tags"><span className="recommendation-category">{producto.categoria}</span></div>
        <p className="product-desc">{producto.descripcion}</p>
        <div className="product-benefit"><span className="benefit-icon" aria-hidden="true">✓</span><span>{(producto.infoDeVenta || [])[0] || ''}</span></div>
      </div>
      <div className="recommendation-footer tarjeta-pie">
        <div className="product-price"><span className="current">{formatearPrecio(producto.precioBase)}</span></div>
        <button className={'recommendation-add add-cart boton-agregar' + (agregado ? ' agregado added' : '')} type="button" disabled={agotado} onClick={() => agregar(producto.id)}>
          {agotado
            ? <><span className="material-symbols-outlined" aria-hidden="true">block</span> <span>Sin stock</span></>
            : agregado
              ? <><span className="material-symbols-outlined" aria-hidden="true">check</span> ¡Agregado!</>
              : <><span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> <span>Agregar</span></>}
        </button>
      </div>
    </article>
  )
}

export default ProductoRecomendado
