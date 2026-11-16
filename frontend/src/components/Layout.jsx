import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useMatches, useLocation } from 'react-router-dom'
import Estilos from './Estilos.jsx'
import Cabecera from './Cabecera.jsx'
import HojaMenu from './HojaMenu.jsx'
import Pie from './Pie.jsx'
import ModalProducto from './ModalProducto.jsx'
import DialogoTestimonio from './DialogoTestimonio.jsx'
import AvisoFlotante from './AvisoFlotante.jsx'
import ChatbotZapi from './ChatbotZapi.jsx'
import FooterProducto from './FooterProducto.jsx'
import { useBloquearScroll, useMediaQuery } from '../utilidades.js'

// Menú móvil: en pantallas grandes la barra siempre se ve; en celular sube una hoja desde abajo.
function useMenu() {
  const escritorio = useMediaQuery('(min-width: 1024px)')
  const movil = useMediaQuery('(max-width: 1023px)')
  const [abierto, setAbierto] = useState(false)
  const [hojaVisible, setHojaVisible] = useState(false)
  const [hojaClase, setHojaClase] = useState(false)
  const reloj = useRef(null)

  const cerrar = useCallback(() => setAbierto(false), [])
  const alternar = useCallback(() => setAbierto(a => !a), [])

  // Animación de la hoja: primero se muestra, un instante después se le pone la clase que la sube.
  useEffect(() => {
    window.clearTimeout(reloj.current)
    if (abierto && movil) {
      let segundo = 0
      const primero = window.requestAnimationFrame(() => {
        setHojaVisible(true)
        segundo = window.requestAnimationFrame(() => setHojaClase(true))
      })
      return () => { window.cancelAnimationFrame(primero); window.cancelAnimationFrame(segundo); setHojaClase(false) }
    }
    reloj.current = window.setTimeout(() => setHojaVisible(false), 250)
    return () => window.clearTimeout(reloj.current)
  }, [abierto, movil])

  // Al pasar a escritorio se cierra el menú móvil (ajuste de estado durante el render).
  if (escritorio && abierto) setAbierto(false)

  useEffect(() => {
    document.body.classList.toggle('menu-abierto', abierto)
    return () => document.body.classList.remove('menu-abierto')
  }, [abierto])

  useEffect(() => {
    if (!abierto) return undefined
    const alTecla = e => { if (e.key === 'Escape') { e.preventDefault(); setAbierto(false) } }
    document.addEventListener('keydown', alTecla)
    return () => document.removeEventListener('keydown', alTecla)
  }, [abierto])

  useBloquearScroll(abierto)

  const hojaActiva = movil && abierto
  return {
    abierto, alternar, cerrar, hojaVisible, hojaClase, hojaActiva,
    navAbierta: abierto && !movil,
    navOculta: !escritorio && (!abierto || hojaActiva)
  }
}

// Armazón común del sitio. Cada ruta declara en su "handle" qué sección es,
// qué hojas de estilo usa y si lleva modal de producto u opiniones.
function Layout() {
  const { pathname } = useLocation()
  const handle = useMatches().map(m => m.handle).filter(Boolean).pop() || {}
  const { seccion = '', hojas = [], ficha = false, compacto = false, productos = false, opiniones = false } = handle
  const menu = useMenu()
  const { cerrar: cerrarMenu } = menu

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { cerrarMenu() }, [pathname, cerrarMenu])

  return (
    <>
      <Estilos hojas={hojas} />
      <Cabecera seccion={seccion} fichaProducto={ficha} menu={menu} />
      <HojaMenu seccion={seccion} menu={menu} />
      <main id="contenido" tabIndex="-1">
        <Outlet />
      </main>
      {ficha ? <FooterProducto /> : <Pie compacto={compacto} />}
      {productos && !ficha && <ModalProducto />}
      {opiniones && <DialogoTestimonio />}
      <AvisoFlotante />
      <ChatbotZapi />
    </>
  )
}

export default Layout
