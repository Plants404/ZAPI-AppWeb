// Menú desplegable para celular (hoja inferior con los enlaces del sitio).
import { Link } from 'react-router-dom'
import Icono from './Icono.jsx'
import ContadorCarrito from './ContadorCarrito.jsx'
import { datosDeCuenta, useSesion } from '../estado/sesion.jsx'

const ITEMS = [
  ['/', 'home', 'Inicio', 'inicio'],
  ['/catalogo', 'eco', 'Catálogo', 'catalogo'],
  ['/servicios', 'auto_awesome', 'Servicios', 'servicios'],
  ['/nosotros', 'group', 'Nosotros', 'nosotros'],
  ['/contacto', 'mail', 'Contacto', 'contacto'],
  ['/carrito', 'shopping_bag', 'Carrito', 'carrito']
]

// Menú que sube desde abajo en el celular.
function HojaMenu({ seccion, menu }) {
  const { sesion, salir } = useSesion()
  const cuenta = datosDeCuenta(sesion)
  return (
    <div className={'bottom-sheet' + (menu.hojaClase ? ' esta-abierto' : '')} id="hojaMenu" role="dialog" aria-modal="true" aria-label="Menú principal" hidden={!menu.hojaVisible} inert={!menu.hojaActiva} onClick={e => { if (e.target === e.currentTarget) menu.cerrar() }}>
      <div className="bottom-sheet-manija" aria-hidden="true"></div>
      <header className="bottom-sheet-cabecera">
        <h2 className="bottom-sheet-titulo">Menú</h2>
        <button className="bottom-sheet-cerrar" type="button" aria-label="Cerrar menú" onClick={menu.cerrar}><Icono nombre="close" /></button>
      </header>
      <nav className="bottom-sheet-nav" aria-label="Opciones del menú">
        <ul className="bottom-sheet-grilla">
          {ITEMS.map(([ruta, simbolo, texto, clave]) => (
            <li key={clave}>
              <Link className="bottom-sheet-tarjeta" to={ruta} aria-current={clave === seccion ? 'page' : undefined}>
                <span className="bottom-sheet-icono"><Icono nombre={simbolo} /></span>
                <span className="bottom-sheet-etiq">{texto}</span>
                {clave === 'carrito' && <ContadorCarrito />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="bottom-sheet-cuenta">
        <div className="bottom-sheet-fila-pedidos" data-cuentas-off>
          <Link to="/pedidos" className="bottom-sheet-pedidos">Mis pedidos ›</Link>
        </div>
        {cuenta
          ? <Link to={cuenta.destino} className="bottom-sheet-ingresar con-sesion">{cuenta.esAdmin ? 'Ir al panel' : 'Mi cuenta · ' + cuenta.nombre}</Link>
          : <Link to="/login" className="bottom-sheet-ingresar" data-auth-no-sesion>Ingresar</Link>}
        {cuenta && <button type="button" className="bottom-sheet-salir" onClick={salir}><Icono nombre="logout" /> Cerrar sesión</button>}
      </div>
    </div>
  )
}

export default HojaMenu
