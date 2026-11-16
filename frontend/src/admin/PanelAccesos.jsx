import { useState } from 'react'
import { obtenerUsuarios } from '../api.js'
import { formatearFecha } from '../utilidades.js'
import { useCarga } from './contexto.jsx'
import { Filtros, ResumenDatos, iniciales, useAccionesGestion } from './gestion.jsx'

// Quién tiene cuenta: se puede cambiar el rol (admin / cliente) o eliminar a alguien.
function PanelAccesos({ activo }) {
  const carga = useCarga(obtenerUsuarios, 'No se pudieron cargar los accesos', activo)
  const todos = (carga.datos && carga.datos.usuarios) || []
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { cambiar, confirmarYEliminar } = useAccionesGestion(carga.recargar)

  const admins = todos.filter(u => u.rol === 'admin').length
  const buscado = busqueda.trim().toLowerCase()
  const visibles = todos.filter(u => (!filtro || u.rol === filtro) && (!buscado || `${u.nombre} ${u.email}`.toLowerCase().includes(buscado)))

  return (
    <section className="admin-panel gestion-panel" id="panelAccesos" hidden={!activo} aria-label="Accesos">
      <div className="gestion-encabezado">
        <div>
          <h1>Accesos</h1>
          <p>Quién tiene cuenta y qué puede hacer. Solo los administradores entran a este panel.</p>
        </div>
        <ResumenDatos id="resumenAccesos" datos={[
          { valor: admins, texto: 'Administradores' },
          { valor: todos.length - admins, texto: 'Clientes' }
        ]} />
      </div>
      <div className="gestion-barra">
        <label className="gestion-buscar">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <span className="sr-only">Buscar personas</span>
          <input type="search" id="buscarAccesos" placeholder="Buscar por nombre o correo" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </label>
        <Filtros id="filtrosAccesos" etiqueta="Filtrar por rol" opciones={[['', 'Todos'], ['admin', 'Administradores'], ['cliente', 'Clientes']]} lista={todos} campo="rol" actual={filtro} elegir={setFiltro} />
      </div>
      <section className="gestion-tabla" aria-label="Personas con cuenta">
        <div className="gestion-tabla-interior">
          <div className="gestion-tabla-cabecera">
            <span>Persona</span>
            <span>Rol</span>
            <span>Alta</span>
            <span>Acciones</span>
          </div>
          <div id="adminCuerpoAccesos">
            {visibles.map(u => {
              const esAdmin = u.rol === 'admin'
              const nombre = u.nombre || u.email
              return (
                <div className="gestion-fila" key={u.id}>
                  <div className="gestion-persona-info">
                    <div className={'gestion-avatar' + (esAdmin ? ' es-admin' : '')} aria-hidden="true">{iniciales(nombre)}</div>
                    <div className="gestion-persona-datos"><strong>{u.nombre || '-'}{u.esYo && <> <span className="gestion-vos">(vos)</span></>}</strong><span>{u.email}</span></div>
                  </div>
                  <div><span className={'gestion-rol ' + (esAdmin ? 'es-admin' : 'es-cliente')}>{esAdmin ? 'Administrador' : 'Cliente'}</span></div>
                  <div className="gestion-fecha">{formatearFecha(u.fecha)}</div>
                  <div className="gestion-fila-acciones">
                    {u.esYo
                      ? <span className="gestion-nota">No podés cambiar tu propio rol</span>
                      : (
                        <>
                          <button type="button" className={'boton ' + (esAdmin ? 'boton-secundario' : 'boton-secundario resalta')} onClick={() => cambiar('usuarios/' + u.id, { rol: esAdmin ? 'cliente' : 'admin' }, 'Rol actualizado')}>{esAdmin ? 'Pasar a cliente' : 'Hacer admin'}</button>
                          <button type="button" className="boton gestion-eliminar-usuario" aria-label={'Eliminar a ' + nombre} onClick={() => confirmarYEliminar(`¿Eliminar a ${nombre}?`, 'Pierde el acceso y no se puede deshacer.', 'usuarios/' + u.id, 'Usuario eliminado')}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                        </>
                      )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <p id="adminAccesosVacio" className="estado-vacio" hidden={carga.cargando || visibles.length > 0}>No hay usuarios.</p>
      <p className="gestion-pie">Cada cambio de rol queda guardado en el Registro de actividad.</p>
    </section>
  )
}

export default PanelAccesos
