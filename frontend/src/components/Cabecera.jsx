import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useRef, useState } from 'react'
import Icono from './Icono.jsx'
import ContadorCarrito from './ContadorCarrito.jsx'
import { useCarrito } from '../estado/carrito.jsx'
import { filtrarProductos } from '../data/buscar.js'

const ENLACES = [
  { seccion: 'inicio', texto: 'Inicio', ruta: '/' },
  { seccion: 'catalogo', texto: 'Catálogo', ruta: '/catalogo' },
  { seccion: 'servicios', texto: 'Servicios', ruta: '/servicios' },
  { seccion: 'nosotros', texto: 'Nosotros', ruta: '/nosotros' },
  { seccion: 'contacto', texto: 'Contacto', ruta: '/contacto' }
]

/* Cabecera del sitio. "menu" trae el estado del menú móvil (lo maneja el Layout).
   La búsqueda vive en la dirección (?q=...) cuando se está en el catálogo, así el
   buscador y la página del catálogo ven siempre el mismo texto. */
function Cabecera({ seccion, fichaProducto = false, menu }) {
  const { cantidadTotal } = useCarrito()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const enCatalogo = pathname === '/catalogo'
  const [textoLocal, setTextoLocal] = useState('')
  const texto = enCatalogo ? params.get('q') || '' : textoLocal
  const entrada = useRef(null)

  function cambiarTexto(nuevo) {
    if (enCatalogo) setParams(nuevo ? { q: nuevo } : {}, { replace: true })
    else setTextoLocal(nuevo)
  }

  function enviar(evento) {
    evento.preventDefault()
    if (!enCatalogo) {
      navegar(texto.trim() ? '/catalogo?q=' + encodeURIComponent(texto.trim()) : '/catalogo')
      setTextoLocal('')
    }
  }

  function alPresionar(evento) {
    if (evento.key === 'Escape' && texto) {
      evento.preventDefault()
      cambiarTexto('')
    }
  }

  const termino = texto.trim()
  const encontrados = enCatalogo && termino ? filtrarProductos({ busqueda: termino }).length : 0
  const anuncio = termino && encontrados > 0 ? `${encontrados} ${encontrados === 1 ? 'producto' : 'productos'} para "${termino}".` : ''
  const etiquetaCarrito = cantidadTotal === 1 ? 'Ver carrito, 1 producto' : `Ver carrito, ${cantidadTotal} productos`

  return (
    <>
      <header className={'site-header' + (fichaProducto ? ' header-producto' : '')} data-header>
        <button className="nav-toggle menu-boton" id="navToggle" type="button" aria-expanded={menu.abierto} aria-controls="navPrincipal" aria-label={menu.abierto ? 'Cerrar menú de navegación' : 'Abrir menu de navegacion'} onClick={menu.alternar}>
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <ContadorCarrito clase="cart-count-toggle" />
        </button>

        <Link className={'logo' + (fichaProducto ? '' : ' marca')} to="/" aria-label="ZAPI, ir al inicio">
          <div className="logo-items-text"><span className="logo-nombre">ZAPI</span></div>
          <div className="logo-items-img"><img src="/img/logo.svg" alt="" width="42" height="42" /></div>
        </Link>

        <form className={'header-search' + (fichaProducto ? ' buscador-producto' : '')} id="headerSearch" role="search" action="/catalogo" autoComplete="off" onSubmit={enviar}>
          <label className="visually-hidden" htmlFor="searchInput">Buscar productos</label>
          {!fichaProducto && <Icono nombre="search" clase="header-search-icono" />}
          <input ref={entrada} className="header-search-input" id="searchInput" name="q" type="search" placeholder="Buscar productos..." aria-describedby="searchStatus" spellCheck="false" value={texto} onChange={e => cambiarTexto(e.target.value)} onKeyDown={alPresionar} />
          {fichaProducto && <button className="buscador-submit" type="submit" aria-label="Buscar"><Icono nombre="search" /></button>}
          <button className="header-search-limpiar search-limpiar" id="searchClear" type="button" aria-label="Limpiar busqueda" hidden={!texto} onClick={() => { cambiarTexto(''); entrada.current?.focus() }}><Icono nombre="close" /></button>
        </form>

        <Link className={'header-cart header-carrito' + (fichaProducto ? ' carrito-enlace' : '')} to="/carrito" aria-label={etiquetaCarrito}>
          <Icono nombre="shopping_bag" />
          <ContadorCarrito />
        </Link>

        <nav className={'nav-bar site-nav' + (menu.navAbierta ? ' esta-abierto' : '')} id="navPrincipal" aria-label="Navegacion principal" inert={menu.navOculta} aria-hidden={menu.navOculta ? 'true' : undefined}>
          <ul>
            {ENLACES.map(enlace => {
              const activo = enlace.seccion === seccion
              return (
                <li key={enlace.seccion}>
                  <Link className={'nav-link nav-enlace' + (activo ? ' active activo' : '')} to={enlace.ruta} aria-current={activo ? 'page' : undefined}>{enlace.texto}</Link>
                </li>
              )
            })}
            <li><Link className="nav-link nav-enlace" to="/login">Ingresar</Link></li>
          </ul>
        </nav>
      </header>
      <div className={'nav-backdrop' + (menu.abierto ? ' visible esta-activo' : '')} id="navBackdrop" hidden={!menu.abierto} onClick={menu.cerrar}></div>
      <p className="visually-hidden" id="searchStatus" role="status" aria-live="polite">{anuncio}</p>
    </>
  )
}

export default Cabecera
