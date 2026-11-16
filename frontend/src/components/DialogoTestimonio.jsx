import { useEffect, useRef, useState } from 'react'
import { useInterfaz } from '../estado/interfaz.jsx'
import { crearTestimonio } from '../api.js'
import { limpiarValor, useBloquearScroll } from '../utilidades.js'

const ETIQUETAS_ESTRELLAS = { 1: 'Malo', 2: 'Regular', 3: 'Bueno', 4: 'Muy bueno', 5: 'Excelente' }
const VACIO = { autor: '', lugar: '', texto: '', sitio: '' }

// Formulario para dejar una opinión. Se abre con abrirTestimonio() desde cualquier botón.
function DialogoTestimonio() {
  const { testimonio, cerrarTestimonio, agregarTestimonio } = useInterfaz()
  const dialogo = useRef(null)
  const campoNombre = useRef(null)
  const [campos, setCampos] = useState(VACIO)
  const [estrellas, setEstrellas] = useState(5)
  const [errores, setErrores] = useState({})
  const [estado, setEstado] = useState({ mensaje: '', tipo: '' })
  const [enviando, setEnviando] = useState(false)

  useBloquearScroll(testimonio.abierto)

  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (testimonio.abierto && !el.open) {
      el.showModal()
      campoNombre.current?.focus()
    }
    if (!testimonio.abierto && el.open) el.close()
    document.body.classList.toggle('con-testimonio-abierto', testimonio.abierto)
    return () => document.body.classList.remove('con-testimonio-abierto')
  }, [testimonio.abierto])

  const cambiar = nombre => e => {
    setCampos(c => ({ ...c, [nombre]: e.target.value }))
    setErrores(er => ({ ...er, [nombre]: '' }))
  }

  function alTeclearEstrellas(evento) {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[evento.key]
    if (!delta) return
    evento.preventDefault()
    const nuevo = Math.min(5, Math.max(1, estrellas + delta))
    setEstrellas(nuevo)
    window.requestAnimationFrame(() => document.querySelector(`#testimonioEstrellasSelector [data-valor="${nuevo}"]`)?.focus())
  }

  async function enviar(evento) {
    evento.preventDefault()
    const autor = limpiarValor(campos.autor)
    const lugar = limpiarValor(campos.lugar)
    const texto = limpiarValor(campos.texto)

    let error = null
    if (autor.length < 2) error = { autor: 'Escribí tu nombre' }
    else if (lugar.length > 120) error = { lugar: 'El lugar no puede superar 120 caracteres' }
    else if (texto.length < 10) error = { texto: 'Contanos un poco más sobre tu experiencia' }
    else if (texto.length > 600) error = { texto: 'La opinión no puede superar 600 caracteres' }
    if (error) {
      setErrores(error)
      document.getElementById({ autor: 'testimonioNombre', lugar: 'testimonioLugar', texto: 'testimonioTexto' }[Object.keys(error)[0]])?.focus()
      return
    }
    if (campos.sitio.trim()) return // trampa para robots: si lo llenaron, no se envía

    setErrores({})
    setEnviando(true)
    setEstado({ mensaje: '', tipo: '' })
    const datos = { autor, lugar, texto, estrellas, productoId: testimonio.productoId }
    try {
      await crearTestimonio(datos)
      setCampos(VACIO)
      setEstrellas(5)
      agregarTestimonio(datos)
      setEstado({ mensaje: '¡Gracias! Tu opinión ya está publicada.', tipo: 'ok' })
      window.setTimeout(cerrarTestimonio, 1500)
    } catch (e) {
      setEstado({ mensaje: e.message || 'No pudimos publicar tu opinión.', tipo: 'error' })
    }
    setEnviando(false)
  }

  const propsCampo = nombre => ({
    className: (nombre === 'texto' ? 'testimonio-texto' : 'testimonio-input') + ' campo-input' + (errores[nombre] ? ' campo-con-error' : ''),
    'aria-invalid': errores[nombre] ? 'true' : undefined,
    value: campos[nombre],
    onChange: cambiar(nombre)
  })

  return (
    <dialog
      ref={dialogo}
      className="testimonio-modal dialogo"
      id="dialogoTestimonio"
      aria-labelledby="testimonioTitulo"
      onClose={cerrarTestimonio}
      onClick={e => { if (e.target === dialogo.current) cerrarTestimonio() }}
    >
      <div className="testimonio-fondo" onClick={cerrarTestimonio}></div>
      <form className="testimonio-caja testimonio-form dialogo-caja" id="testimonioForm" noValidate onSubmit={enviar}>
        <button className="testimonio-cerrar-x icono-boton dialogo-cerrar" type="button" aria-label="Cerrar formulario de opinion" onClick={cerrarTestimonio}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <span className="etiqueta">Tu experiencia</span>
        <h2 className="testimonio-titulo" id="testimonioTitulo">Contanos cómo fue tu compra</h2>
        <p className="testimonio-bajada">Tu opinión se publica enseguida en la página. Contanos con honestidad cómo te fue.</p>
        <div className="testimonio-campo">
          <label className="testimonio-etiqueta campo-label" htmlFor="testimonioNombre">Nombre <span aria-hidden="true">*</span></label>
          <input ref={campoNombre} id="testimonioNombre" name="autor" type="text" autoComplete="name" maxLength="120" aria-describedby="errorTestimonioNombre" {...propsCampo('autor')} />
          <span className="testimonio-error campo-error" id="errorTestimonioNombre">{errores.autor}</span>
        </div>
        <div className="testimonio-campo">
          <label className="testimonio-etiqueta campo-label" htmlFor="testimonioLugar">Lugar (opcional)</label>
          <input id="testimonioLugar" name="lugar" type="text" maxLength="120" aria-describedby="errorTestimonioLugar" {...propsCampo('lugar')} />
          <span className="testimonio-error campo-error" id="errorTestimonioLugar">{errores.lugar}</span>
        </div>
        <div className="testimonio-campo">
          <span className="testimonio-etiqueta campo-label" id="testimonioEstrellasEtiqueta">Puntaje</span>
          <div className="estrellas-selector" id="testimonioEstrellasSelector" role="radiogroup" aria-labelledby="testimonioEstrellasEtiqueta" onKeyDown={alTeclearEstrellas}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} className={'estrella-boton' + (n <= estrellas ? ' activa' : '')} type="button" role="radio" aria-checked={n === estrellas} tabIndex={n === estrellas ? 0 : -1} data-valor={n} aria-label={n === 1 ? '1 estrella' : `${n} estrellas`} onClick={() => setEstrellas(n)}>★</button>
            ))}
            <span className="estrellas-texto" id="testimonioEstrellasTexto" aria-live="polite">{ETIQUETAS_ESTRELLAS[estrellas]}</span>
          </div>
        </div>
        <div className="testimonio-campo">
          <label className="testimonio-etiqueta campo-label" htmlFor="testimonioTexto">Tu opinion <span aria-hidden="true">*</span></label>
          <textarea id="testimonioTexto" name="texto" rows="5" maxLength="600" aria-describedby="errorTestimonioTexto" {...propsCampo('texto')} />
          <span className="testimonio-error campo-error" id="errorTestimonioTexto">{errores.texto}</span>
        </div>
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="testimonioSitio">Dejá este campo vacío</label>
          <input id="testimonioSitio" name="sitio_web" type="text" tabIndex="-1" autoComplete="off" value={campos.sitio} onChange={cambiar('sitio')} />
        </div>
        <p className={'testimonio-error formulario-estado' + (estado.tipo ? ' estado-' + estado.tipo : '')} id="testimonioEstado" role="status" aria-live="polite" hidden={!estado.mensaje}>{estado.mensaje}</p>
        <div className="testimonio-acciones">
          <button className="testimonio-btn-secundario" type="button" onClick={cerrarTestimonio}>Cerrar</button>
          <button className="testimonio-btn-primario boton boton-primario boton-bloque" id="testimonioEnviar" type="submit" disabled={enviando}>
            <span id="testimonioEnviarTexto">{enviando ? 'Enviando…' : 'Enviar opinión'}</span>
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default DialogoTestimonio
