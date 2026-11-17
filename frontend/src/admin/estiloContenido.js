/* Cuentas y cambios sobre el "contenido" del editor: { pagina: { seccion: { campo: valor } } }.
   Todas las funciones devuelven datos nuevos (no modifican lo que reciben). */
import { paginas } from '../esquema-editable.js'

export const PALETAS = {
  bosque: { primario: '#1f3a2e', secundario: '#3d6b4f', acento: '#4a7c59' },
  tierra: { primario: '#2c4a3a', secundario: '#8a5a3c', acento: '#c98a4b' },
  rocio: { primario: '#1d3b4a', secundario: '#2f6f73', acento: '#5aa19a' }
}
export const ESTILO_BASE = { colores: PALETAS.bosque, tipografia: 'bebas-inter', botones: 'redondeado' }
export const COLOR_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const claveCampo = (pagina, seccion, campo) => `${pagina}.${seccion}.${campo}`
export const copiar = valor => JSON.parse(JSON.stringify(valor))

export function valorEn(contenido, pagina, seccion, campo) {
  const p = contenido && contenido[pagina]
  return p && p[seccion] ? p[seccion][campo] : undefined
}

// Pone (o, con undefined, quita) un valor y limpia lo que queda vacío.
export function ponerValor(contenido, pagina, seccion, campo, valor) {
  const nuevo = copiar(contenido)
  if (valor === undefined) {
    if (!nuevo[pagina] || !nuevo[pagina][seccion]) return nuevo
    delete nuevo[pagina][seccion][campo]
    if (!Object.keys(nuevo[pagina][seccion]).length) delete nuevo[pagina][seccion]
    if (!Object.keys(nuevo[pagina]).length) delete nuevo[pagina]
    return nuevo
  }
  nuevo[pagina] = nuevo[pagina] || {}
  nuevo[pagina][seccion] = nuevo[pagina][seccion] || {}
  nuevo[pagina][seccion][campo] = valor
  return nuevo
}

export function camposModificados(contenido, paginaId, seccionId) {
  const p = (contenido || {})[paginaId] || {}
  if (seccionId) return Object.keys(p[seccionId] || {}).length
  return Object.values(p).reduce((total, campos) => total + Object.keys(campos).length, 0)
}

export function usosDeImagen(contenido, id) {
  let usos = 0
  Object.values(contenido).forEach(secciones => Object.values(secciones).forEach(campos => Object.values(campos).forEach(valor => {
    if (valor && valor.id === id) usos += 1
  })))
  return usos
}

// Cuántas cosas cambiaron respecto de lo publicado.
export function contarCambios(publicado, contenido, marca) {
  if (!publicado) return 0
  let total = 0
  paginas.forEach(pagina => pagina.secciones.forEach(seccion => seccion.campos.forEach(campo => {
    const a = JSON.stringify(valorEn(contenido, pagina.id, seccion.id, campo.id) || null)
    const b = JSON.stringify(valorEn(publicado.contenido, pagina.id, seccion.id, campo.id) || null)
    if (a !== b) total += 1
  })))
  const pub = publicado.estilo || {}
  const pubColores = Object.assign({}, ESTILO_BASE.colores, pub.colores || {})
  if (JSON.stringify(pubColores) !== JSON.stringify(marca.colores)) total += 1
  if ((pub.tipografia || ESTILO_BASE.tipografia) !== marca.tipografia) total += 1
  if ((pub.botones || ESTILO_BASE.botones) !== marca.botones) total += 1
  return total
}

function luminancia(hex) {
  const canales = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2]
}

export const contrasteConBlanco = hex => 1.05 / (luminancia(hex) + 0.05)

// Lee el texto o la imagen original de cada campo de una página, desde el documento de la vista previa.
export function leerOriginales(doc, pagina) {
  const originales = {}
  pagina.secciones.forEach(seccion => seccion.campos.forEach(campo => {
    const el = doc.querySelector(campo.selector)
    if (!el) return
    const clave = claveCampo(pagina.id, seccion.id, campo.id)
    if (campo.tipo === 'imagen') {
      const origen = el.getAttribute('src') || ''
      originales[clave] = { src: origen ? new URL(origen, window.location.href).href : '', alt: el.getAttribute('alt') || '' }
    } else {
      originales[clave] = (el.textContent || '').replace(/\s+/g, ' ').trim()
    }
  }))
  return originales
}
