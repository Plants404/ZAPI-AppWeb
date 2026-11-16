import { Link } from 'react-router-dom'
import Icono from './Icono.jsx'

const ENLACES = [
  { seccion: 'inicio', texto: 'Inicio', ruta: '/' },
  { seccion: 'catalogo', texto: 'Catálogo', ruta: '/catalogo' },
  { seccion: 'servicios', texto: 'Servicios', ruta: '/servicios' },
  { seccion: 'nosotros', texto: 'Nosotros', ruta: '/nosotros' },
  { seccion: 'contacto', texto: 'Contacto', ruta: '/contacto' }
]

// Cabecera del sitio. "fichaProducto" cambia algunas clases en la página de un producto.
function Cabecera({ seccion, fichaProducto = false }) {
  return (
    <>
      <header className={'site-header' + (fichaProducto ? ' header-producto' : '')} data-header>
        <button className="nav-toggle menu-boton" id="navToggle" type="button" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menu de navegacion">
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <span className="nav-toggle-barra menu-linea" aria-hidden="true"></span>
          <span className="cart-count cart-count-toggle" data-cart-count aria-hidden="true">0</span>
        </button>

        <Link className={'logo' + (fichaProducto ? '' : ' marca')} to="/" aria-label="ZAPI, ir al inicio">
          <div className="logo-items-text"><span className="logo-nombre">ZAPI</span></div>
          <div className="logo-items-img"><img src="/img/logo.svg" alt="" width="42" height="42" /></div>
        </Link>

        <form className={'header-search' + (fichaProducto ? ' buscador-producto' : '')} id="headerSearch" role="search" action="/catalogo" autoComplete="off">
          <label className="visually-hidden" htmlFor="searchInput">Buscar productos</label>
          {!fichaProducto && <Icono nombre="search" clase="header-search-icono" />}
          <input className="header-search-input" id="searchInput" name="q" type="search" placeholder="Buscar productos..." aria-describedby="searchStatus" spellCheck="false" />
          {fichaProducto && <button className="buscador-submit" type="submit" aria-label="Buscar"><Icono nombre="search" /></button>}
          <button className="header-search-limpiar search-limpiar" id="searchClear" type="button" aria-label="Limpiar busqueda" hidden><Icono nombre="close" /></button>
        </form>

        <Link className={'header-cart header-carrito' + (fichaProducto ? ' carrito-enlace' : '')} to="/carrito" aria-label="Ver carrito">
          <Icono nombre="shopping_bag" />
          <span className="cart-count" data-cart-count aria-hidden="true">0</span>
        </Link>

        <nav className="nav-bar site-nav" id="navPrincipal" aria-label="Navegacion principal">
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
      <div className="nav-backdrop" id="navBackdrop" hidden></div>
      <p className="visually-hidden" id="searchStatus" role="status" aria-live="polite"></p>
    </>
  )
}

export default Cabecera
