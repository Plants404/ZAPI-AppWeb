import { useState } from 'react'
import { formatearFecha } from '../utilidades.js'
import { Filtros, ResumenDatos, enlaceWhatsApp, fechaCorta, iniciales, useAccionesGestion } from './gestion.jsx'

const ETIQUETAS = { new: 'Nuevo', read: 'Leído', answered: 'Respondido' }
const CLASE_ESTADO = { new: 'pendiente', read: 'entregado', answered: 'confirmado' }

function Detalle({ m, cambiar, confirmarYEliminar }) {
  if (!m) return <p className="estado-vacio">Elegí un mensaje de la lista para leerlo.</p>
  const whatsapp = enlaceWhatsApp(m.telefono)
  const asunto = encodeURIComponent('Re: ' + (m.asunto || 'Tu consulta a ZAPI'))
  const ruta = 'mensajes/' + m.id
  return (
    <>
      <div className="gestion-detalle-cabecera">
        <div className="gestion-avatar grande" aria-hidden="true">{iniciales(m.nombre)}</div>
        <div>
          <h2>{m.asunto || 'Sin asunto'}</h2>
          <p className="gestion-meta">{m.nombre} · <a href={'mailto:' + m.email}>{m.email}</a>{m.telefono ? ` · ${m.telefono}` : ''}</p>
        </div>
        <span className={'admin-badge admin-badge-' + (CLASE_ESTADO[m.estado] || 'pendiente')}>{ETIQUETAS[m.estado] || m.estado}</span>
      </div>
      <p className="gestion-meta">Recibido el {formatearFecha(m.fecha)} · desde el formulario de contacto</p>
      <p className="gestion-texto">{m.mensaje}</p>
      <div className="gestion-acciones">
        <a className="boton boton-primario" href={`mailto:${m.email}?subject=${asunto}`}><span className="material-symbols-outlined" aria-hidden="true">mail</span> Responder por correo</a>
        {whatsapp && <a className="boton boton-secundario" href={whatsapp} target="_blank" rel="noopener"><span className="material-symbols-outlined" aria-hidden="true">chat</span> Escribir por WhatsApp</a>}
        {m.estado !== 'answered' && <button type="button" className="boton boton-secundario" onClick={() => cambiar(ruta, { estado: 'answered' }, 'Mensaje actualizado')}><span className="material-symbols-outlined" aria-hidden="true">check</span> Marcar como respondido</button>}
        {m.estado === 'new' && <button type="button" className="boton boton-texto" onClick={() => cambiar(ruta, { estado: 'read' }, 'Mensaje actualizado')}>Marcar como leído</button>}
        <button type="button" className="boton boton-texto gestion-eliminar" onClick={() => confirmarYEliminar('¿Eliminar este mensaje?', `Mensaje de ${m.nombre} · no se puede deshacer.`, ruta, 'Mensaje eliminado')}><span className="material-symbols-outlined" aria-hidden="true">delete</span> Eliminar</button>
      </div>
      <p className="gestion-pie">Al responder, el estado pasa a «Respondido».</p>
    </>
  )
}

// Bandeja de mensajes: lista a la izquierda, detalle a la derecha. "carga" viene del panel (también alimenta la insignia del menú).
function PanelMensajes({ activo, carga }) {
  const todos = (carga.datos && carga.datos.mensajes) || []
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState('')
  const { cambiar, confirmarYEliminar } = useAccionesGestion(carga.recargar)

  const nuevos = todos.filter(m => m.estado === 'new').length
  const sinResponder = todos.filter(m => m.estado !== 'answered').length
  const buscado = busqueda.trim().toLowerCase()
  const visibles = todos.filter(m => (!filtro || m.estado === filtro) && (!buscado || `${m.nombre} ${m.asunto} ${m.email}`.toLowerCase().includes(buscado)))
  // Si el elegido ya no está a la vista, se muestra el primero.
  const activoId = visibles.some(m => m.id === elegido) ? elegido : (visibles[0] ? visibles[0].id : '')

  return (
    <section className="admin-panel gestion-panel" id="panelMensajes" hidden={!activo} aria-label="Mensajes">
      <div className="gestion-encabezado">
        <div>
          <h1>Mensajes</h1>
          <p>Consultas que llegan desde el formulario de contacto.</p>
        </div>
        <ResumenDatos id="resumenMensajes" datos={[
          { valor: nuevos, texto: 'Nuevos', alerta: nuevos > 0 },
          { valor: sinResponder, texto: 'Sin responder' },
          { valor: todos.length, texto: 'Total' }
        ]} />
      </div>
      <div className="gestion-bandeja">
        <section className="gestion-bandeja-lista" aria-label="Lista de mensajes">
          <div className="gestion-bandeja-herramientas">
            <label className="gestion-buscar">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <span className="sr-only">Buscar mensajes</span>
              <input type="search" id="buscarMensajes" placeholder="Buscar por nombre o asunto" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </label>
            <Filtros id="filtrosMensajes" etiqueta="Filtrar por estado" opciones={[['', 'Todos'], ['new', 'Nuevos'], ['read', 'Leídos'], ['answered', 'Respondidos']]} lista={todos} campo="estado" actual={filtro} elegir={setFiltro} />
          </div>
          <div id="adminCuerpoMensajes">
            {visibles.map(m => (
              <button key={m.id} type="button" className={'gestion-item' + (m.id === activoId ? ' activo' : '')} aria-current={m.id === activoId} onClick={() => setElegido(m.id)}>
                <span className={'gestion-avatar' + (m.estado === 'new' ? ' es-nuevo' : '')} aria-hidden="true">{iniciales(m.nombre)}</span>
                <span className="gestion-item-texto">
                  <span className="gestion-item-linea"><strong>{m.nombre}</strong><span>{fechaCorta(m.fecha)}</span></span>
                  <span className={'gestion-item-asunto' + (m.estado === 'new' ? ' es-nuevo' : '')}>{m.asunto || 'Sin asunto'}</span>
                  <span className="gestion-item-vista">{m.mensaje}</span>
                </span>
                {m.estado === 'new' && <span className="gestion-punto" aria-label="Nuevo"></span>}
                {m.estado === 'answered' && <span className="gestion-mini-estado">Respondido</span>}
              </button>
            ))}
          </div>
          <p id="adminMensajesVacio" className="estado-vacio" hidden={carga.cargando || visibles.length > 0}>No hay mensajes.</p>
        </section>
        <article className="gestion-detalle" id="detalleMensaje" aria-live="polite">
          <Detalle m={visibles.find(m => m.id === activoId)} cambiar={cambiar} confirmarYEliminar={confirmarYEliminar} />
        </article>
      </div>
    </section>
  )
}

export default PanelMensajes
