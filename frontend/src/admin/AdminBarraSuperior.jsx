import { Link } from 'react-router-dom'
import { cerrarSesion } from '../api.js'

// Barra de arriba del panel: menú (celular), modo de vista, "Ver sitio" y "Cerrar sesión".
function AdminBarraSuperior({ menuAbierto, alternarMenu }) {
  async function salir() {
    await cerrarSesion()
    try { sessionStorage.removeItem('zapiModoCliente') } catch { /* sin almacenamiento */ }
    window.location.href = '/login'
  }

  // "Ver como cliente" abre el sitio real; el sitio muestra el aviso para volver.
  function cambiarModo(e) {
    if (e.target.value !== 'cliente') return
    try {
      sessionStorage.setItem('zapiModoCliente', '1')
      sessionStorage.setItem('zapiVolverA', window.location.pathname + window.location.search)
    } catch { /* sin almacenamiento: se abre igual el sitio */ }
    window.location.href = '/'
  }

  return (
    <header className="admin-topbar" id="adminTopbar">
      <div className="admin-topbar-inicio">
        <button className="admin-boton-menu" id="adminBotonMenu" type="button" aria-expanded={menuAbierto} aria-controls="adminSidebar" aria-label="Abrir menú de navegación" onClick={alternarMenu}>
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
          <select className="admin-select" id="adminModo" aria-label="Cambiar modo" defaultValue="admin" onChange={cambiarModo}>
            <option value="admin">Administrador</option>
            <option value="cliente">Ver como cliente</option>
          </select>
        </div>
        <Link className="admin-boton-barra" to="/" target="_blank" rel="noopener" id="adminVerSitio">
          <span className="material-symbols-outlined" aria-hidden="true">public</span>
          <span className="admin-boton-barra-texto">Ver sitio web</span>
        </Link>
        <button className="admin-boton-barra admin-boton-barra-salir" type="button" id="adminCerrarSesion" onClick={salir}>
          <span className="material-symbols-outlined" aria-hidden="true">logout</span>
          <span className="admin-boton-barra-texto">Cerrar sesión</span>
        </button>
      </div>
    </header>
  )
}

export default AdminBarraSuperior
