import { useEffect, useRef, useState } from 'react'
import { obtenerImagenes, resolverImagen, subirImagenBiblioteca } from '../api.js'
import { buscarCampo, buscarPagina } from '../esquema-editable.js'
import { formatearFecha, limpiarValor } from '../utilidades.js'
import { useAdmin } from './contexto.jsx'
import { useModal } from './AdminDialogo.jsx'
import { reducirImagen } from './imagenes.js'
import { usosDeImagen, valorEn } from './estiloContenido.js'

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'portadas', nombre: 'Portadas' },
  { id: 'productos', nombre: 'Productos' },
  { id: 'servicios', nombre: 'Servicios' },
  { id: 'equipo', nombre: 'Equipo' }
]
const TEXTO_SUBIDA = 'JPG, PNG o WebP · las reducimos solas para que el sitio cargue rápido'

const nombreImagen = imagen => imagen.nombre || `imagen-${imagen.id.slice(-6)}`

// Detalle de la imagen elegida (con "Usar" y "Recortar" cuando se abrió para llenar un campo).
function Detalle({ imagen, campo, contenido, destino, usar, recortar, recortando }) {
  const actual = campo ? valorEn(contenido, destino.pagina, destino.seccion, destino.campo) : null
  const [alt, setAlt] = useState(actual && actual.id === imagen.id ? actual.alt || '' : '')
  const [medidas, setMedidas] = useState(null)
  const usos = usosDeImagen(contenido, imagen.id)
  const liviana = imagen.bytes < 500 * 1024
  let proporcion = null
  if (campo && medidas) {
    const [a, b] = campo.proporcion
    const buena = Math.abs(medidas.ancho / medidas.alto / (a / b) - 1) <= 0.08
    proporcion = { buena, a, b }
  }

  return (
    <>
      <div className="ed-detalle-foto"><img id="bibliotecaVista" src={resolverImagen(imagen.url)} alt="" onLoad={e => setMedidas({ ancho: e.target.naturalWidth, alto: e.target.naturalHeight })} /></div>
      <h3>{nombreImagen(imagen)}</h3>
      <p className="ed-detalle-datos" id="bibliotecaDatos">
        {medidas ? `${medidas.ancho} × ${medidas.alto} px · ${Math.round(imagen.bytes / 1024)} KB` : `${Math.round(imagen.bytes / 1024)} KB · ${imagen.creada ? formatearFecha(imagen.creada) : ''}`}
      </p>
      <ul className="ed-chequeos" id="bibliotecaChequeos">
        <li className={liviana ? 'ok' : 'aviso'}><span className="material-symbols-outlined" aria-hidden="true">{liviana ? 'check_circle' : 'warning'}</span>{liviana ? 'Liviana, carga rápido' : 'Pesada: puede tardar en cargar'}</li>
        {proporcion && (
          <li className={proporcion.buena ? 'ok' : 'aviso'} id="chequeoProporcion">
            <span className="material-symbols-outlined" aria-hidden="true">{proporcion.buena ? 'check_circle' : 'crop'}</span>
            {proporcion.buena ? `Proporción ${proporcion.a}:${proporcion.b}, ideal para este lugar` : `Proporción distinta de ${proporcion.a}:${proporcion.b}, se puede recortar`}
          </li>
        )}
        <li className="ok"><span className="material-symbols-outlined" aria-hidden="true">link</span>{usos ? `Se usa en ${usos} ${usos === 1 ? 'lugar' : 'lugares'}` : 'Todavía no se usa'}</li>
      </ul>
      {campo && (
        <>
          <label className="ed-campo-etiqueta" htmlFor="bibliotecaAlt">Descripción (alt)</label>
          <input id="bibliotecaAlt" type="text" maxLength="160" value={alt} placeholder="Qué se ve en la foto" onChange={e => setAlt(e.target.value)} />
          <button className="ed-boton-verde ed-ancho" id="bibliotecaUsar" type="button" onClick={() => usar(imagen.id, limpiarValor(alt).slice(0, 160))}>Usar esta imagen</button>
          <button className="ed-boton-sec ed-ancho" id="bibliotecaRecortar" type="button" disabled={recortando} onClick={() => recortar(imagen, alt)}>{recortando ? 'Recortando…' : 'Recortar antes de usar'}</button>
        </>
      )}
    </>
  )
}

/* Biblioteca de imágenes. "destino" es { pagina, seccion, campo } cuando se abre para elegir
   la imagen de un lugar, o null cuando solo se mira la biblioteca. */
function DialogoBiblioteca({ destino, contenido, imagenes, setImagenes, alCerrar, alUsar }) {
  const { avisar } = useAdmin()
  const dialogo = useModal(true)
  const archivos = useRef(null)
  const campo = destino ? buscarCampo(destino.pagina, destino.seccion, destino.campo) : null
  const actual = destino ? valorEn(contenido, destino.pagina, destino.seccion, destino.campo) : null
  const [categoria, setCategoria] = useState('todas')
  const [buscar, setBuscar] = useState('')
  const [elegida, setElegida] = useState(actual ? actual.id : null)
  const [estado, setEstado] = useState(TEXTO_SUBIDA)
  const [sobre, setSobre] = useState(false)
  const [recortando, setRecortando] = useState(false)

  useEffect(() => {
    let vigente = true
    obtenerImagenes()
      .then(datos => { if (vigente) setImagenes(Array.isArray(datos.imagenes) ? datos.imagenes : []) })
      .catch(e => { if (vigente) avisar('No se pudo cargar la biblioteca', e.message) })
    return () => { vigente = false }
  }, [avisar, setImagenes])

  const texto = buscar.trim().toLowerCase()
  const lista = imagenes.filter(i => (categoria === 'todas' || i.categoria === categoria) && (!texto || (i.nombre || '').toLowerCase().includes(texto)))
  const imagen = imagenes.find(i => i.id === elegida)
  const categoriaDeSubida = categoria !== 'todas' ? categoria : (campo && campo.categoria ? campo.categoria : 'productos')

  async function subir(archivosElegidos) {
    for (const archivo of archivosElegidos) {
      try {
        setEstado(`Subiendo ${archivo.name}…`)
        const blob = await reducirImagen(archivo, 1600)
        const datos = await subirImagenBiblioteca(blob, archivo.name.replace(/\.[^.]+$/, ''), categoriaDeSubida)
        setElegida(datos.id)
        const nuevas = await obtenerImagenes()
        setImagenes(Array.isArray(nuevas.imagenes) ? nuevas.imagenes : [])
      } catch (error) {
        setEstado(`No se pudo subir ${archivo.name}: ${error.message}`)
        return
      }
    }
    setEstado(TEXTO_SUBIDA)
  }

  // Recorta al centro con la proporción del lugar y usa la copia recortada.
  async function recortar(img, alt) {
    setRecortando(true)
    try {
      const origen = await (await fetch(resolverImagen(img.url), { credentials: 'include' })).blob()
      const bitmap = await createImageBitmap(origen)
      const [a, b] = campo.proporcion
      const objetivo = a / b
      let ancho = bitmap.width
      let alto = bitmap.height
      if (ancho / alto > objetivo) ancho = Math.round(alto * objetivo)
      else alto = Math.round(ancho / objetivo)
      const lienzo = document.createElement('canvas')
      lienzo.width = ancho
      lienzo.height = alto
      lienzo.getContext('2d').drawImage(bitmap, Math.round((bitmap.width - ancho) / 2), Math.round((bitmap.height - alto) / 2), ancho, alto, 0, 0, ancho, alto)
      bitmap.close()
      const blob = await new Promise((resolver, rechazar) => lienzo.toBlob(r => (r ? resolver(r) : rechazar(new Error('No se pudo recortar.'))), 'image/jpeg', 0.85))
      const datos = await subirImagenBiblioteca(blob, `${nombreImagen(img)}-${a}x${b}`, img.categoria || 'productos')
      const nuevas = await obtenerImagenes()
      setImagenes(Array.isArray(nuevas.imagenes) ? nuevas.imagenes : [])
      alUsar(datos.id, limpiarValor(alt).slice(0, 160))
    } catch (error) {
      setRecortando(false)
      avisar('No se pudo recortar', error.message)
    }
  }

  const pagina = destino ? buscarPagina(destino.pagina) : null
  const seccion = pagina ? pagina.secciones.find(s => s.id === destino.seccion) : null

  return (
    <dialog className="ed-dialogo" id="dialogoBiblioteca" ref={dialogo} aria-labelledby="dialogoBibliotecaTitulo" onCancel={e => { e.preventDefault(); alCerrar() }}>
      <div className="ed-modal" role="document">
        <header className="ed-modal-cabecera">
          <div className="ed-modal-titulo">
            <div className="ed-etiqueta" id="bibliotecaContexto">{campo ? `${pagina.titulo.toUpperCase()} · ${seccion.titulo.toUpperCase()}` : 'BIBLIOTECA'}</div>
            <h2 id="dialogoBibliotecaTitulo">{campo ? 'Elegí una imagen' : 'Biblioteca de imágenes'}</h2>
          </div>
          <label className="ed-buscar">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input id="bibliotecaBuscar" type="search" placeholder="Buscar por nombre" autoComplete="off" aria-label="Buscar imagen por nombre" value={buscar} onChange={e => setBuscar(e.target.value)} />
          </label>
          <button className="ed-cerrar" type="button" aria-label="Cerrar" onClick={alCerrar}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        <div className="ed-modal-cuerpo">
          <div className="ed-modal-principal">
            <div className="ed-filtros" id="bibliotecaFiltros" role="group" aria-label="Filtrar por tipo">
              {CATEGORIAS.map(c => {
                const n = c.id === 'todas' ? imagenes.length : imagenes.filter(i => i.categoria === c.id).length
                return <button key={c.id} className={'ed-filtro' + (categoria === c.id ? ' activa' : '')} type="button" onClick={() => setCategoria(c.id)}>{c.nombre}<em>{n}</em></button>
              })}
            </div>
            <div
              className={'ed-zona-subida' + (sobre ? ' sobre' : '')}
              id="bibliotecaZona"
              tabIndex="0"
              role="button"
              aria-label="Subir imágenes"
              onClick={() => archivos.current.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); archivos.current.click() } }}
              onDragEnter={e => { e.preventDefault(); setSobre(true) }}
              onDragOver={e => { e.preventDefault(); setSobre(true) }}
              onDragLeave={() => setSobre(false)}
              onDrop={e => { e.preventDefault(); setSobre(false); subir([...e.dataTransfer.files].filter(f => /^image\//.test(f.type))) }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">upload</span>
              <div>
                <strong>Arrastrá fotos acá o <u>elegí desde tu equipo</u></strong>
                <span id="bibliotecaEstado" role="status" aria-live="polite">{estado}</span>
              </div>
            </div>
            <input ref={archivos} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { const f = [...e.target.files]; e.target.value = ''; subir(f) }} />
            <div className="ed-grilla" id="bibliotecaGrilla">
              {lista.length
                ? lista.map(i => (
                  <button key={i.id} className={'ed-tarjeta-imagen' + (i.id === elegida ? ' elegida' : '')} type="button" onClick={() => setElegida(i.id)}>
                    <span className="ed-tarjeta-foto"><img src={resolverImagen(i.url)} alt="" loading="lazy" /></span>
                    <span className="ed-tarjeta-nombre">{nombreImagen(i)}</span>
                    {i.id === elegida && <span className="ed-tarjeta-check material-symbols-outlined" aria-hidden="true">check</span>}
                  </button>
                ))
                : <p className="estado-vacio ed-grilla-vacia">No hay imágenes en esta categoría. Subí la primera arriba.</p>}
            </div>
          </div>
          <aside className="ed-modal-detalle" id="bibliotecaDetalle" aria-label="Detalle de la imagen">
            {imagen
              ? <Detalle key={imagen.id} imagen={imagen} campo={campo} contenido={contenido} destino={destino} usar={alUsar} recortar={recortar} recortando={recortando} />
              : <p className="ed-vacio">Elegí una imagen para ver sus datos.</p>}
          </aside>
        </div>
      </div>
    </dialog>
  )
}

export default DialogoBiblioteca
