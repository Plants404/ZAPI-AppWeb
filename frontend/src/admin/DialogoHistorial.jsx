import { obtenerHistorial, restaurarVersionApi } from '../api.js'
import { formatearFecha } from '../utilidades.js'
import { useAdmin, useCarga } from './contexto.jsx'
import { useModal } from './AdminDialogo.jsx'

// Últimas versiones publicadas; "Restaurar" carga una como borrador nuevo (sin tocar lo publicado).
// El panel lo monta solo mientras está abierto, así siempre pide la lista al día.
function DialogoHistorial({ alCerrar, alRestaurar }) {
  const { avisar } = useAdmin()
  const dialogo = useModal(true)
  const { datos, cargando } = useCarga(obtenerHistorial, 'No se pudo cargar el historial')
  const entradas = (datos && datos.historial) || []

  async function restaurar(version) {
    if (!window.confirm(`¿Restaurar la versión ${version} como borrador nuevo?`)) return
    try {
      await restaurarVersionApi(version)
      alCerrar()
      avisar('Versión restaurada', 'La versión se cargó como borrador. Revisala y publicá si te gusta.')
      alRestaurar()
    } catch (error) {
      avisar('No se pudo restaurar la versión', error.message)
    }
  }

  return (
    <dialog className="ed-dialogo" id="dialogoHistorial" ref={dialogo} aria-labelledby="dialogoHistorialTitulo" onCancel={e => { e.preventDefault(); alCerrar() }}>
      <div className="ed-modal ed-modal-historial" role="document">
        <header className="ed-modal-cabecera">
          <div className="ed-modal-titulo">
            <div className="ed-etiqueta">ESTILO DEL SITIO</div>
            <h2 id="dialogoHistorialTitulo">Historial de versiones</h2>
          </div>
          <button className="ed-cerrar" type="button" aria-label="Cerrar" onClick={alCerrar}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        <div className="ed-historial-cuerpo">
          <p className="ed-ayuda">Últimas 20 versiones publicadas. Restaurar carga la versión como borrador, sin tocar lo publicado.</p>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla" id="adminTablaHistorial" aria-label="Historial de publicaciones">
              <thead>
                <tr>
                  <th scope="col">Versión</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Productos</th>
                  <th scope="col">Título</th>
                  <th scope="col">Colores</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody id="adminCuerpoHistorial">
                {entradas.map(e => {
                  const colores = e.estilo && e.estilo.colores ? e.estilo.colores : {}
                  return (
                    <tr key={e.version}>
                      <td>{e.version}</td>
                      <td>{formatearFecha(e.fecha)}</td>
                      <td>{(e.usuario && e.usuario.nombre) || (e.usuario && e.usuario.email) || '-'}</td>
                      <td className="admin-numero">{e.productos}</td>
                      <td>{(e.estilo && e.estilo.titulo) || '-'}</td>
                      <td>{[colores.primario, colores.secundario, colores.acento].filter(Boolean).map(c => <span className="admin-color-muestra" style={{ background: c }} title={c} key={c}></span>)}</td>
                      <td className="admin-acciones"><button className="boton boton-texto admin-restaurar-version" type="button" onClick={() => restaurar(e.version)}>Restaurar</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p id="adminHistorialVacio" className="estado-vacio" hidden={cargando || entradas.length > 0}>No hay versiones publicadas.</p>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export default DialogoHistorial
