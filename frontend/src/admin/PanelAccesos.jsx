function PanelAccesos({ activo }) {
  return (
      <section className="admin-panel gestion-panel" id="panelAccesos" hidden={!activo} aria-label="Accesos">
        <div className="gestion-encabezado">
          <div>
            <h1>Accesos</h1>
            <p>Quién tiene cuenta y qué puede hacer. Solo los administradores entran a este panel.</p>
          </div>
          <div className="gestion-resumen" id="resumenAccesos"></div>
        </div>
        <div className="gestion-barra">
          <label className="gestion-buscar">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <span className="sr-only">Buscar personas</span>
            <input type="search" id="buscarAccesos" placeholder="Buscar por nombre o correo" />
          </label>
          <div className="gestion-filtros" id="filtrosAccesos" role="group" aria-label="Filtrar por rol"></div>
        </div>
        <section className="gestion-tabla" aria-label="Personas con cuenta">
          <div className="gestion-tabla-interior">
            <div className="gestion-tabla-cabecera">
              <span>Persona</span>
              <span>Rol</span>
              <span>Alta</span>
              <span>Acciones</span>
            </div>
            <div id="adminCuerpoAccesos"></div>
          </div>
        </section>
        <p id="adminAccesosVacio" className="estado-vacio" hidden>No hay usuarios.</p>
        <p className="gestion-pie">Cada cambio de rol queda guardado en el Registro de actividad.</p>
      </section>
  )
}

export default PanelAccesos
