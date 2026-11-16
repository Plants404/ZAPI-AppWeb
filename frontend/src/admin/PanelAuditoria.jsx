function PanelAuditoria({ activo }) {
  return (
      <section className="admin-panel" id="panelAuditoria" hidden={!activo} aria-label="Registro de actividad">
        <div className="admin-panel-cabecera">
          <h1>Registro de actividad</h1>
          <p>Historial de acciones de administración (últimas 20 entradas).</p>
        </div>
        <div className="admin-tabla-wrap">
          <table className="admin-tabla" id="adminTablaAuditoria" aria-label="Auditoría">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Usuario</th>
                <th scope="col">Acción</th>
                <th scope="col">Resumen</th>
              </tr>
            </thead>
            <tbody id="adminCuerpoAuditoria"></tbody>
          </table>
          <p id="adminAuditoriaVacio" className="estado-vacio" hidden>No hay cambios registrados.</p>
        </div>
      </section>
  )
}

export default PanelAuditoria
