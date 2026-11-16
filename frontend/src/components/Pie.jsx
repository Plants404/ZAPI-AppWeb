import { Link } from 'react-router-dom'
import Icono from './Icono.jsx'
import { NEGOCIO } from '../data/negocio.js'

// Pie de página. En el carrito se muestra una versión chica.
function Pie({ compacto = false }) {
  if (compacto) {
    return (
      <footer className="cart-footer">
        <p>ZAPI · Vivero Agroecológico · Precios sujetos a disponibilidad</p>
        <nav className="cart-footer-nav" aria-label="Paginas del sitio">
          <Link to="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    )
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-marca">
          <Link to="/" aria-label="ZAPI, ir al inicio">
            <img src="/img/logo.svg" alt="" width="38" height="54" />
            <span>ZAPI</span>
          </Link>
          <p>Plantas, kits y acompañamiento para empezar tu rincón verde.</p>
          <a className="footer-cta" href={`https://wa.me/${NEGOCIO.whatsapp}`} target="_blank" rel="noopener"><Icono nombre="chat" /> Escribinos por WhatsApp</a>
        </div>
        <nav className="footer-nav" aria-label="Paginas del sitio">
          <h2>Navegar</h2>
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/servicios">Servicios</Link>
          <Link to="/nosotros">Nosotros</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/carrito">Carrito</Link>
          <Link to="/pedidos">Mis pedidos</Link>
          <Link to="/privacidad">Privacidad</Link>
        </nav>
        <div className="footer-contacto">
          <h2>Contacto</h2>
          <p><Icono nombre="location_on" /> {NEGOCIO.direccion}</p>
          <a href={`https://wa.me/${NEGOCIO.whatsapp}`} target="_blank" rel="noopener"><Icono nombre="chat" /> {`WhatsApp ${NEGOCIO.whatsappVisible}`}</a>
          <Link to="/contacto"><Icono nombre="mail" /> Escribinos por correo</Link>
        </div>
      </div>
      <p className="footer-legal">ZAPI · Vivero agroecologico · Precios sujetos a disponibilidad.</p>
    </footer>
  )
}

export default Pie
