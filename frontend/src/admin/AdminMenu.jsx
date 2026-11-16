function AdminMenu() {
  return (
      <nav className="admin-sidebar" id="adminSidebar" aria-label="Menú del panel de administración" hidden>
        <div className="admin-sidebar-fondo" data-cerrar-sidebar="" aria-hidden="true"></div>
        <div className="admin-sidebar-caja">
          <button className="admin-boton-cerrar" type="button" data-cerrar-sidebar="" aria-label="Cerrar menú">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <ul className="admin-menu">
            <li>
              <a className="admin-menu-enlace admin-menu-enlace-activo" href="#" data-panel="resumen" aria-current="true">
                <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
                <span className="admin-menu-texto">Resumen</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="auditoria">
                <span className="material-symbols-outlined" aria-hidden="true">history</span>
                <span className="admin-menu-texto">Registro de actividad</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="pedidos">
                <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                <span className="admin-menu-texto">Pedidos y ventas</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="catalogo">
                <span className="material-symbols-outlined" aria-hidden="true">inventory</span>
                <span className="admin-menu-texto">Catálogo y stock</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="estilo">
                <span className="material-symbols-outlined" aria-hidden="true">palette</span>
                <span className="admin-menu-texto">Estilo del sitio</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="analitica">
                <span className="material-symbols-outlined" aria-hidden="true">bar_chart</span>
                <span className="admin-menu-texto">Analítica de clientes</span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="mensajes">
                <span className="material-symbols-outlined" aria-hidden="true">message</span>
                <span className="admin-menu-texto">Mensajes</span>
                <span className="admin-menu-insignia" id="insigniaMensajes" hidden></span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="testimonios">
                <span className="material-symbols-outlined" aria-hidden="true">rate_review</span>
                <span className="admin-menu-texto">Testimonios</span>
                <span className="admin-menu-insignia" id="insigniaTestimonios" hidden></span>
              </a>
            </li>
            <li>
              <a className="admin-menu-enlace" href="#" data-panel="accesos">
                <span className="material-symbols-outlined" aria-hidden="true">people</span>
                <span className="admin-menu-texto">Accesos</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
  )
}

export default AdminMenu
