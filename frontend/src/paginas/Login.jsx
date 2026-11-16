import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Estilos from '../components/Estilos.jsx'
import { iniciarSesion, registrarCuenta } from '../api.js'

const CLAVE_MINIMA = 12
const DEF = '¡Hola! Ingresá para seguir creciendo'
const DEF_REGISTRO = '¡Hola! Creá tu cuenta y empecemos'
// Número de carita (imagen del personaje) para cada estado de ánimo.
const CARA = { happy: 1, idle: 1, look: 1, hide: 5, confuse: 2, error: 3, ok: 4 }
const TEXTOS_FUERZA = ['Escribí una contraseña', 'Muy corta', 'Aceptable', 'Buena', 'Muy fuerte']

const limitar = (v, a, b) => Math.max(a, Math.min(b, v))
const correoValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

function puntajeClave(v) {
  let puntos = 0
  if (v.length >= CLAVE_MINIMA) puntos += 1
  if (v.length >= 16) puntos += 1
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos += 1
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) puntos += 1
  if (/[^a-zA-Z0-9]/.test(v)) puntos += 1
  return v.length < CLAVE_MINIMA ? Math.min(puntos, 1) : Math.max(2, Math.min(puntos, 4))
}

// Solo se vuelve a rutas internas (nunca a otro sitio): evita redirecciones abiertas.
function esRutaInternaSegura(texto) {
  return typeof texto === 'string' && texto.length > 0 && !texto.includes('\\') && !texto.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(texto)
}

// El sitio viejo usaba "carrito.html"; ahora las rutas son "/carrito".
function rutaNueva(ruta) {
  const limpia = '/' + ruta.replace(/^\/+/, '').replace(/\.html$/, '')
  return limpia === '/index' ? '/' : limpia
}

function destino() {
  const volver = new URLSearchParams(window.location.search).get('volver')
  return esRutaInternaSegura(volver) ? rutaNueva(volver) : '/'
}

// Login y registro, con el personaje que reacciona a lo que escribís.
function Login() {
  const [modo, setModo] = useState('login')
  const [estado, setEstado] = useState('happy') // ánimo del personaje
  const [mensaje, setMensaje] = useState(DEF)
  const [espiar, setEspiar] = useState(false) // espía entre los dedos cuando se ve la clave
  const [guino, setGuino] = useState(false)
  const [corazon, setCorazon] = useState(false)
  const [inclinacion, setInclinacion] = useState({ r: 0, tx: 0 })
  const [ver, setVer] = useState(false)
  const [campos, setCampos] = useState({ nombre: '', correo: '', clave: '', clave2: '' })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const estadoRef = useRef('happy')
  const modoRef = useRef('login')
  const aviso = useRef(null)
  const cabeza = useRef(null)
  const caja = useRef(null)
  const pp = useRef(null)
  const campoClave = useRef(null)
  const campoCorreo = useRef(null)
  const campoNombre = useRef(null)

  const registro = modo === 'registro'
  const defMsg = () => (modoRef.current === 'registro' ? DEF_REGISTRO : DEF)

  // Cambia el ánimo del personaje (y opcionalmente su mensaje).
  function animo(nuevo, texto) {
    estadoRef.current = nuevo
    setEstado(nuevo)
    if (texto) setMensaje(texto)
  }
  function descansar() { setInclinacion({ r: 0, tx: 0 }) }

  // Cara actual: corazón al terminar bien, guiño ocasional, o la del ánimo.
  let cara = CARA[estado]
  if (estado === 'hide' && espiar) cara = 7
  else if (estado === 'ok' && corazon) cara = 8
  else if (guino && (estado === 'idle' || estado === 'look')) cara = 7

  // "Pop" del personaje cada vez que cambia de cara (menos en el guiño).
  const caraBase = guino ? null : cara
  useEffect(() => {
    if (caraBase === null || !pp.current) return
    pp.current.classList.remove('pop')
    void pp.current.offsetWidth
    pp.current.classList.add('pop')
  }, [caraBase])

  // Al entrar: contento, y a los 1,8 s pasa a "idle".
  useEffect(() => {
    const t = window.setTimeout(() => { if (estadoRef.current === 'happy') animo('idle') }, 1800)
    return () => window.clearTimeout(t)
  }, [])

  // Cuando sale bien, a los 1,3 s aparece el corazón.
  useEffect(() => {
    if (estado !== 'ok') return undefined
    const t = window.setTimeout(() => setCorazon(true), 1300)
    return () => { window.clearTimeout(t); setCorazon(false) }
  }, [estado])

  // Guiños al azar cada tanto.
  useEffect(() => {
    let t1, t2
    const programar = () => {
      t1 = window.setTimeout(() => {
        if (estadoRef.current === 'idle' || estadoRef.current === 'look') {
          setGuino(true)
          t2 = window.setTimeout(() => setGuino(false), 750)
        }
        programar()
      }, 3200 + Math.random() * 3200)
    }
    programar()
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [])

  // El personaje se inclina hacia el mouse (solo cuando está tranquilo).
  useEffect(() => {
    const alMover = e => {
      if (estadoRef.current !== 'idle' || !cabeza.current) return
      const r = cabeza.current.getBoundingClientRect()
      const dx = limitar((e.clientX - r.left - r.width / 2) / (r.width * 1.4), -1, 1)
      setInclinacion({ r: Number((dx * 4).toFixed(2)), tx: Number((dx * 2).toFixed(2)) })
    }
    document.addEventListener('pointermove', alMover)
    return () => document.removeEventListener('pointermove', alMover)
  }, [])

  useEffect(() => () => { window.clearTimeout(aviso.current) }, [])

  function confundir() {
    window.clearTimeout(aviso.current)
    animo('confuse', 'Revisá el correo: falta el @ o el .com')
    setInclinacion({ r: -4, tx: 0 })
    aviso.current = window.setTimeout(() => {
      if (estadoRef.current !== 'confuse') return
      descansar()
      if (document.activeElement === campoClave.current) animo('hide', 'Shh, no estoy mirando')
      else animo('idle', defMsg())
    }, 2200)
  }

  function sacudir() {
    // Reinicia la animación de sacudida sin recrear el formulario.
    caja.current?.classList.remove('shake')
    void caja.current?.offsetWidth
    caja.current?.classList.add('shake')
    window.setTimeout(() => { if (estadoRef.current === 'error') animo('idle', defMsg()) }, 2400)
  }

  const escribir = nombre => e => {
    setCampos(c => ({ ...c, [nombre]: e.target.value }))
    setErrores(er => ({ ...er, [{ nombre: 'n', correo: 'u', clave: 'p', clave2: 'p2' }[nombre]]: '' }))
    if (nombre === 'correo') {
      const largo = e.target.value.length
      setInclinacion({ r: limitar((largo - 10) * 0.3, -3, 4), tx: limitar((largo - 10) * 0.3, -2, 3) })
    }
  }

  const alEnfocarCorreo = () => { window.clearTimeout(aviso.current); animo('look', defMsg()); setInclinacion({ r: -3, tx: -2 }) }
  const alSalirCorreo = () => {
    if (campos.correo.trim() && !correoValido(campos.correo.trim())) confundir()
    else if (estadoRef.current === 'look') { animo('idle'); descansar() }
  }
  const alEnfocarClave = () => {
    if (estadoRef.current === 'confuse') return
    animo('hide', 'Shh, no estoy mirando')
    descansar()
  }
  const alSalirClave = e => {
    if (e.relatedTarget && e.relatedTarget.id === 't') return
    setEspiar(false)
    if (estadoRef.current === 'confuse') return
    animo('idle', defMsg())
  }

  function alternarVer() {
    const mostrar = !ver
    setVer(mostrar)
    campoClave.current?.focus()
    setEspiar(mostrar)
  }

  function cambiarModo(nuevo) {
    if (modoRef.current === nuevo) return
    modoRef.current = nuevo
    setModo(nuevo)
    setErrores({})
    animo('idle', nuevo === 'registro' ? DEF_REGISTRO : DEF)
    window.requestAnimationFrame(() => (nuevo === 'registro' ? campoNombre : campoCorreo).current?.focus())
  }

  async function enviar(e) {
    e.preventDefault()
    const correo = campos.correo.trim()
    setErrores({})
    if (!correoValido(correo)) {
      setErrores({ u: 'Revisá el correo: falta el @ o el .com' })
      confundir()
      return
    }
    if (registro) {
      const nuevos = {}
      if (campos.nombre.trim().length < 2) nuevos.n = 'Escribí tu nombre (mínimo 2 letras).'
      if (campos.clave.length < CLAVE_MINIMA) nuevos.p = 'Usá al menos ' + CLAVE_MINIMA + ' caracteres.'
      if (campos.clave2 !== campos.clave) nuevos.p2 = 'Las contraseñas no coinciden.'
      if (Object.keys(nuevos).length) {
        setErrores(nuevos)
        animo('confuse', 'Revisá los campos marcados')
        sacudir()
        return
      }
    } else if (!campos.clave) {
      setErrores({ p: 'Escribí tu contraseña.' })
      animo('confuse', 'Falta la contraseña')
      return
    }

    setEnviando(true)
    try {
      const primera = registro
        ? await registrarCuenta(campos.nombre.trim(), correo, campos.clave)
        : await iniciarSesion(correo, campos.clave)
      if (!primera.ok) {
        const msg = primera.datos.error
        if (primera.status === 409) setErrores({ u: msg || 'Ya existe una cuenta con ese correo.' })
        if (primera.status === 400 && /contraseña/i.test(msg || '')) setErrores({ p: msg })
        animo('error', msg || 'Ups, revisá tus datos e intentá de nuevo')
        sacudir()
        return
      }
      // Registrarse no inicia sesión por sí solo: se entra enseguida con los mismos datos.
      let sesion = primera.datos
      if (registro) {
        const entrada = await iniciarSesion(correo, campos.clave)
        sesion = entrada.datos
        if (!entrada.ok) {
          animo('error', 'Tu cuenta se creó. Ingresá con tu correo y contraseña.')
          cambiarModo('login')
          return
        }
      }
      animo('ok', registro ? '¡Cuenta creada! Entrando…' : '¡Listo! Entrando…')
      window.setTimeout(() => {
        window.location.href = sesion && sesion.rol === 'admin' ? '/admin' : destino()
      }, 1500)
    } catch {
      animo('error', 'No pudimos conectarnos. Revisá la conexión e intentá de nuevo.')
      sacudir()
    } finally {
      setEnviando(false)
    }
  }

  const clave = campos.clave
  const nivel = clave ? puntajeClave(clave) : 0
  const campo = id => ({ className: errores[id] ? 'malo' : undefined, 'aria-invalid': errores[id] ? 'true' : undefined })

  return (
    <>
      <Estilos hojas={['login']} />
      <Link className="volver" to="/">Volver al inicio</Link>
      <main className="wrap">
        <div id="shake" ref={caja}>
          <div className="head" id="hd" ref={cabeza} data-state={estado} data-face={cara} data-peek={estado === 'hide' && espiar ? '' : undefined} role="img" aria-label="Personaje con un brote en la cabeza">
            <div className="tilt" id="tilt" style={{ '--r': inclinacion.r + 'deg', '--tx': inclinacion.tx + '%' }}>
              <div className="pp" id="pp" ref={pp}>
                <div className="bob">
                  {[['f1', '01-feliz'], ['f2', '02-duda'], ['f3', '03-llanto'], ['f4', '04-lentes'], ['f5', '05-ojos-tapados'], ['f7', '07-guino'], ['f8', '08-corazon']].map(([clase, archivo]) => (
                    <img key={clase} className={'ex ' + clase} src={`/personaje/${archivo}.svg`} alt="" draggable="false" decoding="async" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <form className="card" id="f" noValidate onSubmit={enviar}>
            <div className="tabs" role="tablist" aria-label="Elegí una opción">
              <button className="tab" id="tabLogin" type="button" role="tab" aria-selected={!registro} aria-controls="f" onClick={() => cambiarModo('login')}>Ingresar</button>
              <button className="tab" id="tabRegistro" type="button" role="tab" aria-selected={registro} aria-controls="f" onClick={() => cambiarModo('registro')}>Crear cuenta</button>
            </div>
            <h1 id="titulo">{registro ? 'Creá tu cuenta' : 'Bienvenido'}</h1>
            <p className="msg" id="msg" aria-live="polite">{mensaje}</p>
            <div className="f" id="fn" hidden={!registro}>
              <label htmlFor="n">Nombre</label>
              <div className="campo">
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z"></path></svg>
                <input id="n" ref={campoNombre} type="text" autoComplete="name" placeholder="Tu nombre" maxLength="120" value={campos.nombre} onChange={escribir('nombre')} {...campo('n')} />
              </div>
              <p className="err" id="errN" role="alert">{errores.n}</p>
            </div>
            <div className="f">
              <label htmlFor="u">Correo</label>
              <div className="campo">
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 7.2L5.2 7H4.5v.3L12 13l7.5-5.7V7h-.7L12 12.2Z"></path></svg>
                <input id="u" ref={campoCorreo} type="email" autoComplete="email" placeholder="tu@correo.com" value={campos.correo} onChange={escribir('correo')} onFocus={alEnfocarCorreo} onBlur={alSalirCorreo} {...campo('u')} />
              </div>
              <p className="err" id="errU" role="alert">{errores.u}</p>
            </div>
            <div className="f">
              <label htmlFor="p">Contraseña</label>
              <div className="campo">
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"></path></svg>
                <input id="p" ref={campoClave} type={ver ? 'text' : 'password'} autoComplete={registro ? 'new-password' : 'current-password'} placeholder={registro ? 'Mínimo 12 caracteres' : '••••••••'} value={clave} onChange={escribir('clave')} onFocus={alEnfocarClave} onBlur={alSalirClave} {...campo('p')} />
                <button type="button" className="eye" id="t" aria-label="Mostrar contraseña" onClick={alternarVer}>{ver ? 'OCULTAR' : 'VER'}</button>
              </div>
              <p className="err" id="errP" role="alert">{errores.p}</p>
            </div>
            <div className="registro-extra" id="extra" hidden={!registro}>
              <div className="fuerza" aria-live="polite">
                <div className="fuerza-barra">
                  <span id="fuerzaRelleno" className={nivel ? 'f' + nivel : ''} style={{ width: nivel * 25 + '%' }}></span>
                </div>
                <span className="fuerza-texto" id="fuerzaTexto">{TEXTOS_FUERZA[nivel]}</span>
              </div>
              <ul className="reqs" id="reqs">
                <li data-req="largo" className={clave.length >= CLAVE_MINIMA ? 'ok' : undefined}><span className="tilde" aria-hidden="true"></span>Al menos 12 caracteres</li>
                <li data-req="mezcla" className={/\d/.test(clave) && /[a-zA-Z]/.test(clave) ? 'ok' : undefined}><span className="tilde" aria-hidden="true"></span>Letras y números (recomendado)</li>
                <li data-req="igual" className={clave.length > 0 && clave === campos.clave2 ? 'ok' : undefined}><span className="tilde" aria-hidden="true"></span>Las dos contraseñas coinciden</li>
              </ul>
              <div className="f" id="fp2">
                <label htmlFor="p2">Repetí la contraseña</label>
                <div className="campo">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"></path></svg>
                  <input id="p2" type={ver ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={campos.clave2} onChange={escribir('clave2')} onFocus={alEnfocarClave} onBlur={alSalirClave} {...campo('p2')} />
                </div>
                <p className="err" id="errP2" role="alert">{errores.p2}</p>
              </div>
              <p className="legal">Al crear tu cuenta aceptás nuestra <Link to="/privacidad">política de privacidad</Link>. Con tu cuenta seguís tus pedidos y comprás más rápido.</p>
            </div>
            <button className="go" id="go" type="submit" disabled={enviando}>{registro ? 'Crear cuenta' : 'Ingresar'}</button>
            <p className="tag">Pequeños brotes, grandes sueños</p>
          </form>
        </div>
      </main>
    </>
  )
}

export default Login
