import { PRODUCTOS } from './productos.js'
import { normalizarTexto } from '../utilidades.js'

// Productos que coinciden con la categoría y el texto buscado (todas las palabras).
export function filtrarProductos({ categoria = '', busqueda = '' } = {}) {
  const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean)
  return PRODUCTOS.filter(producto => {
    if (categoria && producto.categoria !== categoria) return false
    if (!palabras.length) return true
    const texto = normalizarTexto([
      producto.nombre,
      producto.categoria,
      producto.descripcion,
      Array.isArray(producto.infoDeVenta) ? producto.infoDeVenta.join(' ') : ''
    ].join(' '))
    return palabras.every(palabra => texto.includes(palabra))
  })
}
