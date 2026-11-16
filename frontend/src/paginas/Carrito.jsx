import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProductoRecomendado from '../components/ProductoRecomendado.jsx'
import { useCarrito } from '../estado/carrito.jsx'
import { useCatalogo, unidadesDeProducto } from '../estado/catalogo.jsx'
import { useAviso } from '../estado/aviso.jsx'
import { useInterfaz } from '../estado/interfaz.jsx'
import { guardarPedido, mensajeDePedido, pedidoDesdeServidor } from '../estado/pedidos.js'
import { crearPedidoWeb, hayClienteConSesion } from '../api.js'
import { NEGOCIO, formatearPrecio, textoDeStock, claseDeStock, slug } from '../data/negocio.js'
import { abrirWhatsApp, limpiarValor, validarCorreo } from '../utilidades.js'

const CAMPOS_VACIOS = { nombre: '', telefono: '', email: '', zona: '', notas: '' }

// Carrito: líneas, resumen con barra de envío gratis y formulario para confirmar el pedido.
function Carrito() {
  const { productos, obtenerProducto, unidadesDe } = useCatalogo()
  const { lineas, totales, cambiarCantidad, quitar, vaciar } = useCarrito()
  const { mostrarAviso } = useAviso()
  const { abrirTestimonio } = useInterfaz()
  const [campos, setCampos] = useState(CAMPOS_VACIOS)
  const [errores, setErrores] = useState({})
  const [estado, setEstado] = useState({ mensaje: '', tipo: '' })
  const [enviando, setEnviando] = useState(false)

  const { subtotal, envio, total } = totales
  const envioGratis = Number(NEGOCIO.envioGratis) || 0
  const progreso = Math.min(subtotal, envioGratis)
  const porcentaje = envioGratis > 0 ? (progreso / envioGratis) * 100 : 100
  const faltante = Math.max(0, envioGratis - subtotal)
  const hayLineas = lineas.length > 0

  // Recomendados: los que no están en el carrito y tienen stock, primero los de la misma categoría.
  const enCarrito = new Set(lineas.map(l => l.id))
  const categorias = new Set(lineas.map(l => l.categoria))
  const recomendados = hayLineas
    ? productos
      .filter(p => !enCarrito.has(p.id) && unidadesDeProducto(p) > 0)
      .sort((a, b) => Number(categorias.has(b.categoria)) - Number(categorias.has(a.categoria)))
      .slice(0, 3)
    : []

  const cambiar = nombre => e => {
    setCampos(c => ({ ...c, [nombre]: e.target.value }))
    setErrores(er => ({ ...er, [nombre]: '' }))
  }

  function sumar(id) {
    if (!cambiarCantidad(id, 1)) mostrarAviso('Sin stock', 'No quedan más unidades disponibles de este producto.')
  }

  function vaciarCarrito() {
    if (!hayLineas) return
    if (!window.confirm('¿Querés vaciar el carrito?')) return
    vaciar()
  }

  function validar() {
    const nuevos = {}
    if (limpiarValor(campos.nombre).length < 2) nuevos.nombre = 'Escribí tu nombre'
    if (limpiarValor(campos.telefono).replace(/\D/g, '').length < 6) nuevos.telefono = 'Falta un teléfono de contacto'
    const email = limpiarValor(campos.email)
    let mensajeCorreo = ''
    if (email && !validarCorreo(email)) mensajeCorreo = 'Revisá el correo electrónico.'
    setErrores(nuevos)
    const primero = nuevos.nombre ? 'pedNombre' : nuevos.telefono ? 'pedTelefono' : mensajeCorreo ? 'pedEmail' : null
    if (primero) {
      setEstado({ mensaje: mensajeCorreo && !nuevos.nombre && !nuevos.telefono ? mensajeCorreo : 'Revisá los campos marcados.', tipo: 'error' })
      document.getElementById(primero)?.focus()
      return false
    }
    return true
  }

  async function confirmar(evento) {
    evento.preventDefault()
    if (!(await hayClienteConSesion())) {
      setEstado({ mensaje: 'Para confirmar tu pedido iniciá sesión o creá tu cuenta. Tu carrito se mantiene.', tipo: 'error' })
      window.setTimeout(() => { window.location.href = '/login?volver=' + encodeURIComponent('/carrito') }, 1800)
      return
    }
    if (!hayLineas) {
      setEstado({ mensaje: 'Agregá al menos un producto al carrito.', tipo: 'error' })
      return
    }
    if (!validar()) return

    setEnviando(true)
    setEstado({ mensaje: '', tipo: '' })
    try {
      // El servidor valida precios, descuenta el stock y devuelve el pedido definitivo.
      const orden = await crearPedidoWeb({
        lineas: lineas.map(l => ({ id: l.id, cantidad: l.cantidad })),
        cliente: {
          nombre: limpiarValor(campos.nombre),
          telefono: limpiarValor(campos.telefono),
          email: limpiarValor(campos.email),
          zona: limpiarValor(campos.zona),
          notas: limpiarValor(campos.notas)
        }
      })
      const pedido = guardarPedido(pedidoDesdeServidor(orden))
      vaciar()
      setCampos(CAMPOS_VACIOS)
      setEstado({ mensaje: 'Pedido ' + pedido.id + ' listo. Abrimos WhatsApp para coordinar la entrega.', tipo: 'ok' })
      abrirWhatsApp(mensajeDePedido(pedido), true)
    } catch (error) {
      if (error.status === 401) {
        setEstado({ mensaje: 'Tu sesión venció. Iniciá sesión de nuevo; tu carrito se mantiene.', tipo: 'error' })
      } else {
        setEstado({ mensaje: error.message || 'No se pudo crear el pedido. Intentá de nuevo.', tipo: 'error' })
      }
    } finally {
      setEnviando(false)
    }
  }

  const claseCampo = nombre => 'campo-input' + (errores[nombre] ? ' campo-con-error' : '')

  return (
    <section className="cart-page carrito-pagina">
      <div className="cart-content carrito-contenido">
        <div className="cart-heading carrito-cabecera">
          <div>
            <span className="cart-eyebrow etiqueta">Tu selección</span>
            <h1>Tu carrito</h1>
          </div>
          <button className="clear-cart boton-texto" id="clearCart" type="button" onClick={vaciarCarrito}>
            <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span> Vaciar carrito
          </button>
        </div>

        <div className="cart-items carrito-items" id="cartItems">
          {lineas.map(linea => {
            const producto = obtenerProducto(linea.id)
            const unidades = unidadesDe(linea.id)
            return (
              <article className="cart-item linea-carrito" data-id={linea.id} key={linea.id}>
                <Link className="cart-item-image linea-foto" to={'/producto/' + (producto?.slug || slug(linea.nombre))}>
                  <img src={linea.imagen} alt="" loading="lazy" width="798" height="1200" />
                </Link>
                <div className="cart-item-info linea-datos">
                  <span className="cart-item-category etiqueta">{linea.categoria}</span>
                  <h2>{linea.nombre}</h2>
                  <p className={`cart-item-stock stock ${claseDeStock(unidades)} ${unidades === 0 ? 'agotado' : unidades <= 3 ? 'pocas' : ''}`}>{textoDeStock(unidades)}</p>
                </div>
                <div className="cart-item-actions linea-acciones">
                  <div className="quantity-control control-cantidad" role="group" aria-label={`Cantidad de ${linea.nombre}`}>
                    <button className="boton-cantidad" type="button" aria-label="Disminuir cantidad" onClick={() => cambiarCantidad(linea.id, -1)}>
                      <span className="material-symbols-outlined" aria-hidden="true">remove</span>
                    </button>
                    <span className="quantity-value cantidad-valor" aria-live="polite">{linea.cantidad}</span>
                    <button className="boton-cantidad" type="button" aria-label="Aumentar cantidad" disabled={linea.cantidad >= unidades} onClick={() => sumar(linea.id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                    </button>
                  </div>
                  <div className="cart-item-total linea-total">
                    <strong>{formatearPrecio(linea.precio * linea.cantidad)}</strong>
                    {linea.cantidad > 1 && <small>{linea.cantidad} × {formatearPrecio(linea.precio)}</small>}
                  </div>
                  <button className="remove-item icono-boton linea-quitar" type="button" aria-label={`Eliminar ${linea.nombre} del carrito`} onClick={() => quitar(linea.id)}>
                    <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        <div className="empty-cart estado-vacio" id="emptyCart" hidden={hayLineas}>
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

        <section className="recommendations seccion recomendaciones" id="recommendations" aria-labelledby="tituloRecomendaciones" hidden={recomendados.length === 0}>
          <div className="recommendations-header seccion-cabecera">
            <span className="etiqueta">Te puede interesar</span>
            <h2 id="tituloRecomendaciones">Recomendamos para tu compra</h2>
          </div>
          <div className="recommendations-list productos-grid" id="recommendationsList">
            {recomendados.map(p => <ProductoRecomendado key={p.id} producto={p} />)}
          </div>
        </section>
      </div>

      <aside className="cart-summary carrito-resumen" aria-labelledby="tituloResumen">
        <div className="summary-header resumen-cabecera">
          <span className="etiqueta">Resumen</span>
          <h2 id="tituloResumen">Tu pedido</h2>
        </div>

        <div className="shipping-progress-section envio-progreso" id="shippingProgressSection" hidden={!hayLineas}>
          <p className="shipping-progress-message" id="shippingProgressMessage" aria-live="polite">
            {subtotal >= envioGratis ? '¡Tenés envío gratis!' : 'Te faltan ' + formatearPrecio(faltante) + ' para el envío gratis'}
          </p>
          <div className="shipping-progress-track envio-barra" id="shippingProgress" role="progressbar" aria-label="Progreso hacia el envío gratis" aria-valuemin="0" aria-valuemax={envioGratis} aria-valuenow={progreso} aria-valuetext={subtotal >= envioGratis ? 'Envío gratis alcanzado' : formatearPrecio(faltante) + ' para alcanzar el envío gratis'} hidden={!hayLineas}>
            <span className="shipping-progress-fill" id="shippingProgressFill" style={{ width: porcentaje + '%' }}></span>
          </div>
          <p className="shipping-threshold-note envio-nota">Envío gratis desde <span data-envio-gratis>{formatearPrecio(NEGOCIO.envioGratis)}</span></p>
        </div>

        <div className="summary-lines resumen-lineas">
          <div><span>Productos</span><strong id="subtotal">{formatearPrecio(subtotal)}</strong></div>
          <div><span>Envío</span><strong id="shipping">{envio === null ? 'Gratis' : formatearPrecio(0)}</strong></div>
        </div>
        <div className="summary-total resumen-total">
          <span>Total</span>
          <div><strong id="total">{formatearPrecio(total)}</strong><small id="shippingPendingNote" hidden={total !== null || !hayLineas}>+ envío a coordinar</small></div>
        </div>

        <form className="checkout-root checkout-form" id="checkoutForm" noValidate hidden={!hayLineas} onSubmit={confirmar}>
          <h2>Datos de contacto</h2>
          <label className="campo-label" htmlFor="pedNombre">Nombre <span aria-hidden="true">*</span></label>
          <input className={claseCampo('nombre')} id="pedNombre" name="nombre" type="text" autoComplete="name" maxLength="120" aria-describedby="pedErrorNombre" aria-invalid={errores.nombre ? 'true' : undefined} value={campos.nombre} onChange={cambiar('nombre')} />
          <span className="campo-error" id="pedErrorNombre">{errores.nombre}</span>

          <label className="campo-label" htmlFor="pedTelefono">Teléfono <span aria-hidden="true">*</span></label>
          <input className={claseCampo('telefono')} id="pedTelefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength="40" aria-describedby="pedErrorTelefono" aria-invalid={errores.telefono ? 'true' : undefined} value={campos.telefono} onChange={cambiar('telefono')} />
          <span className="campo-error" id="pedErrorTelefono">{errores.telefono}</span>

          <label className="campo-label" htmlFor="pedEmail">Correo electrónico (opcional)</label>
          <input className="campo-input" id="pedEmail" name="email" type="email" autoComplete="email" maxLength="160" value={campos.email} onChange={cambiar('email')} />

          <label className="campo-label" htmlFor="pedZona">Zona (opcional)</label>
          <input className="campo-input" id="pedZona" name="zona" type="text" autoComplete="address-level2" maxLength="120" value={campos.zona} onChange={cambiar('zona')} />

          <label className="campo-label" htmlFor="pedNotas">Notas (opcional)</label>
          <textarea className="campo-input" id="pedNotas" name="notas" rows="3" maxLength="500" value={campos.notas} onChange={cambiar('notas')} />

          <p className={'formulario-estado' + (estado.tipo ? ' estado-' + estado.tipo : '')} id="pedEstado" role="status" aria-live="polite" hidden={!estado.mensaje}>{estado.mensaje}</p>
          <button className="btn-whatsapp boton boton-primario boton-bloque" id="whatsappButton" type="submit" disabled={enviando}>
            {enviando
              ? <><span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span> Preparando pedido…</>
              : <><span className="material-symbols-outlined" aria-hidden="true">check_circle</span> Confirmar pedido</>}
          </button>
        </form>

        {/* Si el carrito queda vacío después de confirmar, el mensaje de éxito sigue a la vista */}
        {!hayLineas && estado.mensaje && <p className={'formulario-estado estado-' + estado.tipo} role="status">{estado.mensaje}</p>}

        <p className="secure-message resumen-nota"><span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Tu pedido queda guardado en "Mis pedidos" y se coordina con ZAPI.</p>
        <button className="boton boton-secundario boton-bloque" type="button" onClick={() => abrirTestimonio()}>
          <span className="material-symbols-outlined" aria-hidden="true">rate_review</span> Dejar un testimonio
        </button>
      </aside>
    </section>
  )
}

export default Carrito
