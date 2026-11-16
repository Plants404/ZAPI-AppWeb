import { normalizarTexto } from '../utilidades.js'

// Productos (de la lista que se pasa) que coinciden con la categoría y el texto buscado (todas las palabras).
export function filtrarProductos(productos, { categoria = '', busqueda = '' } = {}) {
  const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean)
  return productos.filter(producto => {
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
