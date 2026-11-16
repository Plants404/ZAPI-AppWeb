import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInterfaz } from '../estado/interfaz.jsx'
import { useCatalogo, unidadesDeProducto } from '../estado/catalogo.jsx'
import { useAgregarAlCarrito } from '../estado/agregar.js'
import { formatearPrecio, textoDeStock, claseDeStock, slug } from '../data/negocio.js'
import { useBloquearScroll } from '../utilidades.js'

// Ficha rápida de un producto (ventana). La abre cualquier tarjeta con abrirProducto(id).
function ModalProducto() {
  const { productoAbierto, cerrarProducto } = useInterfaz()
  const { obtenerProducto } = useCatalogo()
  const producto = obtenerProducto(productoAbierto)
  const dialogo = useRef(null)
  const caja = useRef(null)
  const [elegida, setElegida] = useState({ id: null, i: 0 }) // foto elegida y de qué producto
  const indice = elegida.id === productoAbierto ? elegida.i : 0
  const setIndice = i => setElegida({ id: productoAbierto, i })
  const [agregar, agregado] = useAgregarAlCarrito()

  useBloquearScroll(Boolean(producto))

  // Abre o cierra el <dialog> nativo según haya un producto elegido.
  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (producto && !el.open) el.showModal()
    if (!producto && el.open) el.close()
    document.body.classList.toggle('modal-abierto', Boolean(producto))
    return () => document.body.classList.remove('modal-abierto')
  }, [producto])

  useEffect(() => {
    if (caja.current) caja.current.scrollTop = 0
  }, [productoAbierto])

  const fotos = producto
    ? (producto.imagenes && producto.imagenes.length ? producto.imagenes : [producto.imagen])
    : []
  const unidades = producto ? unidadesDeProducto(producto) : 0
  const agotado = unidades === 0
  const mover = delta => setIndice((indice + delta + fotos.length) % fotos.length)

  function alTeclear(evento) {
    if (fotos.length < 2) return
    if (evento.key === 'ArrowLeft') { evento.preventDefault(); mover(-1) }
    if (evento.key === 'ArrowRight') { evento.preventDefault(); mover(1) }
  }

  return (
    <dialog
      ref={dialogo}
      className={'modal-producto' + (producto ? ' abierto' : '')}
      id="modalProducto"
      aria-labelledby="modalTitulo"
      onClose={cerrarProducto}
      onKeyDown={alTeclear}
      onClick={e => { if (e.target === dialogo.current || e.target === caja.current) cerrarProducto() }}
    >
      <div className="modal-fondo" onClick={cerrarProducto}></div>
      <div className="modal-caja" ref={caja} role="dialog" aria-modal="true" aria-labelledby="modalTitulo" tabIndex="-1">
        <button className="icono-boton modal-cerrar" type="button" aria-label="Cerrar detalle del producto" onClick={cerrarProducto}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        {producto && (
          <>
            <div className="modal-carrusel modal-galeria" id="modalCarrusel">
              <div className="carrusel-marco modal-foto">
                <img className="carrusel-img" id="carruselImg" src={fotos[indice]} alt={`${producto.nombre}, foto ${indice + 1} de ${fotos.length}`} />
                <button className="carrusel-flecha carrusel-prev" type="button" aria-label="Foto anterior" onClick={() => mover(-1)}>
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                </button>
                <button className="carrusel-flecha carrusel-next" type="button" aria-label="Foto siguiente" onClick={() => mover(1)}>
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
                <span className="carrusel-contador" id="carruselContador" aria-live="polite">{fotos.length > 1 ? `${indice + 1} / ${fotos.length}` : ''}</span>
              </div>
              <div className="carrusel-miniaturas" id="carruselMiniaturas" aria-label="Miniaturas del producto">
                {fotos.map((foto, i) => (
                  <button key={foto} className={'carrusel-miniatura' + (i === indice ? ' activa' : '')} type="button" aria-label={`Ver foto ${i + 1} de ${fotos.length}`} aria-current={i === indice ? 'true' : 'false'} onClick={() => setIndice(i)}>
                    <img src={foto} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-detalle">
              <span className="modal-categoria etiqueta" id="modalCategoria">{producto.categoria}</span>
              <h2 className="modal-titulo" id="modalTitulo">{producto.nombre}</h2>
              <p className="modal-descripcion" id="modalDescripcion">{producto.descripcion}</p>
              <ul className="modal-info lista-ventajas" id="modalInfo">
                {(producto.infoDeVenta || []).map(item => (
                  <li key={item}><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><span>{item}</span></li>
                ))}
              </ul>
              <p className="modal-precio"><span className="current" id="modalPrecio">{formatearPrecio(producto.precioBase)}</span></p>
              <p className={'modal-stock stock ' + claseDeStock(unidades)} id="modalStock">{textoDeStock(unidades)}</p>
              <button className={'modal-agregar add-cart boton boton-primario' + (agregado ? ' agregado added' : '')} type="button" id="modalAgregar" disabled={agotado} onClick={() => agregar(producto.id)}>
                {agotado
                  ? <><span className="material-symbols-outlined" aria-hidden="true">block</span> Sin stock</>
                  : agregado
                    ? <><span className="material-symbols-outlined" aria-hidden="true">check</span> ¡Agregado!</>
                    : <><span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span> Agregar al carrito</>}
              </button>
              <Link className="modal-ficha enlace-flecha" id="modalFicha" to={'/producto/' + (producto.slug || slug(producto.nombre))} onClick={cerrarProducto}>
                Ver la ficha completa <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}

export default ModalProducto
