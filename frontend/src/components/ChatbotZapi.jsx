import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCarrito } from '../estado/carrito.jsx'
import { useInterfaz } from '../estado/interfaz.jsx'
import { preguntarAlChat } from '../api.js'
import { NEGOCIO, formatearPrecio } from '../data/negocio.js'
import { ZAPI_MENU, ZAPI_NOMBRE, detectarIntencion, generarRespuesta } from '../data/bot.js'

const SALUDO = `¡Hola! 🌿 Soy <strong>${ZAPI_NOMBRE}</strong>, el asistente de ZAPI. Puedo recomendarte plantas, contarte cómo cuidarlas y ayudarte con envíos y servicios. ¿Qué estás buscando?`
const BARRAS_SUPERIORES = 'header, .cart-header, .topbar, .top-bar, .barra-superior'
const esperar = ms => new Promise(resolver => setTimeout(resolver, ms))

// Chat "Brotecito". Responde con IA (servidor) y, si falla, con respuestas fijas.
function ChatbotZapi() {
  const { lineas } = useCarrito()
  const { productoAbierto } = useInterfaz()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([]) // { tipo: 'user' | 'bot', texto, html }
  const [escribiendo, setEscribiendo] = useState(false)
  const [insignia, setInsignia] = useState(false)
  const [texto, setTexto] = useState('')
  const contenedor = useRef(null)
  const lista = useRef(null)
  const entrada = useRef(null)
  const botonAbrir = useRef(null)
  const seguirAbajo = useRef(true)
  const iniciado = useRef(false)
  const historialIA = useRef([])
  const timers = useRef([])

  // El globito rojo "1" aparece a los 3 s.
  useEffect(() => {
    const t = window.setTimeout(() => setInsignia(true), 3000)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  // Mide la barra superior fija para que el chat no la tape (variable CSS --site-header-h).
  useEffect(() => {
    let cuadro = null
    const medir = () => {
      cuadro = null
      const limite = window.innerWidth * 0.6
      let max = 0
      document.querySelectorAll(BARRAS_SUPERIORES).forEach(el => {
        const posicion = getComputedStyle(el).position
        if (posicion !== 'fixed' && posicion !== 'sticky') return
        const caja = el.getBoundingClientRect()
        if (!caja.width || !caja.height || caja.top > 8 || caja.width < limite) return
        max = Math.max(max, caja.bottom)
      })
      contenedor.current?.style.setProperty('--site-header-h', `${Math.ceil(max)}px`)
    }
    const programar = () => { if (!cuadro) cuadro = requestAnimationFrame(medir) }
    medir()
    window.addEventListener('resize', programar)
    window.addEventListener('orientationchange', programar)
    const observador = 'ResizeObserver' in window ? new ResizeObserver(programar) : null
    document.querySelectorAll(BARRAS_SUPERIORES).forEach(el => observador?.observe(el))
    observador?.observe(document.body)
    document.fonts?.ready.then(programar)
    return () => {
      window.removeEventListener('resize', programar)
      window.removeEventListener('orientationchange', programar)
      observador?.disconnect()
      if (cuadro) cancelAnimationFrame(cuadro)
    }
  }, [])

  // Baja solo hasta el último mensaje, salvo que la persona haya subido a leer.
  useEffect(() => {
    if (seguirAbajo.current && lista.current) lista.current.scrollTop = lista.current.scrollHeight
  }, [mensajes, escribiendo])

  function alScroll() {
    const el = lista.current
    seguirAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80
  }

  const agregar = (tipo, contenido, esHTML = true) =>
    setMensajes(m => [...m, { tipo, ...(esHTML ? { html: contenido } : { texto: contenido }) }])

  function abrir() {
    setAbierto(true)
    if (!iniciado.current) {
      iniciado.current = true
      agregar('bot', SALUDO)
    }
    seguirAbajo.current = true
    timers.current.push(window.setTimeout(() => entrada.current?.focus(), 300))
  }

  function cerrar() {
    setAbierto(false)
    setInsignia(false)
    botonAbrir.current?.focus()
  }

  // Escape cierra el chat (salvo que la ventana de producto esté abierta: ese Escape es de ella).
  useEffect(() => {
    if (!abierto) return undefined
    const alTecla = e => {
      if (e.key === 'Escape' && !productoAbierto) cerrar()
    }
    document.addEventListener('keydown', alTecla)
    return () => document.removeEventListener('keydown', alTecla)
  }, [abierto, productoAbierto])

  async function responder(pregunta, usarIA = true) {
    agregar('user', pregunta, false)
    setEscribiendo(true)

    let textoIA = null
    if (usarIA) {
      historialIA.current.push({ rol: 'user', texto: pregunta })
      textoIA = await preguntarAlChat(historialIA.current.slice(-8))
      if (textoIA === null) historialIA.current.pop()
      else historialIA.current.push({ rol: 'bot', texto: textoIA })
    }
    if (textoIA === null) await esperar(400 + Math.random() * 400)
    setEscribiendo(false)

    // La respuesta de la IA va como texto plano (nunca como HTML).
    if (textoIA !== null) { agregar('bot', textoIA, false); return }

    const faq = detectarIntencion(pregunta)
    agregar('bot', generarRespuesta(pregunta, lineas))
    if (faq && faq.despedida) {
      timers.current.push(window.setTimeout(() => agregar('bot',
        `Recordá: el envío es gratis desde <strong>${formatearPrecio(NEGOCIO.envioGratis)}</strong>. Para pedidos menores, coordinamos el costo por WhatsApp. 🚚`), 900))
    }
  }

  function enviar(e) {
    e.preventDefault()
    const pregunta = texto.trim()
    if (!pregunta) return
    setTexto('')
    if (!abierto) abrir()
    responder(pregunta)
  }

  const etiqueta = abierto ? `Cerrar chat con ${ZAPI_NOMBRE}` : `Abrir chat con ${ZAPI_NOMBRE}`

  return (
    <div className={'zapi-bot' + (abierto ? ' is-open' : '')} id="zapiBot" ref={contenedor}>
      <button ref={botonAbrir} className="zapi-toggle" id="zapiToggle" type="button" aria-label={etiqueta} aria-expanded={abierto} onClick={() => (abierto ? cerrar() : abrir())}>
        <span className="material-symbols-outlined zapi-chat-icon">forum</span>
        <span className="material-symbols-outlined zapi-close">close</span>
        <span className="zapi-badge" id="zapiBadge" style={{ display: insignia ? 'grid' : undefined }}>{insignia ? '1' : ''}</span>
      </button>
      <section className={'zapi-panel' + (abierto ? ' open' : '')} id="zapiPanel" role="dialog" aria-label={`Chat con ${ZAPI_NOMBRE}`} aria-modal="false">
        <header className="zapi-header">
          <div className="zapi-avatar">
            <svg className="zapi-sprout" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path className="zapi-sprout-stem" d="M12 19v-7.5"></path>
              <path className="zapi-sprout-leaf" d="M12 11.5c0-3.3-2.5-5.5-6-5.5 0 3.3 2.5 5.5 6 5.5z"></path>
              <path className="zapi-sprout-leaf" d="M12 11.5c0-3.3 2.5-5.5 6-5.5 0 3.3-2.5 5.5-6 5.5z"></path>
            </svg>
          </div>
          <div className="zapi-header-text">
            <h4>{ZAPI_NOMBRE}</h4>
            <span className="zapi-status">
              <span className="material-symbols-outlined zapi-status-dot">circle</span> Asistente virtual de ZAPI
            </span>
          </div>
          <Link className="zapi-header-accion" to="/carrito" aria-label="Ver el carrito">
            <span className="material-symbols-outlined">shopping_cart</span>
          </Link>
          <button className="zapi-header-close" id="zapiClose" type="button" aria-label="Cerrar chat" onClick={cerrar}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="zapi-messages" id="zapiMessages" ref={lista} role="log" aria-live="polite" aria-relevant="additions" aria-label={`Conversación con ${ZAPI_NOMBRE}`} tabIndex="0" onScroll={alScroll}>
          {mensajes.map((m, i) => (
            m.html !== undefined
              ? <div key={i} className={`zapi-msg ${m.tipo}`} dangerouslySetInnerHTML={{ __html: m.html }} />
              : <div key={i} className={`zapi-msg ${m.tipo}`}>{m.texto}</div>
          ))}
          {escribiendo && <div className="zapi-typing" id="zapiTyping"><span></span><span></span><span></span></div>}
        </div>
        <div className="zapi-chips" id="zapiChips">
          {ZAPI_MENU.map(item => (
            <button key={item.clave} className="zapi-chip" type="button" onClick={() => (item.pregunta ? responder(item.pregunta) : responder(item.etiqueta, false))}>
              <span className="material-symbols-outlined zapi-chip-icono" aria-hidden="true">{item.icono}</span>
              {item.etiqueta}
            </button>
          ))}
        </div>
        <div className="zapi-humano">
          <span>¿Preferís hablar con una persona?</span>
          <a className="zapi-humano-link" href="https://wa.me/59898268560?text=Hola%20ZAPI%2C%20necesito%20ayuda%20con%20un%20pedido" target="_blank" rel="noopener">
            <span className="material-symbols-outlined" aria-hidden="true">support_agent</span> Hablar con el equipo
          </a>
        </div>
        <form className="zapi-input-area" id="zapiForm" onSubmit={enviar}>
          <input ref={entrada} type="text" id="zapiInput" placeholder="Escribí tu consulta..." autoComplete="off" aria-label="Escribir mensaje" value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="zapi-send" type="submit" aria-label="Enviar mensaje">
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </section>
    </div>
  )
}

export default ChatbotZapi
