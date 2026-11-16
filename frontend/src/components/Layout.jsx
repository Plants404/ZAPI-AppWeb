import { useEffect } from 'react'
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

// Armazón común del sitio. Cada ruta declara en su "handle" qué sección es,
// qué hojas de estilo usa y si lleva modal de producto u opiniones.
function Layout() {
  const { pathname } = useLocation()
  const handle = useMatches().map(m => m.handle).filter(Boolean).pop() || {}
  const { seccion = '', hojas = [], ficha = false, compacto = false, productos = false, opiniones = false } = handle

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <>
      <Estilos hojas={hojas} />
      <Cabecera seccion={seccion} fichaProducto={ficha} />
      <HojaMenu seccion={seccion} />
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
