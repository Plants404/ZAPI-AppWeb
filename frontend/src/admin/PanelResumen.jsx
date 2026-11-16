function PanelResumen({ activo }) {
  return (
      <section className="admin-panel" id="panelResumen" hidden={!activo} aria-label="Resumen">
        <div className="admin-panel-cabecera">
          <h1>Resumen</h1>
          <p>Datos de solo lectura del panel de administración.</p>
        </div>
        <div className="admin-tarjetas" id="adminTarjetas"></div>
        <div className="admin-bloque">
          <h2>Ventas por semana (últimas 8 semanas)</h2>
          <div className="admin-grafico-wrap">
            <svg className="admin-grafico" id="adminGraficoSVG" aria-label="Ventas por semana y canal" role="img"></svg>
            <p id="adminGraficoVacio" className="estado-vacio" hidden>No hay datos de ventas para mostrar.</p>
          </div>
        </div>
        <div className="admin-bloque">
          <h2>Stock bajo (1 a 3 unidades)</h2>
          <div className="admin-tabla-wrap" id="adminStockBajoWrap"></div>
          <p id="adminStockBajoVacio" className="estado-vacio" hidden>No hay productos con stock bajo.</p>
        </div>
      </section>
  )
}

export default PanelResumen
