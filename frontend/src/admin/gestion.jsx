/* Piezas que comparten Mensajes, Testimonios y Accesos. */
import { cambiarGestion, eliminarGestion } from '../api.js'
import { useToasts } from '../estado/toasts.jsx'

export function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase() || '?'
}

export function enlaceWhatsApp(telefono) {
  let digitos = String(telefono || '').replace(/\D/g, '')
  if (!digitos) return ''
  if (digitos.startsWith('0')) digitos = '598' + digitos.slice(1)
  return 'https://wa.me/' + digitos
}

export function fechaCorta(fecha) {
  const f = new Date(fecha)
  if (f.toDateString() === new Date().toDateString()) return 'Hoy ' + f.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
  return f.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
}

// Números grandes de arriba: [{ valor, texto, alerta }]
export function ResumenDatos({ id, datos }) {
  return (
    <div className="gestion-resumen" id={id}>
      {datos.map(d => (
        <div className="gestion-dato" key={d.texto}>
          <strong className={'gestion-dato-valor' + (d.alerta ? ' gestion-dato-alerta' : '')}>{d.valor}</strong>
          <span>{d.texto}</span>
        </div>
      ))}
    </div>
  )
}

// Botones de filtro con su cantidad. opciones = [[valor, texto], ...]
export function Filtros({ id, etiqueta, opciones, lista, campo, actual, elegir }) {
  return (
    <div className="gestion-filtros" id={id} role="group" aria-label={etiqueta}>
      {opciones.map(([valor, texto]) => {
        const cantidad = valor ? lista.filter(item => item[campo] === valor).length : lista.length
        return (
          <button key={valor || 'todos'} type="button" className={'gestion-chip' + (valor === actual ? ' activo' : '')} aria-pressed={valor === actual} onClick={() => elegir(valor)}>
            {texto} {cantidad}
          </button>
        )
      })}
    </div>
  )
}

/* Guardar un cambio o borrar algo, avisando con un toast y recargando la lista.
   Igual que el panel viejo: si falla, el toast lo cuenta y la lista se recarga igual. */
export function useAccionesGestion(recargar) {
  const { mostrarToast, confirmarToast } = useToasts()

  async function cambiar(ruta, cuerpo, titulo) {
    try {
      await cambiarGestion(ruta, cuerpo)
      mostrarToast(titulo, 'El cambio se guardó correctamente.')
    } catch (error) {
      mostrarToast('No se pudo guardar', error.message, 'error')
    }
    recargar()
  }

  async function eliminar(ruta, titulo) {
    try {
      await eliminarGestion(ruta)
      mostrarToast(titulo, 'Se eliminó correctamente.')
    } catch (error) {
      mostrarToast('No se pudo eliminar', error.message, 'error')
    }
    recargar()
  }

  // Pregunta con un toast y, si se confirma, borra.
  async function confirmarYEliminar(pregunta, detalle, ruta, titulo) {
    if (await confirmarToast(pregunta, detalle, 'Eliminar')) eliminar(ruta, titulo)
  }

  return { cambiar, confirmarYEliminar }
}
