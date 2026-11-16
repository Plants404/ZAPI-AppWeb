/* Aviso flotante ("Agregado al carrito", "Sin stock"...): desaparece solo a los 5 s. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AvisoContext = createContext(null)

export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState(null)
  const reloj = useRef(null)

  const cerrarAviso = useCallback(() => {
    window.clearTimeout(reloj.current)
    setAviso(null)
  }, [])

  const mostrarAviso = useCallback((titulo, mensaje) => {
    window.clearTimeout(reloj.current)
    setAviso({ titulo, mensaje })
    reloj.current = window.setTimeout(() => setAviso(null), 5000)
  }, [])

  useEffect(() => () => window.clearTimeout(reloj.current), [])

  const valor = useMemo(() => ({ aviso, mostrarAviso, cerrarAviso }), [aviso, mostrarAviso, cerrarAviso])
  return <AvisoContext.Provider value={valor}>{children}</AvisoContext.Provider>
}

export function useAviso() {
  const contexto = useContext(AvisoContext)
  if (!contexto) throw new Error('useAviso debe usarse dentro de <AvisoProvider>')
  return contexto
}
