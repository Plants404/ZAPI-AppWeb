/* Estado único del carrito. Lo comparten el contador de la cabecera, las
   tarjetas de producto, el modal y la página del carrito. Se guarda en
   localStorage (clave "zapiCarrito"). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCatalogo, unidadesDeProducto } from './catalogo.jsx'
import { NEGOCIO } from '../data/negocio.js'

const CLAVE_CARRITO = 'zapiCarrito'
const CarritoContext = createContext(null)

// Arma una línea del carrito con los datos actuales del catálogo (precio, stock máximo).
function normalizarLinea(linea, productos) {
  if (!linea || typeof linea !== 'object') return null
  const producto = productos.find(p => Number(p.id) === Number(linea.id))
  if (!producto) return null
  const maximo = unidadesDeProducto(producto)
  if (maximo === 0) return null
  const cantidad = Math.max(1, Math.floor(Number(linea.cantidad) || 1))
  return {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    imagen: producto.imagen,
    precio: producto.precioBase,
    cantidad: Math.min(maximo, cantidad)
  }
}

function leerGuardado() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_CARRITO))
    return Array.isArray(crudo) ? crudo.filter(l => l && typeof l === 'object') : []
  } catch {
    return []
  }
}

export function calcularTotales(lineas) {
  const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0)
  const envio = lineas.length === 0 || subtotal >= NEGOCIO.envioGratis ? 0 : null
  return { subtotal, envio, total: envio === null ? subtotal : subtotal + envio }
}

export function CarritoProvider({ children }) {
  const { productos, cargando, error } = useCatalogo()
  const [guardado, setGuardado] = useState(leerGuardado)
  const [pulso, setPulso] = useState(0) // sube cada vez que se agrega algo (anima el contador)
  const catalogoListo = !cargando && !error

  // Mientras el catálogo carga (o si falla) se muestra lo guardado tal cual;
  // cuando llega, cada línea se revisa contra precio y stock actuales.
  const lineas = useMemo(
    () => (catalogoListo ? guardado.map(l => normalizarLinea(l, productos)).filter(Boolean) : guardado),
    [guardado, productos, catalogoListo]
  )

  useEffect(() => {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lineas)) } catch { /* sin almacenamiento */ }
  }, [lineas])

  // Si se modifica el carrito en otra pestaña, esta se actualiza.
  useEffect(() => {
    const alCambiar = e => { if (e.key === CLAVE_CARRITO) setGuardado(leerGuardado()) }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  // Devuelve true si se pudo agregar, false si ya no hay stock.
  const agregar = useCallback(id => {
    const producto = productos.find(p => Number(p.id) === Number(id))
    const disponibles = unidadesDeProducto(producto)
    if (!producto || disponibles === 0) return false
    const existente = lineas.find(l => l.id === producto.id)
    if (existente && existente.cantidad >= disponibles) return false
    setGuardado(existente
      ? lineas.map(l => (l.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l))
      : [...lineas, normalizarLinea({ id: producto.id, cantidad: 1 }, productos)])
    setPulso(p => p + 1)
    return true
  }, [lineas, productos])

  const cambiarCantidad = useCallback((id, delta) => {
    const linea = lineas.find(l => l.id === Number(id))
    if (!linea) return false
    const producto = productos.find(p => Number(p.id) === linea.id)
    const nueva = Math.max(1, Math.min(unidadesDeProducto(producto), linea.cantidad + delta))
    if (nueva === linea.cantidad) return false
    setGuardado(lineas.map(l => (l.id === linea.id ? { ...l, cantidad: nueva } : l)))
    return true
  }, [lineas, productos])

  const quitar = useCallback(id => setGuardado(lineas.filter(l => l.id !== Number(id))), [lineas])
  const vaciar = useCallback(() => setGuardado([]), [])

  const valor = useMemo(() => ({
    lineas,
    cantidadTotal: lineas.reduce((suma, l) => suma + l.cantidad, 0),
    totales: calcularTotales(lineas),
    pulso,
    agregar,
    cambiarCantidad,
    quitar,
    vaciar
  }), [lineas, pulso, agregar, cambiarCantidad, quitar, vaciar])

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}

export function useCarrito() {
  const contexto = useContext(CarritoContext)
  if (!contexto) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>')
  return contexto
}
