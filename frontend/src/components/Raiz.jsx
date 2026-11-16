import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { IMAGEN_FALLBACK } from '../utilidades.js'

// Raíz de todas las rutas: pone el título de la pestaña y la clase del <body>
// según el "handle" de la ruta (lo mismo que hacía cada HTML del sitio viejo).
function Raiz() {
  const handle = useMatches().map(m => m.handle).filter(Boolean).pop() || {}
  const { titulo = 'ZAPI | Vivero agroecológico en Montevideo', bodyClass = '' } = handle

  useEffect(() => { document.title = titulo }, [titulo])

  useEffect(() => {
    const clases = bodyClass.split(' ').filter(Boolean)
    document.body.classList.add(...clases)
    document.documentElement.dataset.cuentas = 'off'
    return () => document.body.classList.remove(...clases)
  }, [bodyClass])

  // Si una imagen no carga, se muestra una planta dibujada en su lugar.
  useEffect(() => {
    const alFallar = evento => {
      const imagen = evento.target
      if (!(imagen instanceof HTMLImageElement) || imagen.dataset.fallbackAplicado === 'si') return
      imagen.dataset.fallbackAplicado = 'si'
      imagen.src = IMAGEN_FALLBACK
      if (!imagen.alt) imagen.alt = 'Imagen no disponible'
    }
    document.addEventListener('error', alFallar, true)
    return () => document.removeEventListener('error', alFallar, true)
  }, [])

  return <Outlet />
}

export default Raiz
