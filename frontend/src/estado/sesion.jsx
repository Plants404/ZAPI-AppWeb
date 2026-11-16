/* Quién tiene la sesión iniciada (GET /api/auth/yo). Lo usa la cabecera para
   mostrar el nombre / "Panel" y el botón "Salir". */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cerrarSesion, obtenerSesion } from '../api.js'

const SesionContext = createContext(null)

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerSesion().then(datos => { if (vigente) setSesion(datos) })
    return () => { vigente = false }
  }, [])

  // Cierra la sesión en el servidor y vuelve al inicio.
  const salir = useCallback(async () => {
    await cerrarSesion()
    window.location.href = '/'
  }, [])

  const valor = useMemo(() => ({ sesion, salir }), [sesion, salir])
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return contexto
}

// Datos listos para mostrar en la cabecera (o null si no hay sesión).
export function datosDeCuenta(sesion) {
  if (!sesion) return null
  const esAdmin = sesion.rol === 'admin'
  const nombre = String(sesion.nombre || sesion.email || 'Mi cuenta').trim().split(/\s+/)[0]
  return { esAdmin, nombre, destino: esAdmin ? '/admin' : '/pedidos', correo: sesion.email || '' }
}
