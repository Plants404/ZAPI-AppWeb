import { Link } from 'react-router-dom'

function AdminBarraSuperior() {
  return (
      <header className="admin-topbar" id="adminTopbar">
        <div className="admin-topbar-inicio">
          <button className="admin-boton-menu" id="adminBotonMenu" type="button" aria-expanded="false" aria-controls="adminSidebar" aria-label="Abrir menú de navegación">
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
          <div className="admin-marca">
            <img className="admin-marca-logo" src="/img/logo.svg" alt="" width="34" height="48" />
            <strong className="admin-marca-titulo">ZAPI</strong>
            <span className="admin-marca-sub">Admin</span>
          </div>
        </div>
        <div className="admin-topbar-centro">
          <div className="admin-modo" role="group" aria-label="Modo de visualización del panel">
            <span className="admin-modo-texto">Modo</span>
            <select className="admin-select" id="adminModo" aria-label="Cambiar modo">
              <option value="admin">Administrador</option>
              <option value="cliente">Ver como cliente</option>
            </select>
          </div>
          <Link className="admin-boton-barra" to="/" target="_blank" rel="noopener" id="adminVerSitio">
            <span className="material-symbols-outlined" aria-hidden="true">public</span>
            <span className="admin-boton-barra-texto">Ver sitio web</span>
          </Link>
          <button className="admin-boton-barra admin-boton-barra-salir" type="button" id="adminCerrarSesion">
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            <span className="admin-boton-barra-texto">Cerrar sesión</span>
          </button>
        </div>
      </header>
  )
}

export default AdminBarraSuperior
