import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerBorrador, obtenerImagenes, obtenerProductosAdmin, obtenerPublicado, guardarBorradorApi, publicarBorrador, resolverImagen } from '../api.js'
import { buscarPagina, paginas } from '../esquema-editable.js'
import { RUTA_DE_PAGINA } from '../sitioEditable.js'
import { NOMBRE_VISTA_PREVIA } from '../estado/sitio.js'
import { limpiarValor } from '../utilidades.js'
import { useAdmin, useCarga } from './contexto.jsx'
import DialogoBiblioteca from './DialogoBiblioteca.jsx'
import DialogoHistorial from './DialogoHistorial.jsx'
import {
  COLOR_HEX, ESTILO_BASE, PALETAS, camposModificados, claveCampo, contarCambios,
  contrasteConBlanco, copiar, leerOriginales, ponerValor, valorEn
} from './estiloContenido.js'

const ANCHO_DISPOSITIVO = { escritorio: 1280, tablet: 768, celular: 390 }
const USOS_COLOR = { primario: 'botones, títulos', secundario: 'hover, íconos', acento: 'detalles, foco' }
const NOMBRES_COLOR = { primario: 'Primario', secundario: 'Secundario', acento: 'Acento' }

const textoSecciones = pagina => `${pagina.secciones.length} ${pagina.secciones.length === 1 ? 'sección' : 'secciones'}`
function textoSeccion(seccion) {
  const imagenes = seccion.campos.filter(c => c.tipo === 'imagen').length
  const textos = seccion.campos.length - imagenes
  const partes = []
  if (imagenes) partes.push(`${imagenes} ${imagenes === 1 ? 'imagen' : 'imágenes'}`)
  if (textos) partes.push(`${textos} ${textos === 1 ? 'campo' : 'campos'}`)
  return partes.join(' · ')
}

const docDelMarco = marco => {
  try { return marco && marco.contentDocument && marco.contentDocument.body ? marco.contentDocument : null } catch { return null }
}

// Mantiene el marco (página real) a tamaño de dispositivo y lo achica para que entre en el lienzo.
function useEscala(lienzo, marco, ancho, dependencias) {
  const ajustar = useCallback(() => {
    const l = lienzo.current
    const m = marco.current
    if (!l || !m || !l.clientWidth) return
    const escala = Math.min(1, l.clientWidth / ancho)
    m.style.width = `${ancho}px`
    m.style.height = `${l.clientHeight / escala}px`
    m.style.transform = `scale(${escala})`
    m.style.left = `${Math.max(0, (l.clientWidth - ancho * escala) / 2)}px`
  }, [lienzo, marco, ancho])
  useEffect(() => {
    ajustar()
    if (!window.ResizeObserver || !lienzo.current) return undefined
    const observador = new ResizeObserver(ajustar)
    observador.observe(lienzo.current)
    return () => observador.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajustar, ...dependencias])
}

function CampoTexto({ pagina, seccion, campo, original, guardado, cambiar }) {
  const id = `ed-${pagina.id}-${seccion.id}-${campo.id}`
  const [escrito, setEscrito] = useState(null) // lo que se está tecleando (puede quedar vacío sin volver al original hasta salir)
  const valor = escrito !== null ? escrito : (typeof guardado === 'string' ? guardado : original)
  const modificado = typeof guardado === 'string' && guardado !== original
  const alEscribir = e => {
    const v = campo.tipo === 'parrafo' ? e.target.value : limpiarValor(e.target.value)
    setEscrito(v)
    cambiar(v.trim() === '' || v === original ? undefined : v)
  }
  return (
    <div className="ed-campo">
      <div className="ed-campo-cabecera">
        <label htmlFor={id}>{campo.etiqueta}</label>
        {modificado && <button className="ed-restaurar" type="button" onClick={() => { setEscrito(null); cambiar(undefined) }}>Volver al original</button>}
        <span className="ed-contador">{valor.length}/{campo.max}</span>
      </div>
      {campo.tipo === 'parrafo'
        ? <textarea id={id} rows="4" maxLength={campo.max} value={valor} onChange={alEscribir} onBlur={() => setEscrito(null)} />
        : <input id={id} type="text" maxLength={campo.max} value={valor} onChange={alEscribir} onBlur={() => setEscrito(null)} />}
    </div>
  )
}

function CampoImagen({ pagina, seccion, campo, original, guardado, cambiar, elegir }) {
  const id = `ed-${pagina.id}-${seccion.id}-${campo.id}`
  const src = guardado && guardado.id ? resolverImagen(`/api/imagenes/${guardado.id}`) : original.src
  const alt = guardado && typeof guardado.alt === 'string' ? guardado.alt : original.alt
  return (
    <div className="ed-campo ed-campo-imagen">
      <div className="ed-campo-cabecera">
        <span className="ed-campo-etiqueta">{campo.etiqueta}</span>
        {guardado && <button className="ed-restaurar" type="button" onClick={() => cambiar(undefined)}>Volver al original</button>}
      </div>
      <button className="ed-imagen-actual" type="button" aria-label="Cambiar imagen" onClick={elegir}>
        {src ? <img src={src} alt="" /> : <span className="ed-imagen-vacia">Sin imagen</span>}
        <span className="ed-imagen-cambiar"><span className="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Cambiar imagen</span>
      </button>
      <p className="ed-ayuda">{campo.ayuda}</p>
      <label className="ed-campo-etiqueta" htmlFor={`${id}-alt`}>Descripción de la imagen (alt)</label>
      <input id={`${id}-alt`} type="text" maxLength="160" value={alt} disabled={!guardado} placeholder="Qué se ve en la foto"
        onChange={e => cambiar({ id: guardado.id, alt: limpiarValor(e.target.value).slice(0, 160) })} />
      {!guardado && <p className="ed-ayuda">Elegí una imagen de la biblioteca para poder describirla.</p>}
    </div>
  )
}

function Editor({ inicial, alSalir, alRecargar }) {
  const { avisar } = useAdmin()
  const [contenido, setContenido] = useState(() => (inicial.borrador ? copiar(inicial.borrador.contenido || {}) : copiar(inicial.publicado.contenido)))
  const [marca, setMarca] = useState(() => {
    const origen = inicial.borrador || inicial.publicado
    const estilo = origen.estilo || {}
    return {
      colores: Object.assign({}, ESTILO_BASE.colores, estilo.colores || {}),
      tipografia: estilo.tipografia || ESTILO_BASE.tipografia,
      botones: estilo.botones || ESTILO_BASE.botones
    }
  })
  const [publicado, setPublicado] = useState(inicial.publicado)
  const [seleccion, setSeleccion] = useState({ pagina: 'inicio', seccion: 'portada' })
  const [pestana, setPestana] = useState('contenido')
  const [vista, setVista] = useState('editor')
  const [marcaAbierta, setMarcaAbierta] = useState(false)
  const [dispositivo, setDispositivo] = useState('escritorio')
  const [originales, setOriginales] = useState({})
  const [imagenes, setImagenes] = useState([])
  const [dialogo, setDialogo] = useState(null) // { tipo: 'biblioteca', destino } | { tipo: 'historial' }
  const [estado, setEstado] = useState({ texto: '', tipo: '' })
  const [errores, setErrores] = useState({})
  const [ocupado, setOcupado] = useState('')
  const [listo, setListo] = useState({ editor: null, marca: false }) // editor: id de la página cargada en el marco
  const marco = useRef(null)
  const marcoMarca = useRef(null)
  const lienzo = useRef(null)
  const lienzoMarca = useRef(null)
  const contenedores = useRef({})
  const seleccionRef = useRef(seleccion)
  const seleccionarRef = useRef(null)

  const pagina = buscarPagina(seleccion.pagina)
  const seccion = pagina.secciones.find(s => s.id === seleccion.seccion) || pagina.secciones[0]
  const rutaMarco = RUTA_DE_PAGINA[seleccion.pagina]

  useEffect(() => { seleccionRef.current = seleccion })

  useEffect(() => {
    let vigente = true
    obtenerImagenes().then(d => { if (vigente) setImagenes(Array.isArray(d.imagenes) ? d.imagenes : []) }).catch(() => { /* se carga al abrir la biblioteca */ })
    return () => { vigente = false }
  }, [])

  // Cada cambio de contenido o de marca se manda a los marcos que ya arrancaron.
  useEffect(() => {
    const mensaje = { tipo: 'zapi-borrador', estilo: marca, contenido }
    if (listo.editor && marco.current && marco.current.contentWindow) marco.current.contentWindow.postMessage(mensaje, window.location.origin)
    if (listo.marca && marcoMarca.current && marcoMarca.current.contentWindow) marcoMarca.current.contentWindow.postMessage(mensaje, window.location.origin)
  }, [contenido, marca, listo])

  // Cuando cambia la página se descarta lo que tenía el marco hasta que avise de nuevo.
  const [paginaDelMarco, setPaginaDelMarco] = useState(seleccion.pagina)
  if (paginaDelMarco !== seleccion.pagina) {
    setPaginaDelMarco(seleccion.pagina)
    setListo(l => ({ ...l, editor: null }))
  }

  useEscala(lienzo, marco, ANCHO_DISPOSITIVO[dispositivo], [dispositivo, vista])
  useEscala(lienzoMarca, marcoMarca, 1280, [vista, marcaAbierta])

  // Marca la sección elegida con un borde y una etiqueta dentro de la página real.
  function elementoDeSeccion(doc, s) {
    const elementos = s.campos.map(c => doc.querySelector(c.selector)).filter(Boolean)
    if (!elementos.length) return null
    if (elementos.length === 1) return elementos[0].closest('section, header, article, aside') || elementos[0].parentElement
    let ancestro = elementos[0].parentElement
    while (ancestro && !elementos.every(el => ancestro.contains(el))) ancestro = ancestro.parentElement
    return ancestro && ancestro !== doc.body && ancestro !== doc.documentElement ? ancestro : elementos[0].closest('section, header, article') || elementos[0].parentElement
  }

  function prepararMarco(doc, actual) {
    contenedores.current = {}
    actual.secciones.forEach(s => { contenedores.current[s.id] = elementoDeSeccion(doc, s) })
    if (!doc.getElementById('zapi-editor-estilo')) {
      const estiloEl = doc.createElement('style')
      estiloEl.id = 'zapi-editor-estilo'
      estiloEl.textContent = `
        .zapi-editando { outline: 3px solid #4a7c59 !important; outline-offset: -3px; position: relative; }
        .zapi-etiqueta-seccion { position: absolute; top: 8px; left: 8px; z-index: 99999; background: #1f3a2e; color: #fff; font: 600 12px Inter, system-ui, sans-serif; padding: 6px 10px; border-radius: 999px; pointer-events: none; }
        html { cursor: default; }`
      doc.head.appendChild(estiloEl)
    }
    if (!doc.documentElement.dataset.zapiEditor) {
      doc.documentElement.dataset.zapiEditor = '1'
      doc.addEventListener('click', evento => {
        const enlace = evento.target.closest && evento.target.closest('a, button, form')
        if (enlace) evento.preventDefault()
        const actualId = seleccionRef.current.pagina
        const hallada = buscarPagina(actualId).secciones.find(s => {
          const contenedor = contenedores.current[s.id]
          return contenedor && contenedor.contains(evento.target)
        })
        if (hallada && hallada.id !== seleccionRef.current.seccion) seleccionarRef.current(actualId, hallada.id)
      }, true)
      doc.addEventListener('submit', evento => evento.preventDefault(), true)
    }
  }

  const seleccionar = useCallback((paginaId, seccionId) => {
    const p = buscarPagina(paginaId)
    setSeleccion({ pagina: paginaId, seccion: seccionId && p.secciones.some(s => s.id === seccionId) ? seccionId : p.secciones[0].id })
    setVista('editor')
  }, [])
  useEffect(() => { seleccionarRef.current = seleccionar }, [seleccionar])

  // El sitio dentro del marco avisa cuando arrancó: se leen los textos originales y se le manda el borrador.
  useEffect(() => {
    function alRecibir(e) {
      if (e.origin !== window.location.origin || !e.data || e.data.tipo !== 'zapi-vista-lista') return
      if (marco.current && e.source === marco.current.contentWindow) {
        const doc = docDelMarco(marco.current)
        const actual = buscarPagina(seleccionRef.current.pagina)
        if (doc) {
          const leidos = leerOriginales(doc, actual)
          setOriginales(o => ({ ...o, [actual.id]: leidos }))
          prepararMarco(doc, actual)
        }
        setListo(l => ({ ...l, editor: actual.id }))
      } else if (marcoMarca.current && e.source === marcoMarca.current.contentWindow) {
        setListo(l => ({ ...l, marca: true }))
      }
    }
    window.addEventListener('message', alRecibir)
    return () => window.removeEventListener('message', alRecibir)
  }, [])

  // Resalta la sección elegida cuando el marco está listo o cambia la selección.
  useEffect(() => {
    if (listo.editor !== seleccion.pagina) return
    const doc = docDelMarco(marco.current)
    if (!doc) return
    doc.querySelectorAll('.zapi-editando').forEach(el => el.classList.remove('zapi-editando'))
    doc.querySelectorAll('.zapi-etiqueta-seccion').forEach(el => el.remove())
    const contenedor = contenedores.current[seleccion.seccion]
    if (!contenedor) return
    contenedor.classList.add('zapi-editando')
    const etiqueta = doc.createElement('span')
    etiqueta.className = 'zapi-etiqueta-seccion'
    etiqueta.textContent = `${seccion.titulo} · editando`
    contenedor.appendChild(etiqueta)
    contenedor.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [listo.editor, seleccion, seccion.titulo])

  const cambios = contarCambios(publicado, contenido, marca)
  const originalesDe = originales[pagina.id] || {}

  function cambiarCampo(paginaId, seccionId, campoId, valor) {
    setContenido(c => ponerValor(c, paginaId, seccionId, campoId, valor))
  }

  function mostrarMarca() {
    setMarcaAbierta(true)
    setVista('marca')
  }

  function accionAtajo(atajo) {
    if (atajo === 'biblioteca') setDialogo({ tipo: 'biblioteca', destino: null })
    else if (atajo === 'marca') mostrarMarca()
    else if (atajo === 'historial') setDialogo({ tipo: 'historial' })
  }

  function colorInvalido() {
    const nuevos = {}
    Object.keys(NOMBRES_COLOR).forEach(clave => {
      if (!COLOR_HEX.test(marca.colores[clave])) nuevos[clave] = `Color ${clave} inválido.`
    })
    setErrores(nuevos)
    return Object.values(nuevos)[0] || ''
  }

  // El servidor guarda también el título, el subtítulo y el botón de la portada en "estilo".
  function estiloParaGuardar() {
    const valor = campo => {
      const guardado = valorEn(contenido, 'inicio', 'portada', campo)
      const original = (originales.inicio || {})[claveCampo('inicio', 'portada', campo)]
      return limpiarValor(typeof guardado === 'string' ? guardado : original || '').slice(0, 300)
    }
    return {
      titulo: valor('titulo') || 'ZAPI',
      subtitulo: valor('texto') || 'Vivero agroecológico',
      boton: valor('boton') || 'Explorar catálogo',
      colores: Object.assign({}, marca.colores),
      tipografia: marca.tipografia,
      botones: marca.botones
    }
  }

  async function enviarBorrador() {
    const datos = await obtenerProductosAdmin()
    const catalogo = Array.isArray(datos.products) ? datos.products : []
    if (catalogo.length === 0) throw new Error('No hay productos en el catálogo para guardar el borrador.')
    await guardarBorradorApi({ estilo: estiloParaGuardar(), catalogo, contenido })
  }

  async function guardarBorrador() {
    const error = colorInvalido()
    if (error) { setEstado({ texto: error, tipo: 'error' }); return }
    setOcupado('guardar')
    try {
      await enviarBorrador()
      setEstado({ texto: 'Borrador guardado. Todavía no se ve en el sitio.', tipo: 'ok' })
    } catch (e) {
      avisar('No se pudo guardar el borrador', e.message)
    } finally {
      setOcupado('')
    }
  }

  async function publicar() {
    const error = colorInvalido()
    if (error) { setEstado({ texto: error, tipo: 'error' }); return }
    const n = cambios
    if (!window.confirm(n ? `¿Publicar ${n} ${n === 1 ? 'cambio' : 'cambios'}? Se van a ver enseguida en el sitio.` : '¿Publicar esta versión del sitio?')) return
    setOcupado('publicar')
    try {
      await enviarBorrador()
      const datos = await publicarBorrador()
      setPublicado({ contenido: copiar(contenido), estilo: { colores: copiar(marca.colores), tipografia: marca.tipografia, botones: marca.botones } })
      setEstado({ texto: `Publicado: versión ${datos.version}. Ya se ve en el sitio.`, tipo: 'ok' })
    } catch (e) {
      avisar('No se pudo publicar', e.message)
    } finally {
      setOcupado('')
    }
  }

  function descartar() {
    if (window.confirm('¿Descartar los cambios sin guardar y volver al último borrador?')) alRecargar()
  }

  function usarImagen(id, alt) {
    const d = dialogo.destino
    cambiarCampo(d.pagina, d.seccion, d.campo, { id, alt })
    setDialogo(null)
  }

  const visibles = pestana === 'diseno' ? [] : seccion.campos.filter(c => (pestana === 'imagenes') === (c.tipo === 'imagen'))
  const enMarca = vista === 'marca'

  return (
    <form className="ed-raiz" id="formEstilo" noValidate onSubmit={e => e.preventDefault()}>
      <header className="ed-barra">
        <button className="ed-boton-barra ed-volver" id="edVolver" type="button" onClick={() => (enMarca ? setVista('editor') : alSalir())}>
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          <span className="ed-oculto-movil">Panel</span>
        </button>
        <div className="ed-marca">
          <img src="/img/logo.svg" alt="" width="30" height="30" />
          <span className="ed-marca-nombre">ZAPI</span>
          <span className="ed-marca-seccion" id="edTituloBarra">{enMarca ? 'Marca y colores' : 'Estilo del sitio'}</span>
        </div>
        <div className="ed-dispositivos" id="edDispositivos" role="group" aria-label="Tamaño de la vista previa" hidden={enMarca}>
          {[['escritorio', 'desktop_windows', 'Escritorio'], ['tablet', 'tablet_mac', 'Tablet'], ['celular', 'smartphone', 'Celular']].map(([id, icono, nombre]) => (
            <button key={id} className={'ed-dispositivo' + (dispositivo === id ? ' activo activa' : '')} type="button" aria-pressed={dispositivo === id} onClick={() => setDispositivo(id)}>
              <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
              <span className="ed-oculto-movil">{nombre}</span>
            </button>
          ))}
        </div>
        <div className="ed-barra-acciones">
          <span className={'ed-estado' + (cambios > 0 ? ' con-cambios' : '')} id="edEstado" role="status" aria-live="polite">
            <i className="ed-estado-punto" aria-hidden="true"></i>
            <span id="edEstadoTexto">{cambios === 0 ? 'Todo publicado' : `${cambios} ${cambios === 1 ? 'cambio sin publicar' : 'cambios sin publicar'}`}</span>
          </span>
          <button className="ed-boton-barra" id="btnRestablecerMarca" type="button" hidden={!enMarca} onClick={() => setMarca(copiar(ESTILO_BASE))}>Restablecer</button>
          <button className="ed-boton-barra" id="btnGuardarMarca" type="button" hidden={!enMarca} disabled={ocupado === 'guardar'} onClick={guardarBorrador}>Guardar borrador</button>
          <Link className="ed-boton-barra" id="edVerSitio" to="/" target="_blank" rel="noopener">Ver sitio</Link>
          <button className="ed-boton-primario" id="btnPublicar" type="button" disabled={ocupado === 'publicar'} onClick={publicar}>{ocupado === 'publicar' ? 'Publicando…' : 'Publicar cambios'}</button>
        </div>
      </header>

      <div className="ed-cuerpo" id="edEditor" hidden={enMarca}>
        <nav className="ed-paginas" id="edPaginas" aria-label="Páginas y secciones">
          <div className="ed-etiqueta ed-nav-titulo">PÁGINAS</div>
          <div className="ed-nav-lista">
            {paginas.map(p => {
              const activa = p.id === seleccion.pagina && !enMarca
              const n = camposModificados(contenido, p.id)
              return (
                <div key={p.id} className={'ed-pagina' + (activa ? ' activa' : '')}>
                  <button className="ed-pagina-boton" type="button" aria-expanded={activa} onClick={() => seleccionar(p.id, null)}>
                    <span className="material-symbols-outlined" aria-hidden="true">{p.icono}</span>
                    <span className="ed-pagina-nombre">{p.titulo}</span>
                    {n > 0 && <i className="ed-pagina-cambios" aria-label={`${n} cambios`}>{n}</i>}
                    <span className="ed-pagina-n">{textoSecciones(p)}</span>
                  </button>
                  {activa && (
                    <ul className="ed-secciones">
                      {p.secciones.map(s => (
                        <li key={s.id}>
                          <button className={'ed-seccion' + (s.id === seleccion.seccion ? ' activa' : '')} type="button" onClick={() => seleccionar(p.id, s.id)}>
                            <span className="material-symbols-outlined ed-seccion-asa" aria-hidden="true">drag_indicator</span>
                            <span className="ed-seccion-texto"><strong>{s.titulo}</strong><small>{textoSeccion(s)}</small></span>
                            {camposModificados(contenido, p.id, s.id) > 0 && <i className="ed-seccion-punto" title="Con cambios"></i>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          <div className="ed-nav-pie">
            <button className="ed-nav-atajo" type="button" onClick={() => accionAtajo('biblioteca')}><span className="material-symbols-outlined" aria-hidden="true">photo_library</span><span>Biblioteca de imágenes</span><em>{imagenes.length || ''}</em></button>
            <button className={'ed-nav-atajo' + (enMarca ? ' activa' : '')} type="button" onClick={() => accionAtajo('marca')}><span className="material-symbols-outlined" aria-hidden="true">palette</span><span>Marca y colores</span></button>
            <button className="ed-nav-atajo" type="button" onClick={() => accionAtajo('historial')}><span className="material-symbols-outlined" aria-hidden="true">history</span><span>Historial de versiones</span></button>
          </div>
        </nav>
        <div className="ed-centro">
          <div className="ed-navegador">
            <div className="ed-navegador-barra">
              <span className="ed-punto"></span>
              <span className="ed-punto"></span>
              <span className="ed-punto"></span>
              <span className="ed-direccion" id="edDireccion">zapivivero.vercel.app / {pagina.id}</span>
            </div>
            <div className="ed-lienzo" id="edLienzo" ref={lienzo}>
              <iframe className="ed-marco" id="edMarco" ref={marco} name={NOMBRE_VISTA_PREVIA} title="Vista previa de la página" src={rutaMarco}></iframe>
            </div>
          </div>
        </div>
        <aside className="ed-inspector" aria-label="Propiedades de la sección">
          <div className="ed-insp-cabecera">
            <div className="ed-etiqueta" id="edEtiqueta">{pagina.titulo.toUpperCase()} · SECCIÓN</div>
            <h2 id="edTituloSeccion">{seccion.titulo}</h2>
          </div>
          <div className="ed-tabs" id="edTabs" role="tablist" aria-label="Qué editar">
            {[['contenido', 'Contenido'], ['imagenes', 'Imágenes'], ['diseno', 'Diseño']].map(([id, nombre]) => (
              <button key={id} className={'ed-tab' + (pestana === id ? ' activa' : '')} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}>{nombre}</button>
            ))}
          </div>
          <div className="ed-insp-cuerpo" id="edInspector">
            {pestana === 'diseno' && (
              <>
                <p className="ed-ayuda">Los colores, la tipografía y la forma de los botones se definen una sola vez para todo el sitio, así las páginas no se ven distintas entre sí.</p>
                <button className="ed-boton-sec ed-ir-marca" type="button" onClick={mostrarMarca}><span className="material-symbols-outlined" aria-hidden="true">palette</span>Abrir Marca y colores</button>
              </>
            )}
            {pestana !== 'diseno' && !visibles.length && (
              <p className="ed-vacio">{pestana === 'imagenes' ? 'Esta sección no tiene imágenes editables.' : 'Esta sección solo tiene imágenes. Mirá la pestaña Imágenes.'}</p>
            )}
            {visibles.map(campo => {
              const guardado = valorEn(contenido, pagina.id, seccion.id, campo.id)
              const clave = claveCampo(pagina.id, seccion.id, campo.id)
              const cambiar = valor => cambiarCampo(pagina.id, seccion.id, campo.id, valor)
              return campo.tipo === 'imagen'
                ? <CampoImagen key={clave} pagina={pagina} seccion={seccion} campo={campo} original={originalesDe[clave] || { src: '', alt: '' }} guardado={guardado} cambiar={cambiar}
                    elegir={() => setDialogo({ tipo: 'biblioteca', destino: { pagina: pagina.id, seccion: seccion.id, campo: campo.id } })} />
                : <CampoTexto key={clave} pagina={pagina} seccion={seccion} campo={campo} original={originalesDe[clave] || ''} guardado={guardado} cambiar={cambiar} />
            })}
          </div>
          <p className={'formulario-estado ed-insp-estado' + (estado.tipo === 'error' ? ' estado-error' : estado.tipo === 'ok' ? ' estado-ok' : '')} id="estadoEstilo" role="status" aria-live="polite" hidden={!estado.texto}>{estado.texto}</p>
          <div className="ed-insp-pie">
            <button className="ed-boton-sec" id="btnDescartar" type="button" onClick={descartar}>Descartar</button>
            <button className="ed-boton-verde" id="btnGuardarBorrador" type="button" disabled={ocupado === 'guardar'} onClick={guardarBorrador}>Guardar borrador</button>
          </div>
        </aside>
      </div>

      <div className="ed-cuerpo ed-marca-vista" id="edMarcaVista" hidden={!enMarca}>
        <div className="ed-marca-controles">
          <section className="ed-tarjeta">
            <h2>Colores de la marca</h2>
            <p className="ed-ayuda">Cada color muestra si el texto blanco se lee bien encima. Si no alcanza, te avisamos antes de publicar.</p>
            <div className="ed-colores">
              {Object.keys(NOMBRES_COLOR).map(clave => {
                const sufijo = NOMBRES_COLOR[clave]
                const hex = marca.colores[clave]
                const valido = COLOR_HEX.test(hex)
                const hex6 = valido && hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex
                const razon = valido ? contrasteConBlanco(hex6) : 0
                return (
                  <div className="ed-color" data-color={clave} key={clave}>
                    <label className="ed-color-muestra" htmlFor={`estiloColor${sufijo}`} style={{ background: hex }}>
                      <span className="ed-color-contraste" id={`contraste${sufijo}`}>{valido ? `${razon.toFixed(1)}:1` : ''}</span>
                    </label>
                    <input className="ed-color-input" id={`estiloColor${sufijo}`} name={clave} type="color" value={hex6}
                      onChange={e => setMarca(m => ({ ...m, colores: { ...m.colores, [clave]: e.target.value } }))} />
                    <div className="ed-color-datos">
                      <strong>{sufijo}</strong>
                      <span id={`hex${sufijo}`}>{hex.toUpperCase()} · {USOS_COLOR[clave]}</span>
                      <em id={`juicio${sufijo}`} className={razon < 4.5 ? 'ed-aviso' : ''}>{razon >= 7 ? 'Excelente (AAA)' : razon >= 4.5 ? 'Bueno (AA)' : 'Poco contraste con texto blanco'}</em>
                    </div>
                    <span className="campo-error" id={`errorEstiloColor${sufijo}`}>{errores[clave] || ''}</span>
                  </div>
                )
              })}
            </div>
            <div className="ed-paletas" id="edPaletas">
              <span className="ed-paletas-titulo">Paletas listas</span>
              {[['bosque', 'Bosque · actual'], ['tierra', 'Tierra'], ['rocio', 'Rocío']].map(([id, nombre]) => {
                const p = PALETAS[id]
                const activa = Object.keys(NOMBRES_COLOR).every(c => p[c] === marca.colores[c])
                return (
                  <button key={id} className={'ed-paleta' + (activa ? ' activa' : '')} type="button" onClick={() => setMarca(m => ({ ...m, colores: { ...p } }))}>
                    <span className="ed-paleta-puntos"><i style={{ background: p.primario }}></i><i style={{ background: p.secundario }}></i><i style={{ background: p.acento }}></i></span>{nombre}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="ed-tarjeta">
            <h2>Tipografía</h2>
            <p className="ed-ayuda">Dos fuentes bien combinadas alcanzan: una para títulos y otra para lectura.</p>
            <div className="ed-tipografias" id="edTipografias">
              {[['bebas-inter', 'ed-tipo-bebas', 'Bebas Neue + Inter · actual'], ['serif-inter', 'ed-tipo-serif', 'Serif clásica + Inter']].map(([id, clase, nombre]) => (
                <button key={id} className={'ed-tipografia' + (marca.tipografia === id ? ' activa' : '')} type="button" aria-pressed={marca.tipografia === id} onClick={() => setMarca(m => ({ ...m, tipografia: id }))}>
                  <span className={'ed-tipografia-titulo ' + clase}>Plantas con raíz</span>
                  <span className="ed-tipografia-texto">Cuidamos cada planta como si fuera propia, de la semilla a tu casa.</span>
                  <strong>{nombre}</strong>
                </button>
              ))}
            </div>
          </section>
          <section className="ed-tarjeta ed-tarjeta-fila">
            <div>
              <h2>Botones y esquinas</h2>
              <p className="ed-ayuda">Un solo estilo en todo el sitio.</p>
            </div>
            <div className="ed-botones-estilo" id="edBotonesEstilo">
              {[['redondeado', '', 'Redondeado'], ['suave', ' ed-forma-suave', 'Suave'], ['recto', ' ed-forma-recto', 'Recto']].map(([id, clase, nombre]) => (
                <button key={id} className={'ed-forma' + clase + (marca.botones === id ? ' activa' : '')} type="button" aria-pressed={marca.botones === id} onClick={() => setMarca(m => ({ ...m, botones: id }))}>{nombre}</button>
              ))}
            </div>
          </section>
        </div>
        <div className="ed-marca-previa">
          <div className="ed-etiqueta">VISTA PREVIA EN VIVO</div>
          <div className="ed-lienzo ed-lienzo-marca" id="edLienzoMarca" ref={lienzoMarca}>
            <iframe className="ed-marco" id="edMarcoMarca" ref={marcoMarca} name={NOMBRE_VISTA_PREVIA} title="Vista previa con la marca" src={marcaAbierta ? '/' : 'about:blank'}></iframe>
          </div>
        </div>
      </div>

      {dialogo && dialogo.tipo === 'biblioteca' && (
        <DialogoBiblioteca destino={dialogo.destino} contenido={contenido} imagenes={imagenes} setImagenes={setImagenes} alCerrar={() => setDialogo(null)} alUsar={usarImagen} />
      )}
      {dialogo && dialogo.tipo === 'historial' && (
        <DialogoHistorial alCerrar={() => setDialogo(null)} alRestaurar={alRecargar} />
      )}
    </form>
  )
}

/* "Estilo del sitio": al abrir el panel se piden el borrador y lo publicado. Cada vez que se
   entra se empieza de cero (lo que no se guardó se pierde, como antes). */
function PanelEstilo({ activo, irAPanel }) {
  const cargar = useCallback(async () => {
    const [borrador, publicado] = await Promise.all([
      obtenerBorrador(),
      obtenerPublicado().catch(() => null)
    ])
    return {
      borrador: borrador && borrador.borrador ? borrador.borrador : null,
      publicado: publicado ? { contenido: publicado.contenido || {}, estilo: publicado.estilo || {} } : { contenido: {}, estilo: {} },
      clave: Date.now()
    }
  }, [])
  const { datos, cargando, recargar } = useCarga(cargar, 'No se pudo cargar el estilo', activo)
  const [vez, setVez] = useState(0)
  const alRecargar = useCallback(() => { setVez(v => v + 1); recargar() }, [recargar])
  const inicial = datos

  return (
    <section className="admin-panel editor-estilo" id="panelEstilo" hidden={!activo} aria-label="Estilo del sitio">
      {activo && inicial && <Editor key={`${inicial.clave}-${vez}`} inicial={inicial} alSalir={() => irAPanel('resumen')} alRecargar={alRecargar} />}
      {activo && !inicial && cargando && <p className="estado-vacio">Cargando…</p>}
    </section>
  )
}

export default PanelEstilo
