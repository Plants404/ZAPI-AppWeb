import { useCarrito } from '../estado/carrito.jsx'

// Numerito del carrito. Cuando se agrega algo cambia la "key" y se repite la animación.
function ContadorCarrito({ clase = '', id }) {
  const { cantidadTotal, pulso } = useCarrito()
  return (
    <span
      key={pulso}
      id={id}
      className={'cart-count' + (clase ? ' ' + clase : '') + (cantidadTotal > 0 ? ' con-productos' : '') + (pulso > 0 ? ' pop' : '')}
      data-cart-count
      aria-hidden="true"
    >{cantidadTotal}</span>
  )
}

export default ContadorCarrito
