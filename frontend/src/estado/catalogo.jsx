/* Catálogo que viene de la API (GET /api/products). Lo cargan una sola vez
   y lo comparten todas las páginas. Trae también "cargando" y "error". */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { obtenerProductos } from '../api.js'

const CatalogoContext = createContext(null)

// Unidades que se pueden vender (el stock se carga a mano en el panel).
export function unidadesDeProducto(producto) {
  const stock = Number(producto && producto.stock)
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}

export function CatalogoProvider({ children }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Pide el catálogo; cuando llega (o falla) deja de estar "cargando".
  const pedir = useCallback(() => obtenerProductos()
    .then(lista => { setProductos(lista); setError('') })
    .catch(e => setError(e.message || 'No pudimos cargar el catálogo.'))
    .finally(() => setCargando(false)), [])

  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    return pedir()
  }, [pedir])

  // Se pide una vez al abrir el sitio.
  useEffect(() => { pedir() }, [pedir])

  const valor = useMemo(() => ({
    productos,
    obtenerProducto: id => productos.find(p => Number(p.id) === Number(id)) || null,
    unidadesDe: id => unidadesDeProducto(productos.find(p => Number(p.id) === Number(id))),
    categorias: [...new Set(productos.map(p => p.categoria))],
    cargando,
    error,
    recargar
  }), [productos, cargando, error, recargar])

  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const contexto = useContext(CatalogoContext)
  if (!contexto) throw new Error('useCatalogo debe usarse dentro de <CatalogoProvider>')
  return contexto
}

// Mensaje que se ve mientras carga o si falló (en las páginas que dependen del catálogo).
export function EstadoCatalogo({ cargando, error, recargar }) {
  if (cargando) return <p className="estado-vacio" role="status">Cargando productos…</p>
  if (error) {
    return (
      <p className="estado-vacio" role="alert">
        {error} <button className="boton-texto" type="button" onClick={recargar}>Reintentar</button>
      </p>
    )
  }
  return null
}
