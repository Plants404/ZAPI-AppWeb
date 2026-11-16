import { useEffect, useRef } from 'react'
import { useBloquearScroll } from '../utilidades.js'

/* Abre y cierra un <dialog> nativo según "abierto" y bloquea el scroll de la página de fondo. */
export function useModal(abierto) {
  const dialogo = useRef(null)
  useBloquearScroll(abierto)
  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (abierto && !el.open) el.showModal()
    if (!abierto && el.open) el.close()
  }, [abierto])
  return dialogo
}

/* Ventana (<dialog>) del panel. Se abre y se cierra según "abierto";
   se cierra con la X, "Cancelar", Esc o un clic afuera de la caja. */
function AdminDialogo({ id, titulo, etiqueta, ancho = false, abierto, alCerrar, acciones, children }) {
  const dialogo = useModal(abierto)

  return (
    <dialog
      className="admin-dialog"
      id={id}
      ref={dialogo}
      aria-labelledby={id + 'Titulo'}
      onCancel={e => { e.preventDefault(); alCerrar() }}
      onClick={e => { if (e.target === dialogo.current) alCerrar() }}
    >
      <div className={'admin-dialog-caja' + (ancho ? ' admin-dialog-ancho' : '')}>
        <button className="admin-dialog-cerrar" type="button" aria-label="Cerrar" onClick={alCerrar}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <span className="etiqueta">{etiqueta}</span>
        <h2 id={id + 'Titulo'}>{titulo}</h2>
        {children}
        {acciones && <div className="admin-dialog-acciones">{acciones}</div>}
      </div>
    </dialog>
  )
}

export default AdminDialogo
