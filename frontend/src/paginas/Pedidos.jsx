import { useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerPedidos, eliminarPedido, mensajeDePedido, textoEstadoPedido } from '../estado/pedidos.js'
import { formatearPrecio } from '../data/negocio.js'
import { abrirWhatsApp, formatearFecha } from '../utilidades.js'

// Mis pedidos: historial guardado en este navegador (localStorage).
function Pedidos() {
  const [pedidos, setPedidos] = useState(obtenerPedidos)

  function eliminar(id) {
    if (!window.confirm('¿Eliminar este pedido del historial?')) return
    eliminarPedido(id)
    setPedidos(obtenerPedidos())
  }

  return (
    <>
        <section className="banner-pagina banner-pedidos">
          <div>
            <span className="etiqueta">Tu historial</span>
            <h1>Mis pedidos</h1>
            <p>Cada pedido queda guardado en este navegador y se coordina con ZAPI por WhatsApp.</p>
          </div>
          <ul className="banner-ventajas">
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">chat</span> Pedido coordinado por WhatsApp
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span> Historial guardado en tu navegador
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">autorenew</span> Reenviá cualquier pedido cuando quieras
            </li>
          </ul>
        </section>
        <section className="pedidos-contenido">
          <Link className="pedidos-explorar" id="pedidosExplorar" to="/catalogo" hidden>
            <span className="material-symbols-outlined" aria-hidden="true">eco</span> Explorar catálogo
          </Link>
          <h2>Pedidos realizados</h2>
          <div id="pedidosContenedor" className="pedidos-lista">
            {pedidos.map(pedido => {
              const estado = String(pedido.estado || 'pendiente').toLowerCase().replace(/[^a-z-]/g, '')
              return (
                <article className="pedido-card pedido" key={pedido.id}>
                  <div className="pedido-cabecera">
                    <div>
                      <span className={`pedido-estado pedido-estado-${estado} etiqueta`}>{textoEstadoPedido(pedido.estado)}</span>
                      <strong className="pedido-codigo">Pedido {pedido.id}</strong>
                    </div>
                    <div className="pedido-fecha">{formatearFecha(pedido.fecha)}</div>
                  </div>
                  <ul className="pedido-lineas">
                    {pedido.lineas.map(linea => (
                      <li className="pedido-linea" key={linea.id}>
                        <span className="pedido-linea-cantidad">{linea.cantidad} ×</span>
                        <span className="pedido-linea-nombre">{linea.nombre}</span>
                        <span className="pedido-linea-precio">{formatearPrecio(linea.precio * linea.cantidad)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pedido-pie">
                    <div className="pedido-resumen pedido-total"><span>Total</span><strong>{formatearPrecio(pedido.total)}</strong></div>
                    <div className="pedido-acciones">
                      <button className="boton boton-primario" type="button" onClick={() => abrirWhatsApp(mensajeDePedido(pedido), true)}>
                        <span className="material-symbols-outlined" aria-hidden="true">whatsapp</span> Reenviar por WhatsApp
                      </button>
                      <button className="boton boton-texto" type="button" onClick={() => eliminar(pedido.id)}>
                        <span className="material-symbols-outlined" aria-hidden="true">delete</span> Eliminar del historial
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <div id="pedidosVacio" className="pedidos-vacio" hidden={pedidos.length > 0}>
            <div className="pedidos-vacio-principal">
              <div className="pedidos-vacio-mensaje">
                <span className="pedidos-vacio-icono material-symbols-outlined" aria-hidden="true">receipt_long</span>
                <h2>No tienes pedidos todavía.</h2>
                <p>Explora el catálogo y armá tu primer pedido.</p>
                <div className="pedidos-vacio-acciones">
                  <Link to="/catalogo" className="pedidos-boton pedidos-boton-principal">
                    <span className="material-symbols-outlined" aria-hidden="true">eco</span> Explorar catálogo
                  </Link>
                  <Link to="/carrito" className="pedidos-boton pedidos-boton-secundario">Ir al carrito</Link>
                </div>
              </div>
            </div>
            <ol className="pedidos-pasos">
              <li>
                <span className="pedidos-paso-numero">01</span>
                <div>
                  <h3>Armá tu carrito</h3>
                  <p>Elegí tus plantas del catálogo y ajustá las cantidades.</p>
                </div>
              </li>
              <li>
                <span className="pedidos-paso-numero">02</span>
                <div>
                  <h3>Enviá tu pedido</h3>
                  <p>Lo mandás por WhatsApp y lo confirmamos con vos.</p>
                </div>
              </li>
              <li>
                <span className="pedidos-paso-numero">03</span>
                <div>
                  <h3>Seguilo acá</h3>
                  <p>El historial de pedidos queda guardado en este navegador.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>
    </>
  )
}

export default Pedidos
