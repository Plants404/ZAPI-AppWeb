import { useEffect, useRef, useState } from 'react'
import { NEGOCIO } from '../data/negocio.js'
import { enviarContacto } from '../api.js'
import { abrirWhatsApp, enviarCorreoEmailJS, limpiarValor, validarCorreo, validarTelefono } from '../utilidades.js'

const LIMITE_MENSAJE = 2000
const VACIO = { nombre: '', email: '', asunto: '', telefono: '', mensaje: '', sitio: '' }

// Reglas de cada campo: mensaje si falta, mensaje si es corto/inválido.
const REGLAS = {
  nombre: { vacio: 'Escribí tu nombre', corto: 'Escribí tu nombre completo', minimo: 2 },
  email: { vacio: 'Escribí tu correo electrónico', corto: 'Revisá el correo electrónico', tipo: 'correo' },
  asunto: { vacio: 'Escribí el asunto', corto: 'Escribí un asunto más descriptivo', minimo: 3 },
  telefono: { vacio: '', corto: 'Revisá el teléfono de contacto', tipo: 'telefono', opcional: true },
  mensaje: { vacio: 'Contanos sobre tu consulta', corto: 'Contanos un poco más sobre tu consulta', minimo: 10 }
}
const IDS = { nombre: 'contactoNombre', email: 'contactoCorreo', asunto: 'contactoAsunto', telefono: 'contactoTelefono', mensaje: 'contactoConsulta' }

// Devuelve el texto del error de un campo ('' si está bien).
function revisar(nombre, texto) {
  const regla = REGLAS[nombre]
  const valor = texto.trim()
  if (!valor) return regla.opcional ? '' : regla.vacio
  if (regla.tipo === 'correo' && !validarCorreo(valor)) return regla.corto
  if (regla.tipo === 'telefono' && !validarTelefono(valor)) return regla.corto
  if (regla.minimo && valor.length < regla.minimo) return regla.corto
  return ''
}

function mensajeDeContacto(d) {
  return ['Hola ZAPI, tengo una consulta:', '', 'Nombre: ' + d.nombre, 'Correo: ' + d.email, 'Telefono: ' + d.telefono, 'Asunto: ' + d.asunto, '', 'Mensaje:', d.mensaje].filter(Boolean).join('\n')
}

// Formulario de contacto: guarda la consulta en el panel, avisa por correo (EmailJS)
// y, si ambas fallan, abre WhatsApp con la consulta ya escrita.
function Contacto() {
  const [campos, setCampos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [estado, setEstado] = useState({ mensaje: '', tipo: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const titulo = useRef(null)
  const restantes = Math.max(0, LIMITE_MENSAJE - campos.mensaje.length)

  useEffect(() => { if (enviado) titulo.current?.focus() }, [enviado])

  const cambiar = nombre => e => {
    setCampos(c => ({ ...c, [nombre]: e.target.value }))
    setErrores(er => ({ ...er, [nombre]: '' }))
  }

  // Props comunes de cada campo: valor, cambio, revisión al salir y marca de error.
  const campo = nombre => ({
    className: 'campo-input' + (errores[nombre] ? ' campo-con-error' : ''),
    value: campos[nombre],
    onChange: cambiar(nombre),
    onBlur: () => { if (campos[nombre].trim()) setErrores(er => ({ ...er, [nombre]: revisar(nombre, campos[nombre]) })) },
    'aria-invalid': errores[nombre] ? 'true' : undefined
  })

  function reiniciar() {
    setCampos(VACIO)
    setErrores({})
    setEstado({ mensaje: '', tipo: '' })
    setEnviado(false)
    window.requestAnimationFrame(() => document.getElementById('contactoNombre')?.focus())
  }

  async function enviar(evento) {
    evento.preventDefault()
    const nuevos = {}
    for (const nombre of Object.keys(REGLAS)) {
      const error = revisar(nombre, campos[nombre])
      if (error) nuevos[nombre] = error
    }
    setErrores(nuevos)
    const primero = Object.keys(REGLAS).find(n => nuevos[n])
    if (primero) {
      setEstado({ mensaje: 'Revisá los campos marcados.', tipo: 'error' })
      document.getElementById(IDS[primero])?.focus()
      return
    }
    if (campos.sitio.trim()) return // trampa para robots

    const datos = {
      nombre: limpiarValor(campos.nombre),
      email: limpiarValor(campos.email),
      asunto: limpiarValor(campos.asunto),
      telefono: limpiarValor(campos.telefono),
      mensaje: limpiarValor(campos.mensaje)
    }
    setEnviando(true)
    setEstado({ mensaje: '', tipo: '' })

    const guardada = await enviarContacto(datos)
    let porCorreo = false
    try {
      porCorreo = await enviarCorreoEmailJS(NEGOCIO.emailjs.plantillaContacto, datos)
    } catch (error) {
      console.warn('[ZAPI] No se pudo enviar el correo:', error && error.message)
    }

    if (guardada || porCorreo) {
      setCampos(VACIO)
      setEnviado(true)
    } else {
      abrirWhatsApp(mensajeDeContacto(datos), true)
      setEstado({ mensaje: 'Te respondemos por WhatsApp.', tipo: '' })
    }
    setEnviando(false)
  }

  return (
    <>
        <section className="banner-pagina">
          <div>
            <span className="etiqueta">Contacto</span>
            <h1>Empezá hoy a transformar tus espacios.</h1>
            <p>Contanos qué necesitás y te respondemos a la brevedad. También podés coordinar todo directamente por WhatsApp.</p>
          </div>
          <ul className="banner-ventajas">
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Presupuesto claro y personalizado
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">eco</span> Asesoramiento agroecológico
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">location_on</span> Atención cercana en Montevideo
            </li>
          </ul>
        </section>
        <section className="contacto-pagina">
          <aside className="contacto-info">
            <span className="etiqueta">Atención directa</span>
            <h2>Hablemos de tu espacio.</h2>
            <p>Respondemos consultas de hogares, empresas e instituciones. Si preferís una respuesta más rápida, escribinos por WhatsApp.</p>
            <ul className="contacto-datos">
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">chat</span>
                <div>
                  <strong>WhatsApp</strong>
                  <a href="https://wa.me/59898268560" target="_blank" rel="noopener">098 268 560</a>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <div>
                  <strong>Correo</strong>
                  <a href="mailto:zapi.vivero@gmail.com">zapi.vivero@gmail.com</a>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                <div>
                  <strong>Ubicación</strong>
                  <span>Congreso de Abril, Montevideo, Uruguay</span>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                <div>
                  <strong>Visitas</strong>
                  <span>Visitas coordinadas previamente por WhatsApp.</span>
                </div>
              </li>
            </ul>
            <a className="boton boton-primario boton-bloque" href="https://wa.me/59898268560" target="_blank" rel="noopener">
              <span className="material-symbols-outlined" aria-hidden="true">chat</span> Escribir por WhatsApp
            </a>
          </aside>
          <div className="contacto-card">
            <div className="contacto-card-cabecera">
              <span className="etiqueta">Escribinos</span>
              <h2>Contanos qué necesitás.</h2>
            </div>
            <form className="contacto-form" id="contactoForm" noValidate hidden={enviado} onSubmit={enviar}>
              <div className="form-fila">
                <div>
                  <label className="campo-label" htmlFor="contactoNombre">Nombre <span aria-hidden="true">*</span></label>
                  <input {...campo('nombre')} id="contactoNombre" name="nombre" type="text" autoComplete="name" maxLength="120" aria-describedby="errorNombre" />
                  <span className="campo-error" id="errorNombre">{errores.nombre}</span>
                </div>
                <div>
                  <label className="campo-label" htmlFor="contactoCorreo">Correo electrónico <span aria-hidden="true">*</span></label>
                  <input {...campo('email')} id="contactoCorreo" name="correo" type="email" autoComplete="email" maxLength="160" aria-describedby="errorCorreo" />
                  <span className="campo-error" id="errorCorreo">{errores.email}</span>
                </div>
              </div>
              <div className="form-fila">
                <div>
                  <label className="campo-label" htmlFor="contactoAsunto">Asunto <span aria-hidden="true">*</span></label>
                  <input {...campo('asunto')} id="contactoAsunto" name="asunto" type="text" maxLength="160" aria-describedby="errorAsunto" />
                  <span className="campo-error" id="errorAsunto">{errores.asunto}</span>
                </div>
                <div>
                  <label className="campo-label" htmlFor="contactoTelefono">Teléfono (opcional)</label>
                  <input {...campo('telefono')} id="contactoTelefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength="40" aria-describedby="errorTelefono" />
                  <span className="campo-error" id="errorTelefono">{errores.telefono}</span>
                </div>
              </div>
              <label className="campo-label" htmlFor="contactoConsulta">Mensaje <span aria-hidden="true">*</span></label>
              <textarea {...campo('mensaje')} id="contactoConsulta" name="consulta" rows="6" maxLength={LIMITE_MENSAJE} aria-describedby="errorConsulta contactoContador" />
              <span className="campo-error" id="errorConsulta">{errores.mensaje}</span>
              <span className={'contacto-contador' + (restantes <= 100 ? ' contador-cerca' : '')} id="contactoContador">{restantes}/{LIMITE_MENSAJE}</span>
              <div className="visually-hidden" aria-hidden="true">
                <label htmlFor="contactoSitio">Dejá este campo vacío</label>
                <input id="contactoSitio" name="sitio_web" type="text" tabIndex="-1" autoComplete="off" value={campos.sitio} onChange={cambiar('sitio')} />
              </div>
              <p className={'formulario-estado' + (estado.tipo ? ' estado-' + estado.tipo : '')} id="contactoEstado" role="status" aria-live="polite" hidden={!estado.mensaje}>{estado.mensaje}</p>
              <div className="contacto-pie">
                <p className="privacy-note">Tus datos solo se usan para responderte esta consulta. Los campos con * son obligatorios.</p>
                <button className="boton boton-primario" id="contactoEnviar" type="submit" disabled={enviando}>
                  <span id="contactoEnviarTexto">{enviando ? 'Enviando…' : 'Enviar mensaje'}</span>
                </button>
              </div>
            </form>
            <div className="contacto-confirmacion" id="contactoOk" hidden={!enviado}>
              <span className="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
              <h3 id="contactoOkTitulo" tabIndex="-1" ref={titulo}>¡Gracias por escribirnos!</h3>
              <p>Recibimos tu consulta y te responderemos a la brevedad.</p>
              <button className="boton boton-secundario" id="contactoReiniciar" type="button" onClick={reiniciar}>Enviar otra consulta</button>
            </div>
          </div>
        </section>
    </>
  )
}

export default Contacto
