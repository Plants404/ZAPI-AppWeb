import { useCallback, useEffect, useRef, useState } from 'react'
import { useCarrito } from './carrito.jsx'
import { useCatalogo } from './catalogo.jsx'
import { useAviso } from './aviso.jsx'

/* Agrega un producto al carrito y avisa. Devuelve [agregar, agregado]:
   "agregado" es true 1,4 s después de agregar (para mostrar el tilde en el botón). */
export function useAgregarAlCarrito() {
  const { agregar } = useCarrito()
  const { obtenerProducto } = useCatalogo()
  const { mostrarAviso } = useAviso()
  const [agregado, setAgregado] = useState(false)
  const reloj = useRef(null)

  useEffect(() => () => window.clearTimeout(reloj.current), [])

  const agregarYAvisar = useCallback(id => {
    const producto = obtenerProducto(id)
    if (!producto) return false
    if (!agregar(id)) {
      mostrarAviso('Sin stock', 'No quedan más unidades de ' + producto.nombre + '.')
      return false
    }
    setAgregado(true)
    window.clearTimeout(reloj.current)
    reloj.current = window.setTimeout(() => setAgregado(false), 1400)
    mostrarAviso('Agregado al carrito', producto.nombre + ' ya está en tu pedido.')
    return true
  }, [agregar, mostrarAviso, obtenerProducto])

  return [agregarYAvisar, agregado]
}
