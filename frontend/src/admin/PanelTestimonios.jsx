import { useState } from 'react'
import { formatearFecha } from '../utilidades.js'
import { Filtros, ResumenDatos, iniciales, useAccionesGestion } from './gestion.jsx'

const ETIQUETAS = { pending: 'Pendiente', approved: 'Publicado', rejected: 'Rechazado' }
const CLASE_ESTADO = { pending: 'pendiente', approved: 'confirmado', rejected: 'cancelado' }

function Tarjeta({ t, cambiar, confirmarYEliminar }) {
  const estrellas = Math.max(0, Math.min(5, Number(t.estrellas) || 0))
  const ruta = 'testimonios/' + t.id
  const poner = estado => cambiar(ruta, { estado }, 'Testimonio actualizado')
  return (
    <article className={'gestion-tarjeta gestion-opinion gestion-opinion-' + t.estado}>
      <div className="gestion-autor">
        <div className="gestion-avatar" aria-hidden="true">{iniciales(t.autor)}</div>
        <div><strong>{t.autor}</strong><span>{t.lugar ? `${t.lugar} · ` : ''}{formatearFecha(t.fecha)}</span></div>
        <span className={'admin-badge admin-badge-' + (CLASE_ESTADO[t.estado] || 'pendiente')}>{ETIQUETAS[t.estado] || t.estado}</span>
      </div>
      <span className="gestion-estrellas" role="img" aria-label={`${estrellas} de 5 estrellas`}>{'★'.repeat(estrellas)}<span className="gestion-estrellas-vacias">{'★'.repeat(5 - estrellas)}</span></span>
      <p className="gestion-cita">“{t.texto}”</p>
      <div className="gestion-acciones">
        {t.estado === 'approved'
          ? <button type="button" className="boton boton-secundario" onClick={() => poner('pending')}>Quitar del sitio</button>
          : (
            <>
              <button type="button" className="boton boton-primario" onClick={() => poner('approved')}>Aprobar y publicar</button>
              {t.estado !== 'rejected' && <button type="button" className="boton boton-secundario gestion-rechazar" onClick={() => poner('rejected')}>Rechazar</button>}
            </>
          )}
        <button type="button" className="boton boton-texto gestion-eliminar" onClick={() => confirmarYEliminar('¿Eliminar este testimonio?', `Testimonio de ${t.autor} · no se puede deshacer.`, ruta, 'Testimonio eliminado')}><span className="material-symbols-outlined" aria-hidden="true">delete</span> Eliminar</button>
      </div>
    </article>
  )
}

// Revisión de opiniones: se aprueban (se publican en el sitio), se rechazan o se borran.
function PanelTestimonios({ activo, carga }) {
  const todos = (carga.datos && carga.datos.testimonios) || []
  const [filtro, setFiltro] = useState('pending')
  const { cambiar, confirmarYEliminar } = useAccionesGestion(carga.recargar)

  const pendientes = todos.filter(t => t.estado === 'pending').length
  const publicados = todos.filter(t => t.estado === 'approved').length
  const conEstrellas = todos.filter(t => Number(t.estrellas) > 0)
  const promedio = conEstrellas.length
    ? (conEstrellas.reduce((suma, t) => suma + Number(t.estrellas), 0) / conEstrellas.length).toFixed(1).replace('.', ',')
    : '–'
  const visibles = todos.filter(t => !filtro || t.estado === filtro)

  return (
    <section className="admin-panel gestion-panel" id="panelTestimonios" hidden={!activo} aria-label="Testimonios">
      <div className="gestion-encabezado">
        <div>
          <h1>Testimonios</h1>
          <p>Revisá lo que escriben tus clientes y elegí qué se muestra en el sitio.</p>
        </div>
        <ResumenDatos id="resumenTestimonios" datos={[
          { valor: pendientes, texto: 'Por revisar', alerta: pendientes > 0 },
          { valor: publicados, texto: 'Publicados en el sitio' },
          { valor: promedio, texto: 'Promedio de estrellas' }
        ]} />
      </div>
      <Filtros id="filtrosTestimonios" etiqueta="Filtrar por estado" opciones={[['pending', 'Pendientes'], ['approved', 'Aprobados'], ['rejected', 'Rechazados'], ['', 'Todos']]} lista={todos} campo="estado" actual={filtro} elegir={setFiltro} />
      <div className="gestion-grilla" id="adminCuerpoTestimonios">
        {visibles.map(t => <Tarjeta key={t.id} t={t} cambiar={cambiar} confirmarYEliminar={confirmarYEliminar} />)}
      </div>
      <p id="adminTestimoniosVacio" className="estado-vacio" hidden={carga.cargando || visibles.length > 0}>No hay testimonios.</p>
    </section>
  )
}

export default PanelTestimonios
