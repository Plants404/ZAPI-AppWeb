// Panel "Pedidos": lista con filtros, detalle y cambio de estado de cada pedido.
import { useCallback, useState } from 'react'
import { cambiarEstadoPedido, obtenerPedidos } from '../api.js'
import { formatearFecha } from '../utilidades.js'
import { formatearPrecio } from '../data/negocio.js'
import { useToasts } from '../estado/toasts.jsx'
import { useAdmin, useCarga } from './contexto.jsx'
import DialogoVentaPresencial from './DialogoVentaPresencial.jsx'

const POR_PAGINA = 20
const FILTROS_VACIOS = { estado: '', canal: '', fechaDesde: '', fechaHasta: '', q: '' }
const TEXTO_ESTADO = { pendiente: 'Pendiente', confirmado: 'Confirmado', entregado: 'Entregado', cancelado: 'Cancelado' }
const SIGUIENTES = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: []
}
const claseEstado = estado => (TEXTO_ESTADO[estado] ? estado : 'neutral')
const textoEstado = estado => TEXTO_ESTADO[estado] || String(estado)

// Botones de página: todos si son pocas; si no, primera, vecinas y última.
function numerosDePagina(actual, total) {
  if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1)
  const numeros = [1]
  if (actual > 3) numeros.push('...')
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i += 1) numeros.push(i)
  if (actual < total - 2) numeros.push('...')
  numeros.push(total)
  return numeros
}

function Paginacion({ pagina, total, cantidad, ir }) {
  const totalPaginas = Math.max(1, total)
  return (
    <div className="admin-paginacion" id="adminPaginacion">
      <span id="adminPaginacionTexto">Página {pagina} de {totalPaginas} ({cantidad} pedidos)</span>
      <button className="admin-pagina-boton" type="button" disabled={pagina <= 1} aria-label="Página anterior" onClick={() => ir(pagina - 1)}>Anterior</button>
      {numerosDePagina(pagina, totalPaginas).map((n, i) => n === '...'
        ? <span className="admin-punto-suspensivo" aria-hidden="true" key={'p' + i}>…</span>
        : <button key={n} className={'admin-pagina-numero' + (n === pagina ? ' admin-pagina-numero--activo' : '')} type="button" aria-label={'Página ' + n} aria-current={n === pagina ? 'true' : undefined} onClick={() => ir(n)}>{n}</button>)}
      <button className="admin-pagina-boton" type="button" disabled={pagina >= totalPaginas} aria-label="Página siguiente" onClick={() => ir(pagina + 1)}>Siguiente</button>
    </div>
  )
}

function PanelPedidos({ activo, busquedaInicial = '' }) {
  const { avisar } = useAdmin()
  const { confirmarToast } = useToasts()
  const inicial = { ...FILTROS_VACIOS, q: busquedaInicial }
  const [form, setForm] = useState(inicial) // lo que hay escrito en los campos
  const [filtros, setFiltros] = useState(inicial) // lo que se aplicó
  const [pagina, setPagina] = useState(1)
  const [ventaAbierta, setVentaAbierta] = useState(false)

  const { datos, cargando, recargar } = useCarga(
    () => obtenerPedidos({ page: pagina, limit: POR_PAGINA, ...filtros }),
    'No se pudieron cargar los pedidos', activo, [pagina, filtros]
  )
  const pedidos = (datos && datos.pedidos) || []
  const total = (datos && datos.total) || 0
  const totalPaginas = Math.max(1, datos ? datos.totalPaginas ?? Math.ceil(total / POR_PAGINA) : 1)

  const cerrarVenta = useCallback(() => setVentaAbierta(false), [])

  const campo = nombre => ({ value: form[nombre], onChange: e => setForm(f => ({ ...f, [nombre]: e.target.value })) })

  function aplicar(evento) {
    evento.preventDefault()
    setFiltros(form)
    setPagina(1)
  }

  function limpiar() {
    setForm(FILTROS_VACIOS)
    setFiltros(FILTROS_VACIOS)
    setPagina(1)
  }

  async function cambiarEstado(pedido, estado) {
    if (!estado || estado === pedido.estado) return
    if (estado === 'cancelado' && !(await confirmarToast(`¿Cancelar el pedido #${pedido.id}?`, 'Se devolverá el stock de los productos al catálogo.', 'Cancelar pedido'))) return
    try {
      await cambiarEstadoPedido(pedido.id, estado)
      avisar('Estado actualizado', `Pedido #${pedido.id} ahora ${textoEstado(estado)}.`)
      recargar()
    } catch (error) {
      avisar('No se pudo cambiar el estado', error.message)
    }
  }

  return (
    <section className="admin-panel" id="panelPedidos" hidden={!activo} aria-label="Pedidos y ventas">
      <div className="admin-panel-cabecera">
        <h1>Pedidos y ventas</h1>
        <p>Listado de pedidos con filtros y paginación.</p>
        <div className="admin-panel-herramientas">
          <button className="boton boton-primario" id="adminVentaPresencial" type="button" onClick={() => setVentaAbierta(true)}>Venta presencial</button>
        </div>
      </div>
      <form className="admin-filtros" id="adminFiltrosPedidos" noValidate onSubmit={aplicar}>
        <div className="admin-filtro">
          <label className="campo-label" htmlFor="filtroEstado">Estado</label>
          <select className="campo-input" id="filtroEstado" {...campo('estado')}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="admin-filtro">
          <label className="campo-label" htmlFor="filtroCanal">Canal</label>
          <select className="campo-input" id="filtroCanal" {...campo('canal')}>
            <option value="">Todos</option>
            <option value="web">Web</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>
        <div className="admin-filtro">
          <label className="campo-label" htmlFor="filtroDesde">Desde</label>
          <input className="campo-input" id="filtroDesde" type="date" {...campo('fechaDesde')} />
        </div>
        <div className="admin-filtro">
          <label className="campo-label" htmlFor="filtroHasta">Hasta</label>
          <input className="campo-input" id="filtroHasta" type="date" {...campo('fechaHasta')} />
        </div>
        <div className="admin-filtro">
          <label className="campo-label" htmlFor="filtroQ">Buscar</label>
          <input className="campo-input" id="filtroQ" type="search" placeholder="ID, cliente o email" {...campo('q')} />
        </div>
        <button className="boton boton-primario" type="submit">Aplicar filtros</button>
        <button className="boton boton-texto" type="button" id="adminLimpiarFiltros" onClick={limpiar}>Limpiar</button>
      </form>
      <div className="admin-tabla-wrap">
        <table className="admin-tabla" id="adminTablaPedidos" aria-label="Pedidos">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col">Canal</th>
              <th scope="col">Cliente</th>
              <th scope="col">Líneas</th>
              <th scope="col">Subtotal</th>
              <th scope="col">Envío</th>
              <th scope="col">Total</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody id="adminCuerpoPedidos">
            {pedidos.map(pedido => {
              const unidades = (pedido.lineas || []).reduce((suma, l) => suma + (l.cantidad || 0), 0)
              return (
                <tr key={pedido.id}>
                  <td>#{pedido.id}</td>
                  <td>{formatearFecha(pedido.fecha)}</td>
                  <td><span className={'admin-badge admin-badge-' + claseEstado(pedido.estado)}>{textoEstado(pedido.estado)}</span></td>
                  <td>{pedido.canal === 'presencial' ? 'Presencial' : 'Web'}</td>
                  <td>{(pedido.cliente && pedido.cliente.nombre) || '-'}</td>
                  <td className="admin-numero">{unidades}</td>
                  <td className="admin-numero">{formatearPrecio(pedido.subtotal)}</td>
                  <td className="admin-numero">{formatearPrecio(pedido.envio)}</td>
                  <td className="admin-numero admin-total">{formatearPrecio(pedido.total)}</td>
                  <td className="admin-acciones">
                    <label className="visually-hidden" htmlFor={'estado-' + pedido.id}>Cambiar estado del pedido #{pedido.id}</label>
                    <select id={'estado-' + pedido.id} className="admin-select-estado" value={pedido.estado} disabled={pedido.estado === 'cancelado'} onChange={e => cambiarEstado(pedido, e.target.value)}>
                      <option value={pedido.estado}>{textoEstado(pedido.estado)}</option>
                      {(SIGUIENTES[pedido.estado] || []).map(op => <option key={op} value={op}>{textoEstado(op)}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p id="adminPedidosVacio" className="estado-vacio" hidden={cargando || pedidos.length > 0}>No se encontraron pedidos.</p>
      </div>
      {pedidos.length > 0 && <Paginacion pagina={Math.min(pagina, totalPaginas)} total={totalPaginas} cantidad={total} ir={setPagina} />}
      {ventaAbierta && <DialogoVentaPresencial alCerrar={cerrarVenta} alCrear={recargar} />}
    </section>
  )
}

export default PanelPedidos
