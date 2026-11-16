/* Estado único del carrito. Lo comparten el contador de la cabecera, las
   tarjetas de producto, el modal y la página del carrito. Se guarda en
   localStorage (clave "zapiCarrito"). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { PRODUCTOS } from '../data/productos.js'
import { NEGOCIO } from '../data/negocio.js'

const CLAVE_CARRITO = 'zapiCarrito'
const CarritoContext = createContext(null)

export const obtenerProducto = id => PRODUCTOS.find(p => Number(p.id) === Number(id)) || null

export function unidadesDe(id) {
  const producto = obtenerProducto(id)
  const stock = Number(producto && producto.stock)
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}

// Revisa una línea guardada contra el catálogo (precio, stock máximo).
function normalizarLinea(linea) {
  if (!linea || typeof linea !== 'object') return null
  const producto = obtenerProducto(linea.id)
  if (!producto) return null
  const maximo = unidadesDe(producto.id)
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
    return Array.isArray(crudo) ? crudo.map(normalizarLinea).filter(Boolean) : []
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
  const [lineas, setLineas] = useState(leerGuardado)
  const [pulso, setPulso] = useState(0) // sube cada vez que se agrega algo (anima el contador)

  useEffect(() => {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lineas)) } catch { /* sin almacenamiento */ }
  }, [lineas])

  // Si se modifica el carrito en otra pestaña, esta se actualiza.
  useEffect(() => {
    const alCambiar = e => { if (e.key === CLAVE_CARRITO) setLineas(leerGuardado()) }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  // Devuelve true si se pudo agregar, false si ya no hay stock.
  const agregar = useCallback(id => {
    const producto = obtenerProducto(id)
    const disponibles = unidadesDe(id)
    if (!producto || disponibles === 0) return false
    const existente = lineas.find(l => l.id === producto.id)
    if (existente && existente.cantidad >= disponibles) return false
    setLineas(actuales => existente
      ? actuales.map(l => (l.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l))
      : [...actuales, normalizarLinea({ id: producto.id, cantidad: 1 })])
    setPulso(p => p + 1)
    return true
  }, [lineas])

  const cambiarCantidad = useCallback((id, delta) => {
    const linea = lineas.find(l => l.id === Number(id))
    if (!linea) return false
    const nueva = Math.max(1, Math.min(unidadesDe(linea.id), linea.cantidad + delta))
    if (nueva === linea.cantidad) return false
    setLineas(actuales => actuales.map(l => (l.id === linea.id ? { ...l, cantidad: nueva } : l)))
    return true
  }, [lineas])

  const quitar = useCallback(id => setLineas(actuales => actuales.filter(l => l.id !== Number(id))), [])
  const vaciar = useCallback(() => setLineas([]), [])

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
