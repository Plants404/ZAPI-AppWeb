/* Cosas que comparten los paneles: el aviso de errores de carga y
   un hook para cargar datos de la API con "cargando" y "error". */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export const AdminContext = createContext({ avisar: () => {}, verPedidosDe: () => {} })
export const useAdmin = () => useContext(AdminContext)

/* Carga datos con una función que devuelve una promesa.
   Devuelve { datos, cargando, error, recargar }. Si falla, avisa arriba del panel.
   Se carga cuando el panel pasa a estar activo y cada vez que cambia "claves"
   (por ejemplo la página o los filtros). */
export function useCarga(funcion, tituloError, activo = true, claves = []) {
  const { avisar } = useAdmin()
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: '' })
  const ultima = useRef(funcion)
  useEffect(() => { ultima.current = funcion })
  const clave = JSON.stringify(claves)

  const recargar = useCallback(() => ultima.current()
    .then(datos => setEstado({ datos, cargando: false, error: '' }))
    .catch(e => {
      setEstado(actual => ({ ...actual, cargando: false, error: e.message }))
      avisar(tituloError, e.message)
    }), [avisar, tituloError])

  useEffect(() => { if (activo) recargar() }, [activo, recargar, clave])
  return { ...estado, recargar }
}
