/* Avisos (toasts) del panel de administración: se van solos, y la confirmación espera una respuesta. */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastsContext = createContext(null)

// Si el servidor devolvió una página HTML (error del hosting), se muestra un texto claro en su lugar.
function textoSeguro(mensaje) {
  const texto = String(mensaje || '')
  if (/<\s*(!doctype|html)/i.test(texto)) return 'El servidor no respondió. Probá de nuevo en unos segundos.'
  return texto.length > 140 ? texto.slice(0, 140) + '…' : texto
}

export function ToastsProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const contador = useRef(0)

  const quitar = useCallback(id => setToasts(lista => lista.filter(t => t.id !== id)), [])

  const mostrarToast = useCallback((titulo, mensaje, tipo = 'ok') => {
    contador.current += 1
    const id = contador.current
    setToasts(lista => [...lista, { id, titulo, mensaje: textoSeguro(mensaje), tipo }])
    window.setTimeout(() => quitar(id), tipo === 'error' ? 6000 : 3500)
  }, [quitar])

  // Devuelve una promesa: true si la persona confirma, false si cancela.
  const confirmarToast = useCallback((titulo, mensaje, accion) => new Promise(resolver => {
    contador.current += 1
    setToasts(lista => [...lista, { id: contador.current, titulo, mensaje, accion, confirmar: true, resolver }])
  }), [])

  const responder = (toast, respuesta) => {
    quitar(toast.id)
    toast.resolver(respuesta)
  }

  const valor = useMemo(() => ({ mostrarToast, confirmarToast }), [mostrarToast, confirmarToast])

  return (
    <ToastsContext.Provider value={valor}>
      {children}
      <div id="adminToasts" className="admin-toasts" role="status" aria-live="polite">
        {toasts.map(t => t.confirmar
          ? (
            <div key={t.id} className="admin-toast admin-toast-peligro" role="alertdialog" aria-label={t.titulo} onKeyDown={e => { if (e.key === 'Escape') responder(t, false) }}>
              <div><strong>{t.titulo}</strong><span>{t.mensaje}</span></div>
              <div className="admin-toast-botones">
                <button type="button" className="admin-toast-cancelar" autoFocus onClick={() => responder(t, false)}>Cancelar</button>
                <button type="button" className="admin-toast-confirmar" onClick={() => responder(t, true)}>{t.accion}</button>
              </div>
            </div>
          )
          : (
            <div key={t.id} className={`admin-toast admin-toast-${t.tipo}`}>
              <span className="material-symbols-outlined" aria-hidden="true">{t.tipo === 'error' ? 'error' : 'check_circle'}</span>
              <div><strong>{t.titulo}</strong>{t.mensaje && <span>{t.mensaje}</span>}</div>
            </div>
          ))}
      </div>
    </ToastsContext.Provider>
  )
}

export function useToasts() {
  const contexto = useContext(ToastsContext)
  if (!contexto) throw new Error('useToasts debe usarse dentro de <ToastsProvider>')
  return contexto
}
