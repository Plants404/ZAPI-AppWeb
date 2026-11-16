import { Link } from 'react-router-dom'

function Pedidos() {
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
          <div id="pedidosContenedor" className="pedidos-lista"></div>
          <div id="pedidosVacio" className="pedidos-vacio" hidden>
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
