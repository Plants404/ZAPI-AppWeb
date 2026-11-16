import { Link } from 'react-router-dom'
import Icono from './Icono.jsx'

// Botón flotante del carrito y pie chico de la ficha de producto.
function FooterProducto() {
  return (
    <>
      <Link className="cart-link-float" to="/carrito" id="cartLinkFloat">
        <Icono nombre="shopping_bag" />
        <span className="cart-link-text">Ver carrito</span>
        <span id="cartCountFloat" className="cart-count" data-cart-count>0</span>
      </Link>
      <footer className="footer-producto">
        <p>ZAPI</p>
        <nav aria-label="Enlaces del pie">
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Catalogo</Link>
          <Link to="/carrito">Carrito</Link>
          <Link to="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    </>
  )
}

export default FooterProducto
