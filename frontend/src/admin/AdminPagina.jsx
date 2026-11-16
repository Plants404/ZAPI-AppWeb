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

// Panel de administración: tiene su propio armazón (sin cabecera ni pie del sitio).
function AdminPagina() {
  return (
    <>
      <Estilos hojas={['tokens', 'base', 'estructura', 'admin']} />
      <div className="admin-shell">
        <AdminBarraSuperior />
        <AdminMenu />
        <main className="admin-main" id="adminMain">
          <PaneladminAviso />
          <PanelResumen />
          <PanelPedidos />
          <PanelCatalogo />
          <PanelMensajes />
          <PanelTestimonios />
          <PanelAccesos />
          <PanelAuditoria />
          <PanelEstilo />
          <PanelAnalitica />
        </main>
        <DialogoVentaPresencial />
        <DialogoBiblioteca />
        <DialogoHistorial />
        <DialogoProducto />
      </div>
    </>
  )
}

export default AdminPagina
