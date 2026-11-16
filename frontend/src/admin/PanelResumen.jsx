import { obtenerResumen } from '../api.js'
import { formatearPrecio, textoDeStock, claseDeStock } from '../data/negocio.js'
import { useCarga } from './contexto.jsx'

function Tarjetas({ datos }) {
  const tarjetas = [
    { label: 'Ventas', valor: formatearPrecio(datos.ventas), subtitulo: 'Pedidos confirmados y entregados' },
    { label: 'Ticket promedio', valor: formatearPrecio(datos.ticketPromedio), subtitulo: 'Por pedido válido' },
    { label: 'Pedidos por confirmar', valor: datos.pedidosPorConfirmar ?? 0, subtitulo: 'Estado pendiente' },
    { label: 'Conversión', valor: datos.conversion === null ? '—' : (datos.conversion * 100).toFixed(1) + '%', subtitulo: 'Confirmados / visitantes únicos' },
    { label: 'Visitantes únicos', valor: datos.visitantesUnicos ?? 0, subtitulo: 'Próxima entrega: analítica de clientes' },
    { label: 'Productos con stock bajo', valor: Array.isArray(datos.stockBajo) ? datos.stockBajo.length : 0, subtitulo: 'Entre 1 y 3 unidades' }
  ]
  return tarjetas.map(t => (
    <div className="admin-tarjeta" key={t.label}>
      <p className="admin-tarjeta-label">{t.label}</p>
      <p className="admin-tarjeta-valor">{t.valor}</p>
      <p className="admin-tarjeta-sub">{t.subtitulo}</p>
    </div>
  ))
}

// Gráfico de barras: ventas web y presencial por semana.
function Grafico({ semanas }) {
  const altoMax = 130
  const baseY = 170
  const maxValor = Math.max(1, ...semanas.map(s => Number(s.web || 0) + Number(s.presencial || 0)))
  const grupoAncho = (700 - 40) / semanas.length
  return (
    <svg className="admin-grafico" id="adminGraficoSVG" aria-label="Ventas por semana y canal" role="img" viewBox="0 0 720 210">
      {[0, 1, 2, 3, 4].map(i => {
        const y = baseY - (altoMax * i / 4)
        return (
          <g key={i}>
            <line x1="36" y1={y} x2="700" y2={y} className="admin-grafico-linea"></line>
            <text x="28" y={y + 4} className="admin-grafico-eje">{Math.round((maxValor * i) / 4)}</text>
          </g>
        )
      })}
      {semanas.map((semana, indice) => {
        const xCentro = 40 + grupoAncho * (indice + 0.5)
        const web = Number(semana.web || 0)
        const presencial = Number(semana.presencial || 0)
        const alturaWeb = (web / maxValor) * altoMax
        const alturaPre = (presencial / maxValor) * altoMax
        return (
          <g key={semana.semana || indice}>
            <rect x={xCentro - 20} y={baseY - alturaWeb} width="16" height={alturaWeb} className="admin-barra admin-barra-web"><title>{'Web: ' + formatearPrecio(web)}</title></rect>
            <rect x={xCentro + 2} y={baseY - alturaPre} width="16" height={alturaPre} className="admin-barra admin-barra-pre"><title>{'Presencial: ' + formatearPrecio(presencial)}</title></rect>
            <text x={xCentro} y={baseY + 22} className="admin-grafico-etiqueta" textAnchor="middle">{String(semana.semana || '').replace(/.*-W/, 'W')}</text>
          </g>
        )
      })}
    </svg>
  )
}

function PanelResumen({ activo }) {
  const { datos, cargando } = useCarga(obtenerResumen, 'No se pudo cargar el resumen', activo)
  const semanas = datos && datos.ventasPorSemana
  const stockBajo = (datos && datos.stockBajo) || []
  return (
    <section className="admin-panel" id="panelResumen" hidden={!activo} aria-label="Resumen">
      <div className="admin-panel-cabecera">
        <h1>Resumen</h1>
        <p>Datos de solo lectura del panel de administración.</p>
      </div>
      {cargando && !datos && <p className="estado-vacio" role="status">Cargando…</p>}
      <div className="admin-tarjetas" id="adminTarjetas">{datos && <Tarjetas datos={datos} />}</div>
      <div className="admin-bloque">
        <h2>Ventas por semana (últimas 8 semanas)</h2>
        <div className="admin-grafico-wrap">
          {datos && semanas && semanas.length > 0 && <Grafico semanas={semanas} />}
          <p id="adminGraficoVacio" className="estado-vacio" hidden={!datos || (semanas && semanas.length > 0)}>No hay datos de ventas para mostrar.</p>
        </div>
      </div>
      <div className="admin-bloque">
        <h2>Stock bajo (1 a 3 unidades)</h2>
        <div className="admin-tabla-wrap" id="adminStockBajoWrap">
          {stockBajo.length > 0 && (
            <table className="admin-tabla admin-tabla-pequeña">
              <thead>
                <tr><th scope="col">Producto</th><th scope="col">Slug</th><th scope="col">Stock</th><th scope="col">Estado</th></tr>
              </thead>
              <tbody>
                {stockBajo.map(p => (
                  <tr key={p.slug || p.nombre}>
                    <td>{p.nombre}</td>
                    <td>{p.slug}</td>
                    <td className="admin-numero">{p.stock}</td>
                    <td><span className={'stock ' + claseDeStock(p.stock)}>{textoDeStock(p.stock)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p id="adminStockBajoVacio" className="estado-vacio" hidden={!datos || stockBajo.length > 0}>No hay productos con stock bajo.</p>
      </div>
    </section>
  )
}

export default PanelResumen
