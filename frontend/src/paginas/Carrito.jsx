import { Link } from 'react-router-dom'

function Carrito() {
  return (
      <section className="cart-page carrito-pagina">
        <div className="cart-content carrito-contenido">
          <div className="cart-heading carrito-cabecera">
            <div>
              <span className="cart-eyebrow etiqueta">Tu selección</span>
              <h1>Tu carrito</h1>
            </div>
            <button className="clear-cart boton-texto" id="clearCart" type="button">
              <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span> Vaciar carrito
            </button>
          </div>
          <div className="cart-items carrito-items" id="cartItems"></div>
          <div className="empty-cart estado-vacio" id="emptyCart" hidden>
            <span className="material-symbols-outlined" aria-hidden="true">shopping_basket</span>
            <h2>Tu carrito está vacío</h2>
            <p>Todavía no agregaste ningún producto. Explorá el catálogo y encontrá algo para tu jardín o huerta.</p>
            <Link className="boton boton-primario" to="/catalogo">
              <span className="material-symbols-outlined" aria-hidden="true">eco</span> Explorar catálogo
            </Link>
          </div>
          <Link className="continue-shopping enlace-flecha" to="/catalogo">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> Seguir comprando
          </Link>
          <section className="recommendations seccion recomendaciones" id="recommendations" aria-labelledby="tituloRecomendaciones" hidden>
            <div className="recommendations-header seccion-cabecera">
              <span className="etiqueta">Te puede interesar</span>
              <h2 id="tituloRecomendaciones">Recomendamos para tu compra</h2>
            </div>
            <div className="recommendations-list productos-grid" id="recommendationsList"></div>
          </section>
        </div>
        <aside className="cart-summary carrito-resumen" aria-labelledby="tituloResumen">
          <div className="summary-header resumen-cabecera">
            <span className="etiqueta">Resumen</span>
            <h2 id="tituloResumen">Tu pedido</h2>
          </div>
          <div className="shipping-progress-section envio-progreso" id="shippingProgressSection">
            <p className="shipping-progress-message" id="shippingProgressMessage" aria-live="polite"></p>
            <div className="shipping-progress-track envio-barra" id="shippingProgress" role="progressbar" aria-label="Progreso hacia el envío gratis" aria-valuemin="0" aria-valuemax="2500" aria-valuenow="0">
              <span className="shipping-progress-fill" id="shippingProgressFill"></span>
            </div>
            <p className="shipping-threshold-note envio-nota">Envío gratis desde <span data-envio-gratis=""></span></p>
          </div>
          <div className="summary-lines resumen-lineas">
            <div>
              <span>Productos</span>
              <strong id="subtotal">$ 0</strong>
            </div>
            <div>
              <span>Envío</span>
              <strong id="shipping">$ 0</strong>
            </div>
          </div>
          <div className="summary-total resumen-total">
            <span>Total</span>
            <div>
              <strong id="total">$ 0</strong>
              <small id="shippingPendingNote" hidden>+ envío a coordinar</small>
            </div>
          </div>
          <form className="checkout-root checkout-form" id="checkoutForm" noValidate>
            <h2>Datos de contacto</h2>
            <label className="campo-label" htmlFor="pedNombre">Nombre <span aria-hidden="true">*</span></label>
            <input className="campo-input" id="pedNombre" name="nombre" type="text" autoComplete="name" maxLength="120" aria-describedby="pedErrorNombre" />
            <span className="campo-error" id="pedErrorNombre"></span>
            <label className="campo-label" htmlFor="pedTelefono">Teléfono <span aria-hidden="true">*</span></label>
            <input className="campo-input" id="pedTelefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength="40" aria-describedby="pedErrorTelefono" />
            <span className="campo-error" id="pedErrorTelefono"></span>
            <label className="campo-label" htmlFor="pedEmail">Correo electrónico (opcional)</label>
            <input className="campo-input" id="pedEmail" name="email" type="email" autoComplete="email" maxLength="160" />
            <label className="campo-label" htmlFor="pedZona">Zona (opcional)</label>
            <input className="campo-input" id="pedZona" name="zona" type="text" autoComplete="address-level2" maxLength="120" />
            <label className="campo-label" htmlFor="pedNotas">Notas (opcional)</label>
            <textarea className="campo-input" id="pedNotas" name="notas" rows="3" maxLength="500" />
            <p className="formulario-estado" id="pedEstado" role="status" aria-live="polite" hidden></p>
            <button className="btn-whatsapp boton boton-primario boton-bloque" id="whatsappButton" type="submit">
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span> Confirmar pedido
            </button>
          </form>
          <p className="secure-message resumen-nota">
            <span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Tu pedido queda guardado en "Mis pedidos" y se coordina con ZAPI.
          </p>
          <button className="boton boton-secundario boton-bloque" type="button" data-abrir-testimonio="">
            <span className="material-symbols-outlined" aria-hidden="true">rate_review</span> Dejar un testimonio
          </button>
        </aside>
      </section>
  )
}

export default Carrito
