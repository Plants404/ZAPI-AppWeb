function DialogoHistorial() {
  return (
      <dialog className="ed-dialogo" id="dialogoHistorial" aria-labelledby="dialogoHistorialTitulo">
        <div className="ed-modal ed-modal-historial" role="document">
          <header className="ed-modal-cabecera">
            <div className="ed-modal-titulo">
              <div className="ed-etiqueta">ESTILO DEL SITIO</div>
              <h2 id="dialogoHistorialTitulo">Historial de versiones</h2>
            </div>
            <button className="ed-cerrar" type="button" data-cerrar-historial="" aria-label="Cerrar">
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
                <tbody id="adminCuerpoHistorial"></tbody>
              </table>
              <p id="adminHistorialVacio" className="estado-vacio" hidden>No hay versiones publicadas.</p>
            </div>
          </div>
        </div>
      </dialog>
  )
}

export default DialogoHistorial
