/* Ayudas generales (las mismas del sitio viejo, ahora como módulo). */
import { useEffect, useState } from 'react'
import { NEGOCIO } from './data/negocio.js'

export function formatearFecha(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const dia = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)
  const hora = new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha)
  return dia + ' · ' + hora
}

export function normalizarTexto(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Saca caracteres de control (invisibles) y espacios de los bordes.
export function limpiarValor(valor) {
  // eslint-disable-next-line no-control-regex
  return String(valor ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim()
}

export const validarCorreo = valor => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(valor).trim())
export const validarTelefono = valor => String(valor).replace(/\D/g, '').length >= 6

export function abrirWhatsApp(mensaje, nuevaPestana = false) {
  const url = 'https://wa.me/' + NEGOCIO.whatsapp + '?text=' + encodeURIComponent(mensaje)
  if (nuevaPestana) {
    const ventana = window.open(url, '_blank', 'noopener')
    if (ventana) return url
  }
  window.location.href = url
  return url
}

const URL_EMAILJS = 'https://api.emailjs.com/api/v1.0/email/send'

function correoConfigurado(plantilla) {
  const c = NEGOCIO.emailjs
  return Boolean(c.servicio && c.clavePublica && plantilla)
    && !String(c.servicio).startsWith('PEGAR_')
    && !String(c.clavePublica).startsWith('PEGAR_')
    && !String(plantilla).startsWith('PEGAR_')
}

export async function enviarCorreoEmailJS(plantilla, parametros) {
  if (!correoConfigurado(plantilla)) throw new Error('EmailJS sin configurar')
  const respuesta = await fetch(URL_EMAILJS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: NEGOCIO.emailjs.servicio,
      template_id: plantilla,
      user_id: NEGOCIO.emailjs.clavePublica,
      template_params: parametros
    })
  })
  if (!respuesta.ok) {
    let detalle = ''
    try { detalle = (await respuesta.text()).slice(0, 300) } catch { /* sin cuerpo */ }
    throw new Error('EmailJS ' + respuesta.status + ': ' + (detalle || 'No se pudo enviar el correo'))
  }
  return true
}

/* ---- Hooks ---- */

// Bloquea el scroll de la página mientras haya alguna capa abierta (menú, modal...).
let capasConScrollBloqueado = 0
export function useBloquearScroll(activo) {
  useEffect(() => {
    if (!activo) return undefined
    capasConScrollBloqueado += 1
    document.body.classList.add('sin-scroll')
    return () => {
      capasConScrollBloqueado = Math.max(0, capasConScrollBloqueado - 1)
      if (capasConScrollBloqueado === 0) document.body.classList.remove('sin-scroll')
    }
  }, [activo])
}

// Dice si una media query (ej. "(min-width: 1024px)") se cumple ahora mismo.
export function useMediaQuery(consulta) {
  const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const lista = window.matchMedia(consulta)
    const alCambiar = () => setCoincide(lista.matches)
    alCambiar()
    lista.addEventListener('change', alCambiar)
    return () => lista.removeEventListener('change', alCambiar)
  }, [consulta])
  return coincide
}

// Foto de reemplazo si una imagen no carga.
export const IMAGEN_FALLBACK = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#f7f4ec"/>' +
  '<path d="M60 96V58" stroke="#4a7c59" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M60 74c-16 0-24-10-24-24 14-2 24 6 24 24Z" fill="#4a7c59"/>' +
  '<path d="M60 84c16 0 24-10 24-24-14-2-24 6-24 24Z" fill="#2f5c3c"/>' +
  '<path d="M36 116h48" stroke="#2f5c3c" stroke-width="3" stroke-linecap="round"/></svg>'
)
