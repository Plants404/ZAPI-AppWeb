// Panel "Auditoría": registro de las acciones hechas en el panel.
import { obtenerAuditoria } from '../api.js'
import { formatearFecha } from '../utilidades.js'
import { useCarga } from './contexto.jsx'

function claseDeAccion(accion) {
  const texto = String(accion || '').toLowerCase()
  if (texto.includes('crear') || texto.includes('alta') || texto.includes('nuevo')) return 'creado'
  if (texto.includes('actualizar') || texto.includes('editar') || texto.includes('modificar')) return 'actualizado'
  if (texto.includes('eliminar') || texto.includes('borrar') || texto.includes('cancelar')) return 'eliminado'
  return 'neutral'
}

function PanelAuditoria({ activo }) {
  const { datos, cargando } = useCarga(obtenerAuditoria, 'No se pudo cargar el historial', activo)
  const entradas = (datos && datos.auditoria) || []
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
          <tbody id="adminCuerpoAuditoria">
            {entradas.map((e, i) => (
              <tr key={e.fecha + i}>
                <td>{formatearFecha(e.fecha)}</td>
                <td>{e.usuario || e.email || '-'}</td>
                <td><span className={'admin-badge admin-badge-' + claseDeAccion(e.accion)}>{e.accion}</span></td>
                <td>{e.resumen || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p id="adminAuditoriaVacio" className="estado-vacio" hidden={cargando || entradas.length > 0}>No hay cambios registrados.</p>
      </div>
    </section>
  )
}

export default PanelAuditoria
