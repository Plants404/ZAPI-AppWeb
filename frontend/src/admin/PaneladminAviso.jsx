function PaneladminAviso({ aviso, cerrar }) {
  return (
      <div id="adminAviso" role="status" aria-live="polite" hidden={!aviso}>
        <button className="admin-boton-cerrar-aviso" type="button" aria-label="Cerrar aviso" onClick={cerrar}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <div className="admin-aviso-contenido">
          <strong id="adminAvisoTitulo">{aviso?.titulo}</strong>
          <span id="adminAvisoMensaje">{aviso?.mensaje}</span>
        </div>
      </div>
  )
}

export default PaneladminAviso
