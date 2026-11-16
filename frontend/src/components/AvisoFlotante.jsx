import { useAviso } from '../estado/aviso.jsx'

// Cartelito que aparece abajo unos segundos ("Agregado al carrito").
function AvisoFlotante() {
  const { aviso, cerrarAviso } = useAviso()
  return (
    <div className="aviso-flotante" id="avisoFlotante" role="status" aria-live="polite" hidden={!aviso}>
      <span className="material-symbols-outlined aviso-icono" aria-hidden="true">eco</span>
      <div className="aviso-texto">
        <strong id="avisoFlotanteTitulo">{aviso?.titulo}</strong>
        <span id="avisoFlotanteMensaje">{aviso?.mensaje}</span>
      </div>
      <button className="icono-boton" id="avisoFlotanteCerrar" type="button" aria-label="Cerrar aviso" onClick={cerrarAviso}>
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  )
}

export default AvisoFlotante
