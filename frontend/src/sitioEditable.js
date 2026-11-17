/* Aplica al sitio el estilo y los textos publicados desde "Estilo del sitio".
   El HTML ya trae los textos originales: si no hay nada publicado, o la API
   no responde, la página queda tal cual. Es el mismo trabajo que hacía
   sitio-editable.js, pero con el esquema importado como módulo. */
import { buscarPagina } from './esquema-editable.js'
import { urlApi } from './api.js'

const TIPOGRAFIAS = {
  'bebas-inter': "'Bebas Neue', Georgia, serif",
  'serif-inter': "Georgia, 'Times New Roman', serif"
}
const BOTONES = { redondeado: '', suave: '10px', recto: '2px' }

function aplicarColores(doc, colores) {
  if (!colores) return
  const estilo = doc.documentElement.style
  if (colores.primario) estilo.setProperty('--forest', colores.primario)
  if (colores.secundario) estilo.setProperty('--moss', colores.secundario)
  if (colores.acento) estilo.setProperty('--leaf', colores.acento)
}

// Colores, tipografía de títulos y forma de los botones.
export function aplicarEstilo(doc, estilo) {
  if (!estilo) return
  aplicarColores(doc, estilo.colores)
  const raiz = doc.documentElement.style
  if (TIPOGRAFIAS[estilo.tipografia]) {
    if (estilo.tipografia === 'bebas-inter') raiz.removeProperty('--serif')
    else raiz.setProperty('--serif', TIPOGRAFIAS[estilo.tipografia])
  }
  if (estilo.botones in BOTONES) {
    if (BOTONES[estilo.botones]) raiz.setProperty('--radio-pill', BOTONES[estilo.botones])
    else raiz.removeProperty('--radio-pill')
  }
}

function aplicarCampo(doc, campo, valor) {
  const elementos = doc.querySelectorAll(campo.selector)
  if (!elementos.length) return

  if (campo.tipo === 'imagen') {
    if (!valor || !/^[a-f0-9]{24}$/.test(valor.id || '')) return
    elementos.forEach(img => {
      if (img.tagName !== 'IMG') return
      img.removeAttribute('srcset')
      img.removeAttribute('sizes')
      img.src = urlApi('/api/imagenes/' + valor.id)
      if (typeof valor.alt === 'string') img.alt = valor.alt
    })
    return
  }

  if (typeof valor !== 'string' || !valor.trim()) return
  elementos.forEach(elemento => { elemento.textContent = valor })
}

// contenido = { pagina: { seccion: { campo: valor } } }
export function aplicarContenido(doc, paginaId, contenido) {
  const pagina = buscarPagina(paginaId)
  const deLaPagina = contenido && contenido[paginaId]
  if (!pagina || !deLaPagina) return
  pagina.secciones.forEach(seccion => {
    const valores = deLaPagina[seccion.id]
    if (!valores) return
    seccion.campos.forEach(campo => {
      if (valores[campo.id] !== undefined) aplicarCampo(doc, campo, valores[campo.id])
    })
  })
}

// Ruta del sitio → id de página editable.
export const PAGINA_DE_RUTA = {
  '/': 'inicio',
  '/catalogo': 'catalogo',
  '/servicios': 'servicios',
  '/nosotros': 'nosotros',
  '/contacto': 'contacto',
  '/carrito': 'carrito'
}
