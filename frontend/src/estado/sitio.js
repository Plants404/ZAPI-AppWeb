/* Hooks de "cosas del sitio que se hacen una vez por página":
   estilo publicado, analítica y modo "ver como cliente". */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { enviarEvento, obtenerPublicado } from '../api.js'
import { PAGINA_DE_RUTA, aplicarContenido, aplicarEstilo } from '../sitioEditable.js'

// ¿Se está viendo el sitio como cliente desde el panel? Devuelve la ruta para volver, o null.
export function destinoModoCliente() {
  try {
    if (sessionStorage.getItem('zapiModoCliente') === '1') return sessionStorage.getItem('zapiVolverA') || null
  } catch { /* sin almacenamiento */ }
  return null
}

/* Pide lo publicado y lo aplica a la página actual. */
export function useSitioEditable() {
  const { pathname } = useLocation()
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerPublicado().then(d => { if (vigente && d) setDatos(d) }).catch(() => { /* queda la página original */ })
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    if (!datos) return
    aplicarEstilo(document, datos.estilo)
    const id = PAGINA_DE_RUTA[pathname]
    if (!id) return
    aplicarContenido(document, id, datos.contenido)
  }, [datos, pathname])
}

/* Analítica anónima: manda "vista_de_pagina" en cada cambio de ruta y los clics
   clave. No registra en modo cliente, en la vista previa ni en el panel. */
export function useRastreo() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (destinoModoCliente() || pathname.startsWith('/admin')) return undefined

    let idSesion = null
    try { idSesion = sessionStorage.getItem('zapiSesion') } catch { /* sin almacenamiento */ }
    if (!idSesion) {
      idSesion = (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID())
        || Math.random().toString(36).slice(2) + Date.now().toString(36)
      try { sessionStorage.setItem('zapiSesion', idSesion) } catch { /* sin almacenamiento */ }
    }
    const dispositivo = /Mobi|Android/i.test(navigator.userAgent || '') ? 'movil' : 'computadora'
    // El servidor conoce las fichas como "/producto-<slug>".
    const pagina = pathname.replace(/^\/producto\//, '/producto-')

    const enviar = (tipo, elemento, productoId) => {
      const evento = { tipo, idSesion, pagina, elemento: elemento || null, dispositivo }
      if (productoId) evento.productoId = productoId
      enviarEvento(evento)
    }

    enviar('vista_de_pagina')

    const alHacerClic = evento => {
      const boton = evento.target.closest('button, a')
      if (!boton) return
      const href = boton.getAttribute('href') || ''
      const texto = (boton.textContent || '').trim()
      if (href.startsWith('https://wa.me')) return enviar('clic_a_whatsapp', 'whatsapp')
      if (boton.id === 'whatsappButton' || /confirmar pedido/i.test(texto)) return enviar('inicio_de_pedido', 'boton-confirmar-pedido')
      if (boton.classList.contains('add-cart')) return enviar('agregar_al_carrito', 'add-cart', boton.dataset.agregarProducto || '')
      if (boton.classList.contains('boton-primario') || boton.classList.contains('boton-secundario')) {
        return enviar('clic_elemento_clave', boton.classList.contains('boton-primario') ? 'boton-primario' : 'boton-secundario')
      }
    }
    document.addEventListener('click', alHacerClic)
    return () => document.removeEventListener('click', alHacerClic)
  }, [pathname])
}
