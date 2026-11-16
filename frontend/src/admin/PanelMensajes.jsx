function PanelMensajes() {
  return (
      <section className="admin-panel gestion-panel" id="panelMensajes" hidden aria-label="Mensajes">
        <div className="gestion-encabezado">
          <div>
            <h1>Mensajes</h1>
            <p>Consultas que llegan desde el formulario de contacto.</p>
          </div>
          <div className="gestion-resumen" id="resumenMensajes"></div>
        </div>
        <div className="gestion-bandeja">
          <section className="gestion-bandeja-lista" aria-label="Lista de mensajes">
            <div className="gestion-bandeja-herramientas">
              <label className="gestion-buscar">
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <span className="sr-only">Buscar mensajes</span>
                <input type="search" id="buscarMensajes" placeholder="Buscar por nombre o asunto" />
              </label>
              <div className="gestion-filtros" id="filtrosMensajes" role="group" aria-label="Filtrar por estado"></div>
            </div>
            <div id="adminCuerpoMensajes"></div>
            <p id="adminMensajesVacio" className="estado-vacio" hidden>No hay mensajes.</p>
          </section>
          <article className="gestion-detalle" id="detalleMensaje" aria-live="polite"></article>
        </div>
      </section>
  )
}

export default PanelMensajes
