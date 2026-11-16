function AvisoFlotante() {
  return (
      <div className="aviso-flotante" id="avisoFlotante" role="status" aria-live="polite" hidden>
        <span className="material-symbols-outlined aviso-icono" aria-hidden="true">eco</span>
        <div className="aviso-texto">
          <strong id="avisoFlotanteTitulo"></strong>
          <span id="avisoFlotanteMensaje"></span>
        </div>
        <button className="icono-boton" id="avisoFlotanteCerrar" type="button" aria-label="Cerrar aviso">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
  )
}

export default AvisoFlotante
