function PaneladminAviso() {
  return (
      <div id="adminAviso" role="status" aria-live="polite" hidden>
        <button className="admin-boton-cerrar-aviso" type="button" data-cerrar-aviso="" aria-label="Cerrar aviso">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <div className="admin-aviso-contenido">
          <strong id="adminAvisoTitulo"></strong>
          <span id="adminAvisoMensaje"></span>
        </div>
      </div>
  )
}

export default PaneladminAviso
