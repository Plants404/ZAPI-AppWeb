import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Estilos from '../components/Estilos.jsx'
import AdminBarraSuperior from './AdminBarraSuperior.jsx'
import AdminMenu from './AdminMenu.jsx'
import PaneladminAviso from './PaneladminAviso.jsx'
import PanelResumen from './PanelResumen.jsx'
import PanelPedidos from './PanelPedidos.jsx'
import PanelCatalogo from './PanelCatalogo.jsx'
import PanelMensajes from './PanelMensajes.jsx'
import PanelTestimonios from './PanelTestimonios.jsx'
import PanelAccesos from './PanelAccesos.jsx'
import PanelAuditoria from './PanelAuditoria.jsx'
import PanelEstilo from './PanelEstilo.jsx'
import PanelAnalitica from './PanelAnalitica.jsx'
import DialogoVentaPresencial from './DialogoVentaPresencial.jsx'
import DialogoBiblioteca from './DialogoBiblioteca.jsx'
import DialogoHistorial from './DialogoHistorial.jsx'
import DialogoProducto from './DialogoProducto.jsx'
import { ToastsProvider } from '../estado/toasts.jsx'
import { obtenerSesion } from '../api.js'
import { useMediaQuery } from '../utilidades.js'

// Panel de administración: tiene su propio armazón (sin cabecera ni pie del sitio).
// Aquí vive lo común: qué panel se ve, el cajón del menú en celular y la revisión de sesión.
function AdminPagina() {
  const navegar = useNavigate()
  const escritorio = useMediaQuery('(min-width: 1024px)')
  const [panel, setPanel] = useState('resumen')
  const [cajonAbierto, setCajonAbierto] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [insignias] = useState({}) // se llena en la Fase 5 con los datos de la API

  // En escritorio el menú está siempre a la vista; en celular, solo si se abrió el cajón.
  const menuAbierto = escritorio || cajonAbierto

  // Solo entran administradores: sin sesión de admin se manda al login.
  useEffect(() => {
    let vivo = true
    obtenerSesion().then(sesion => {
      if (vivo && (!sesion || sesion.rol !== 'admin')) navegar('/login?volver=/admin', { replace: true })
    })
    return () => { vivo = false }
  }, [navegar])

  useEffect(() => { window.scrollTo(0, 0) }, [panel])

  useEffect(() => {
    if (!cajonAbierto) return undefined
    const alTecla = e => { if (e.key === 'Escape') setCajonAbierto(false) }
    document.addEventListener('keydown', alTecla)
    return () => document.removeEventListener('keydown', alTecla)
  }, [cajonAbierto])

  const cerrarCajon = () => setCajonAbierto(false)

  return (
    <ToastsProvider>
      <Estilos hojas={['tokens', 'base', 'estructura', 'admin']} />
      <div className="admin-shell">
        <AdminBarraSuperior menuAbierto={cajonAbierto} alternarMenu={() => setCajonAbierto(a => !a)} />
        <AdminMenu panel={panel} elegirPanel={setPanel} abierto={menuAbierto} cerrar={cerrarCajon} insignias={insignias} />
        <main className="admin-main" id="adminMain">
          <PaneladminAviso aviso={aviso} cerrar={() => setAviso(null)} />
          <PanelResumen activo={panel === 'resumen'} />
          <PanelPedidos activo={panel === 'pedidos'} />
          <PanelCatalogo activo={panel === 'catalogo'} />
          <PanelMensajes activo={panel === 'mensajes'} />
          <PanelTestimonios activo={panel === 'testimonios'} />
          <PanelAccesos activo={panel === 'accesos'} />
          <PanelAuditoria activo={panel === 'auditoria'} />
          <PanelEstilo activo={panel === 'estilo'} />
          <PanelAnalitica activo={panel === 'analitica'} />
        </main>
        <DialogoVentaPresencial />
        <DialogoBiblioteca />
        <DialogoHistorial />
        <DialogoProducto />
      </div>
    </ToastsProvider>
  )
}

export default AdminPagina
