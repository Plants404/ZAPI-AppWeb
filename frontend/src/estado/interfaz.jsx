/* Ventanas que se abren desde varios lugares: el modal de producto y el
   formulario de opiniones. Las tarjetas "piden" abrirlas; el Layout las dibuja. */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const InterfazContext = createContext(null)

export function InterfazProvider({ children }) {
  const [productoAbierto, setProductoAbierto] = useState(null) // id del producto del modal
  const [testimonio, setTestimonio] = useState({ abierto: false, productoId: null })
  const [testimoniosNuevos, setTestimoniosNuevos] = useState([]) // opiniones recién enviadas

  const abrirProducto = useCallback(id => setProductoAbierto(Number(id)), [])
  const cerrarProducto = useCallback(() => setProductoAbierto(null), [])
  const abrirTestimonio = useCallback((productoId = null) => setTestimonio({ abierto: true, productoId }), [])
  const cerrarTestimonio = useCallback(() => setTestimonio(t => ({ ...t, abierto: false })), [])
  const agregarTestimonio = useCallback(t => setTestimoniosNuevos(lista => [t, ...lista]), [])

  const valor = useMemo(() => ({
    productoAbierto, abrirProducto, cerrarProducto,
    testimonio, abrirTestimonio, cerrarTestimonio,
    testimoniosNuevos, agregarTestimonio
  }), [productoAbierto, abrirProducto, cerrarProducto, testimonio, abrirTestimonio, cerrarTestimonio, testimoniosNuevos, agregarTestimonio])

  return <InterfazContext.Provider value={valor}>{children}</InterfazContext.Provider>
}

export function useInterfaz() {
  const contexto = useContext(InterfazContext)
  if (!contexto) throw new Error('useInterfaz debe usarse dentro de <InterfazProvider>')
  return contexto
}
