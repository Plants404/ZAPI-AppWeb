// Menú lateral del panel de administración.
const ENLACES = [
  ['resumen', 'dashboard', 'Resumen'],
  ['auditoria', 'history', 'Registro de actividad'],
  ['pedidos', 'receipt_long', 'Pedidos y ventas'],
  ['catalogo', 'inventory', 'Catálogo y stock'],
  ['analitica', 'bar_chart', 'Analítica de clientes'],
  ['mensajes', 'message', 'Mensajes'],
  ['testimonios', 'rate_review', 'Testimonios'],
  ['accesos', 'people', 'Accesos']
]

// Menú lateral del panel. En escritorio queda fijo; en celular es un cajón que se abre y cierra.
// "insignias" trae los numeritos (mensajes y testimonios pendientes).
function AdminMenu({ panel, elegirPanel, abierto, cerrar, insignias = {} }) {
  return (
      <nav className={'admin-sidebar' + (abierto ? ' admin-sidebar--abierto' : '')} id="adminSidebar" aria-label="Menú del panel de administración" hidden={!abierto}>
        <div className="admin-sidebar-fondo" aria-hidden="true" hidden={!abierto} onClick={cerrar}></div>
        <div className="admin-sidebar-caja">
          <button className="admin-boton-cerrar" type="button" aria-label="Cerrar menú" onClick={cerrar}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <ul className="admin-menu">
            {ENLACES.map(([id, icono, texto]) => (
              <li key={id}>
                <a className={'admin-menu-enlace' + (panel === id ? ' admin-menu-enlace-activo' : '')} href="#" aria-current={panel === id ? 'true' : 'false'} onClick={e => { e.preventDefault(); elegirPanel(id); cerrar() }}>
                  <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
                  <span className="admin-menu-texto">{texto}</span>
                  {insignias[id] > 0 && <span className="admin-menu-insignia" id={id === 'mensajes' ? 'insigniaMensajes' : 'insigniaTestimonios'}>{insignias[id]}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
  )
}

export default AdminMenu
