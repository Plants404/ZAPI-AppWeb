import { useCallback, useEffect, useMemo, useState } from 'react'
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
import PanelAnalitica from './PanelAnalitica.jsx'
import { ToastsProvider } from '../estado/toasts.jsx'
import { obtenerMensajes, obtenerSesion, obtenerTestimoniosAdmin } from '../api.js'
import { AdminContext, useAdmin, useCarga } from './contexto.jsx'
import { useMediaQuery } from '../utilidades.js'

// Panel de administración: tiene su propio armazón (sin cabecera ni pie del sitio).
// Aquí vive lo común: qué panel se ve, el cajón del menú en celular y la revisión de sesión.
function AdminContenido({ aviso, setAviso }) {
  const navegar = useNavigate()
  const escritorio = useMediaQuery('(min-width: 1024px)')
  const { avisar } = useAdmin()
  const [panel, setPanel] = useState('resumen')
  const [consulta, setConsulta] = useState({ q: '', v: 0 }) // búsqueda con la que se abre "Pedidos"
  const [cajonAbierto, setCajonAbierto] = useState(false)
  // Mensajes y testimonios se cargan al entrar: de ahí salen los numeritos del menú.
  const mensajes = useCarga(obtenerMensajes, 'No se pudieron cargar los mensajes')
  const testimonios = useCarga(obtenerTestimoniosAdmin, 'No se pudieron cargar los testimonios')
  const insignias = {
    mensajes: ((mensajes.datos && mensajes.datos.mensajes) || []).filter(m => m.estado === 'new').length,
    testimonios: ((testimonios.datos && testimonios.datos.testimonios) || []).filter(t => t.estado === 'pending').length
  }
  const { recargar: recargarMensajes } = mensajes
  const { recargar: recargarTestimonios } = testimonios

  // "Ver todos sus pedidos" (desde la analítica): abre Pedidos ya filtrado por el nombre.
  const verPedidosDe = useCallback(nombre => {
    setConsulta(c => ({ q: nombre, v: c.v + 1 }))
    setPanel('pedidos')
  }, [])
  const contexto = useMemo(() => ({ avisar, verPedidosDe }), [avisar, verPedidosDe])

  // Al elegir esos dos paneles se vuelven a pedir, por si llegó algo nuevo.
  function elegirPanel(id) {
    setPanel(id)
    if (id === 'mensajes') recargarMensajes()
    if (id === 'testimonios') recargarTestimonios()
  }

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
    <AdminContext.Provider value={contexto}>
      <Estilos hojas={['tokens', 'base', 'estructura', 'admin']} />
      <div className="admin-shell">
        <AdminBarraSuperior menuAbierto={cajonAbierto} alternarMenu={() => setCajonAbierto(a => !a)} />
        <AdminMenu panel={panel} elegirPanel={elegirPanel} abierto={menuAbierto} cerrar={cerrarCajon} insignias={insignias} />
        <main className="admin-main" id="adminMain">
          <PaneladminAviso aviso={aviso} cerrar={() => setAviso(null)} />
          <PanelResumen activo={panel === 'resumen'} />
          <PanelPedidos key={consulta.v} activo={panel === 'pedidos'} busquedaInicial={consulta.q} />
          <PanelCatalogo activo={panel === 'catalogo'} />
          <PanelMensajes activo={panel === 'mensajes'} carga={mensajes} />
          <PanelTestimonios activo={panel === 'testimonios'} carga={testimonios} />
          <PanelAccesos activo={panel === 'accesos'} />
          <PanelAuditoria activo={panel === 'auditoria'} />
          <PanelAnalitica activo={panel === 'analitica'} />
        </main>
      </div>
    </AdminContext.Provider>
  )
}

// Panel de administración. Acá se arma lo que comparten todos los paneles (toasts y aviso de errores).
function AdminPagina() {
  const [aviso, setAviso] = useState(null)
  const avisar = useCallback((titulo, mensaje) => setAviso({ titulo, mensaje }), [])
  const contexto = useMemo(() => ({ avisar }), [avisar])
  return (
    <ToastsProvider>
      <AdminContext.Provider value={contexto}>
        <AdminContenido aviso={aviso} setAviso={setAviso} />
      </AdminContext.Provider>
    </ToastsProvider>
  )
}

export default AdminPagina
