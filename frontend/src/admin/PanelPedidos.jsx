function PanelPedidos() {
  return (
      <section className="admin-panel" id="panelPedidos" hidden aria-label="Pedidos y ventas">
        <div className="admin-panel-cabecera">
          <h1>Pedidos y ventas</h1>
          <p>Listado de pedidos con filtros y paginación.</p>
          <div className="admin-panel-herramientas">
            <button className="boton boton-primario" id="adminVentaPresencial" type="button">Venta presencial</button>
          </div>
        </div>
        <form className="admin-filtros" id="adminFiltrosPedidos" noValidate>
          <div className="admin-filtro">
            <label className="campo-label" htmlFor="filtroEstado">Estado</label>
            <select className="campo-input" id="filtroEstado">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="admin-filtro">
            <label className="campo-label" htmlFor="filtroCanal">Canal</label>
            <select className="campo-input" id="filtroCanal">
              <option value="">Todos</option>
              <option value="web">Web</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>
          <div className="admin-filtro">
            <label className="campo-label" htmlFor="filtroDesde">Desde</label>
            <input className="campo-input" id="filtroDesde" type="date" />
          </div>
          <div className="admin-filtro">
            <label className="campo-label" htmlFor="filtroHasta">Hasta</label>
            <input className="campo-input" id="filtroHasta" type="date" />
          </div>
          <div className="admin-filtro">
            <label className="campo-label" htmlFor="filtroQ">Buscar</label>
            <input className="campo-input" id="filtroQ" type="search" placeholder="ID, cliente o email" />
          </div>
          <button className="boton boton-primario" type="submit">Aplicar filtros</button>
          <button className="boton boton-texto" type="button" id="adminLimpiarFiltros">Limpiar</button>
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
            <tbody id="adminCuerpoPedidos"></tbody>
          </table>
          <p id="adminPedidosVacio" className="estado-vacio" hidden>No se encontraron pedidos.</p>
        </div>
        <div className="admin-paginacion" id="adminPaginacion" hidden></div>
      </section>
  )
}

export default PanelPedidos
