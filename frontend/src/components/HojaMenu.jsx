import { Link } from 'react-router-dom'
import Icono from './Icono.jsx'

const ITEMS = [
  ['/', 'home', 'Inicio', 'inicio'],
  ['/catalogo', 'eco', 'Catálogo', 'catalogo'],
  ['/servicios', 'auto_awesome', 'Servicios', 'servicios'],
  ['/nosotros', 'group', 'Nosotros', 'nosotros'],
  ['/contacto', 'mail', 'Contacto', 'contacto'],
  ['/carrito', 'shopping_bag', 'Carrito', 'carrito']
]

// Menú que sube desde abajo en el celular.
function HojaMenu({ seccion }) {
  return (
    <div className="bottom-sheet" id="hojaMenu" role="dialog" aria-modal="true" aria-label="Menú principal" hidden inert>
      <div className="bottom-sheet-manija" aria-hidden="true"></div>
      <header className="bottom-sheet-cabecera">
        <h2 className="bottom-sheet-titulo">Menú</h2>
        <button className="bottom-sheet-cerrar" type="button" aria-label="Cerrar menú"><Icono nombre="close" /></button>
      </header>
      <nav className="bottom-sheet-nav" aria-label="Opciones del menú">
        <ul className="bottom-sheet-grilla">
          {ITEMS.map(([ruta, simbolo, texto, clave]) => (
            <li key={clave}>
              <Link className="bottom-sheet-tarjeta" to={ruta} aria-current={clave === seccion ? 'page' : undefined}>
                <span className="bottom-sheet-icono"><Icono nombre={simbolo} /></span>
                <span className="bottom-sheet-etiq">{texto}</span>
                {clave === 'carrito' && <span className="cart-count" data-cart-count aria-hidden="true">0</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="bottom-sheet-cuenta">
        <div className="bottom-sheet-fila-pedidos" data-cuentas-off>
          <Link to="/pedidos" className="bottom-sheet-pedidos">Mis pedidos ›</Link>
        </div>
        <Link to="/login" className="bottom-sheet-ingresar" data-auth-no-sesion>Ingresar</Link>
      </div>
    </div>
  )
}

export default HojaMenu
