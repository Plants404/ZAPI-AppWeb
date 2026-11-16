import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAgregarAlCarrito } from '../estado/agregar.js'
import { PRODUCTOS } from '../data/productos.js'
import { NEGOCIO, formatearPrecio, textoDeStock, claseDeStock, slug } from '../data/negocio.js'
import NoEncontrada from './NoEncontrada.jsx'

const slugDe = p => p.slug || slug(p.nombre)
const unidadesDe = p => {
  const n = Number(p.stock)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

// Ficha de un producto: la dirección /producto/<slug> decide cuál se muestra.
function Producto() {
  const { slug: pedido } = useParams()
  const producto = PRODUCTOS.find(p => slugDe(p) === pedido)
  // La "key" hace que al pasar de un producto a otro la ficha empiece de cero (foto 1).
  return producto ? <Ficha key={producto.id} producto={producto} /> : <NoEncontrada />
}

function Ficha({ producto }) {
  const [foto, setFoto] = useState(0)
  const [agregar, agregado] = useAgregarAlCarrito()

  const unidades = unidadesDe(producto)
  const agotado = unidades === 0
  const stockVisual = agotado ? 'agotado' : unidades <= 3 ? 'pocas' : ''
  const imagenes = Array.isArray(producto.imagenes) && producto.imagenes.length ? producto.imagenes : [producto.imagen].filter(Boolean)
  const whatsappUrl = 'https://wa.me/' + NEGOCIO.whatsapp + '?text=' + encodeURIComponent(
    'Hola ZAPI, me interesa ' + producto.nombre + ' (' + formatearPrecio(producto.precioBase) + '). ¿Está disponible?'
  )
  const mismaCategoria = PRODUCTOS.filter(p => p.id !== producto.id && p.categoria === producto.categoria)
  const otros = PRODUCTOS.filter(p => p.id !== producto.id && p.categoria !== producto.categoria)
  const relacionados = mismaCategoria.concat(otros).slice(0, 3)

  return (
    <>
      <nav className="migas" aria-label="Ruta de navegacion">
        <ol>
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/catalogo">Catalogo</Link></li>
          <li aria-current="page">{producto.nombre}</li>
        </ol>
      </nav>
      <article className="producto">
        <div className="producto-galeria">
          <img className="producto-principal" id="productoImagen" src={imagenes[foto] || ''} alt={`${producto.nombre}, foto ${foto + 1} de ${imagenes.length}`} loading="lazy" width="798" height="1200" />
          {imagenes.length > 1 && (
            <div className="producto-miniaturas" id="productoMiniaturas">
              {imagenes.map((foto, i) => (
                <button key={foto} className={'producto-miniatura' + (i === foto ? ' activa' : '')} type="button" aria-label={`Ver foto ${i + 1} de ${imagenes.length}`} aria-current={i === foto ? 'true' : 'false'} onClick={() => setFoto(i)}>
                  <img src={foto} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="producto-datos">
          <span className="producto-categoria" id="productoCategoria">{producto.categoria}</span>
          <h1 id="productoTitulo">{producto.nombre}</h1>
          <p className="producto-descripcion" id="productoDescripcion">{producto.descripcion}</p>
          <p className="producto-precio" id="productoPrecio">{formatearPrecio(producto.precioBase)}</p>
          <p className={`producto-stock stock ${claseDeStock(unidades)} ${stockVisual}`} id="productoStock">{textoDeStock(unidades)}</p>
          <ul className="producto-info" id="productoInfo">
            {(producto.infoDeVenta || []).map(item => (
              <li key={item}><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><span>{item}</span></li>
            ))}
          </ul>
          <div className="producto-acciones">
            <button className={'agregar' + (agregado ? ' agregado added' : '')} id="productoAgregar" type="button" disabled={agotado} onClick={() => agregar(producto.id)}>
              {agotado
                ? <><span className="material-symbols-outlined" aria-hidden="true">block</span> Sin stock</>
                : agregado
                  ? <><span className="material-symbols-outlined" aria-hidden="true">check</span> ¡Agregado!</>
                  : <><span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito</>}
            </button>
            <a className="whatsapp boton boton-whatsapp boton-bloque" id="productoWhatsapp" href={whatsappUrl} target="_blank" rel="noopener">
              <span className="material-symbols-outlined" aria-hidden="true">chat</span> Consultar por WhatsApp
            </a>
          </div>
          <p className="producto-aviso"><span className="material-symbols-outlined" aria-hidden="true">info</span> El stock se publica manualmente; consultá disponibilidad antes de comprar.</p>
        </div>
      </article>
      {relacionados.length > 0 && (
        <section className="producto-relacionados relacionados" id="productoRelacionados">
          <h2>También te puede gustar</h2>
          <ul className="relacionados-grid" id="productoRelacionadosGrid">
            {relacionados.map(p => {
              const u = unidadesDe(p)
              return (
                <li key={p.id}>
                  <Link className="relacionado" to={'/producto/' + slugDe(p)}>
                    <img src={p.imagen} alt={p.nombre} loading="lazy" width="798" height="1200" />
                    <span className="relacionado-nombre">{p.nombre}</span>
                    <span className="relacionado-precio">{formatearPrecio(p.precioBase)}</span>
                    <span className={`stock ${claseDeStock(u)}`}>{textoDeStock(u)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

export default Producto
