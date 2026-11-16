function PanelAnalitica() {
  return (
      <section className="admin-panel an-panel" id="panelAnalitica" hidden aria-label="Analítica de clientes">
        <header className="an-cabecera">
          <div className="an-cabecera-texto">
            <div className="an-etiqueta" id="anEtiqueta">ANALÍTICA DE CLIENTES · RESUMEN</div>
            <h1 id="anTitulo">Cómo se mueven tus clientes</h1>
          </div>
          <div className="an-periodo" id="anPeriodo" role="group" aria-label="Período">
            <button type="button" data-dias="7" aria-pressed="false">7 días</button>
            <button type="button" data-dias="30" aria-pressed="true">30 días</button>
            <button type="button" data-dias="90" aria-pressed="false">90 días</button>
          </div>
          <button className="an-boton" id="anComparar" type="button" aria-pressed="true">Comparar con el período anterior</button>
          <button className="an-boton an-boton-oscuro" id="anCsv" type="button">Descargar CSV</button>
        </header>
        <div className="an-vistas" id="anVistas" role="tablist" aria-label="Secciones de la analítica">
          <button className="an-vista-tab activa" type="button" role="tab" aria-selected="true" data-vista="resumen">Resumen</button>
          <button className="an-vista-tab" type="button" role="tab" aria-selected="false" data-vista="clientes">Clientes</button>
          <button className="an-vista-tab" type="button" role="tab" aria-selected="false" data-vista="productos">Productos y horarios</button>
        </div>
        <p className="an-nota" id="anNota">Eventos anónimos del sitio: sin IP ni datos personales. Se conservan 90 días.</p>
        <div className="an-vista" id="anResumen">
          <section className="an-kpis" id="anKpis" aria-label="Indicadores"></section>
          <div className="an-fila">
            <section className="an-tarjeta an-grande" aria-labelledby="anTituloEmbudo">
              <div className="an-tarjeta-cabecera">
                <h2 id="anTituloEmbudo">Embudo de compra</h2>
                <span>Cuántos siguen en cada paso y dónde se van</span>
              </div>
              <div className="an-embudo" id="anEmbudo"></div>
              <div className="an-callout an-callout-ambar" id="anPerdida" hidden></div>
            </section>
            <section className="an-tarjeta an-oscura" aria-labelledby="anTituloMirar">
              <div>
                <h2 id="anTituloMirar">Lo que conviene mirar</h2>
                <p>Lectura automática en lenguaje simple, sin tener que interpretar gráficos.</p>
              </div>
              <div className="an-insights" id="anInsights"></div>
              <span className="an-pie">Se calcula con los eventos que ya guarda el sitio.</span>
            </section>
          </div>
          <div className="an-fila">
            <section className="an-tarjeta an-doble" aria-labelledby="anTituloVisitas">
              <div className="an-tarjeta-cabecera">
                <h2 id="anTituloVisitas">Visitas por día</h2>
                <div className="an-leyenda" id="anLeyenda"></div>
              </div>
              <div id="anLinea"></div>
            </section>
            <section className="an-tarjeta" aria-labelledby="anTituloDisp">
              <h2 id="anTituloDisp">Celular y computadora</h2>
              <div className="an-dispositivos" id="anDispositivos"></div>
            </section>
          </div>
        </div>
        <div className="an-vista" id="anClientes" hidden>
          <section className="an-kpis" id="anClientesKpis" aria-label="Resumen de clientes"></section>
          <div className="an-fila an-fila-arriba">
            <section className="an-tarjeta an-lista" aria-labelledby="anTituloClientes">
              <div className="an-lista-cabecera">
                <h2 id="anTituloClientes">Clientes</h2>
                <div className="an-segmentos" id="anSegmentos" role="group" aria-label="Segmento"></div>
              </div>
              <div className="an-tabla-wrap">
                <table className="an-tabla" aria-label="Clientes con pedidos">
                  <thead>
                    <tr>
                      <th scope="col">CLIENTE</th>
                      <th scope="col">PEDIDOS</th>
                      <th scope="col">TOTAL</th>
                      <th scope="col">ÚLTIMA COMPRA</th>
                      <th scope="col">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody id="anCuerpoClientes"></tbody>
                </table>
              </div>
              <p className="estado-vacio" id="anClientesVacio" hidden>No hay clientes en este segmento.</p>
            </section>
            <aside className="an-tarjeta an-ficha" id="anFicha" aria-label="Detalle del cliente"></aside>
          </div>
        </div>
        <div className="an-vista" id="anProductos" hidden>
          <div className="an-fila">
            <section className="an-tarjeta an-grande" aria-labelledby="anTituloProductos">
              <h2 id="anTituloProductos">Productos: interés contra compra</h2>
              <div className="an-leyenda an-leyenda-fila">
                <span>
                  <i className="an-cuadro an-cuadro-claro"></i>Agregados al carrito
                </span>
                <span>
                  <i className="an-cuadro an-cuadro-oscuro"></i>Pedidos
                </span>
              </div>
              <div className="an-productos" id="anListaProductos"></div>
              <div className="an-callout an-callout-ambar" id="anParaMirar" hidden></div>
            </section>
            <section className="an-tarjeta" aria-labelledby="anTituloHorarios">
              <h2 id="anTituloHorarios">Cuándo entran más</h2>
              <div id="anHorarios"></div>
              <div className="an-callout an-callout-arena" id="anPico" hidden></div>
            </section>
          </div>
          <section className="an-tarjeta an-lista" aria-labelledby="anTituloPaginas">
            <div className="an-lista-cabecera">
              <h2 id="anTituloPaginas">Páginas: qué rinde y qué no</h2>
            </div>
            <div className="an-tabla-wrap">
              <table className="an-tabla" aria-label="Rendimiento por página">
                <thead>
                  <tr>
                    <th scope="col">PÁGINA</th>
                    <th scope="col">VISITAS</th>
                    <th scope="col">CLICS EN BOTONES CLAVE</th>
                    <th scope="col">SIGUEN AL PASO SIGUIENTE</th>
                  </tr>
                </thead>
                <tbody id="anCuerpoPaginas"></tbody>
              </table>
            </div>
            <p className="estado-vacio" id="anPaginasVacio" hidden>Todavía no hay visitas registradas en este período.</p>
          </section>
        </div>
      </section>
  )
}

export default PanelAnalitica
