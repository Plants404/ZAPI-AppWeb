import { useState } from 'react'
import { obtenerAnalitica, obtenerClientes } from '../api.js'
import { formatearPrecio } from '../data/negocio.js'
import { useAdmin, useCarga } from './contexto.jsx'

const TEXTOS = {
  resumen: { etiqueta: 'RESUMEN', titulo: 'Cómo se mueven tus clientes' },
  clientes: { etiqueta: 'CLIENTES', titulo: 'Quiénes compran y cuándo vuelven' },
  productos: { etiqueta: 'PRODUCTOS Y HORARIOS', titulo: 'Qué interesa y cuándo conviene estar' }
}
const NOMBRES_PAGINA = {
  '/': 'Inicio', '/catalogo': 'Catálogo', '/carrito': 'Carrito', '/servicios': 'Servicios',
  '/nosotros': 'Nosotros', '/contacto': 'Contacto', '/pedidos': 'Mis pedidos', '/login': 'Ingreso', '/privacidad': 'Privacidad'
}
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']
const COLORES_CALOR = ['#eef3ef', '#bcd3c4', '#6f9c80', '#2f5a43', '#1f3a2e']
const ETIQUETAS_ESTADO_CLIENTE = { recurrente: 'Recurrente', nuevo: 'Nuevo', inactivo: 'Hace tiempo que no vuelve' }

const numero = valor => new Intl.NumberFormat('es-UY').format(Number(valor) || 0)
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

function hacePalabra(dias) {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

function textoDesde(dias) {
  if (dias >= 60) return `hace ${Math.round(dias / 30)} meses`
  if (dias >= 30) return 'hace 1 mes'
  return `hace ${Math.max(dias, 1)} ${dias === 1 ? 'día' : 'días'}`
}

function nombreDePagina(ruta) {
  if (NOMBRES_PAGINA[ruta]) return NOMBRES_PAGINA[ruta]
  if (ruta.startsWith('/producto-')) return `Ficha: ${ruta.slice(10).replace(/-/g, ' ')}`
  return ruta
}

// Cuánto cambió respecto del período anterior (con su color).
function textoDelta(comparar, actual, previo) {
  if (!comparar) return { texto: '', color: '' }
  if (!previo) return { texto: 'Sin datos del período anterior', color: '#5b6b60' }
  const cambio = Math.round(((actual - previo) / previo) * 100)
  if (cambio === 0) return { texto: 'Igual que el período anterior', color: '#5b6b60' }
  return cambio > 0
    ? { texto: `▲ ${cambio} % vs. anterior`, color: '#1f5a3a' }
    : { texto: `▼ ${Math.abs(cambio)} % vs. anterior`, color: '#8a5a12' }
}

function Sparkline({ serie, color, etiqueta }) {
  const maximo = Math.max(...serie, 1)
  const n = serie.length
  const puntos = serie.map((valor, i) => `${n > 1 ? 2 + (i / (n - 1)) * 86 : 45} ${26 - (valor / maximo) * 22}`)
  return (
    <svg width="90" height="28" viewBox="0 0 90 28" role="img" aria-label={etiqueta}>
      <path d={'M' + puntos.join(' L')} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Kpi({ titulo, valor, delta, sparkline }) {
  return (
    <article className="an-kpi">
      <span className="an-kpi-titulo">{titulo}</span>
      <div className="an-kpi-valor">{valor}</div>
      <div className="an-kpi-pie"><span style={{ color: delta.color }}>{delta.texto}</span>{sparkline}</div>
    </article>
  )
}

function celdasPico(horarios, cantidad) {
  const celdas = []
  horarios.forEach((fila, dia) => fila.forEach((valor, bloque) => { if (valor > 0) celdas.push({ dia, bloque, valor }) }))
  return celdas.sort((x, y) => y.valor - x.valor).slice(0, cantidad)
}

function franjaDelDia(bloque) {
  const hora = 8 + bloque * 2
  return hora < 12 ? 'a la mañana' : hora < 19 ? 'a la tarde' : 'a la noche'
}

/* ----- Resumen ----- */

function Embudo({ datos }) {
  const [visitas, carrito, pedidos, whatsapp] = datos.embudo.map(paso => paso.valor)
  if (visitas === 0) return <><div className="an-embudo" id="anEmbudo"><p className="estado-vacio">No hay eventos de embudo registrados en este período.</p></div></>
  const pasos = [
    { texto: 'Entraron al sitio', valor: visitas, color: '#1f3a2e', minimo: 0 },
    { texto: 'Agregaron al carrito', valor: carrito, color: '#3d6b4f', minimo: 70 },
    { texto: 'Iniciaron el pedido', valor: pedidos, color: '#4a7c59', minimo: 60 },
    { texto: 'Escribieron por WhatsApp', valor: whatsapp, color: '#b7791f', minimo: 56 }
  ]
  const caeCarrito = 1 - carrito / visitas
  const caePedido = carrito ? 1 - pedidos / carrito : 0
  return (
    <>
      <div className="an-embudo" id="anEmbudo">
        {pasos.map(paso => {
          const pct = porcentaje(paso.valor, visitas)
          return (
            <div className="an-paso" key={paso.texto}>
              <span className="an-paso-nombre">{paso.texto}</span>
              <div className="an-paso-pista"><div className="an-paso-barra" style={{ width: Math.min(pct, 100) + '%', minWidth: paso.minimo + 'px', background: paso.color }}>{numero(paso.valor)}</div></div>
              <span className="an-paso-pct">{pct} %</span>
            </div>
          )
        })}
      </div>
      <div className="an-callout an-callout-ambar" id="anPerdida">
        <strong>Mayor pérdida:</strong>
        <span>{caeCarrito >= caePedido
          ? `de cada 100 personas que miran, ${Math.round(caeCarrito * 100)} no agregan nada al carrito. Ahí está el margen más grande.`
          : `de cada 100 personas que agregan al carrito, ${Math.round(caePedido * 100)} no inician el pedido. Ahí está el margen más grande.`}</span>
      </div>
    </>
  )
}

function conclusiones(datos) {
  const lista = []
  const { movil, computadora } = datos.dispositivos
  if (movil.sesiones && computadora.sesiones) {
    const [mayor, menor, nMayor, nMenor] = movil.sesiones >= computadora.sesiones
      ? [movil, computadora, 'celular', 'computadora'] : [computadora, movil, 'computadora', 'celular']
    const texto = `${mayor.porcentaje} % de las entradas, ${mayor.conversion} % de pedidos contra ${menor.conversion} % en ${nMenor}.`
    lista.push(mayor.conversion < menor.conversion
      ? { titulo: `El ${nMayor} trae más visitas, pero convierte menos.`, texto }
      : { titulo: `El ${nMayor} trae más visitas y convierte igual o mejor.`, texto })
  }
  const pico = celdasPico(datos.horarios, 1)[0]
  if (pico) lista.push({ titulo: `Los ${DIAS_PLURAL[pico.dia]} ${franjaDelDia(pico.bloque)} es el mejor momento.`, texto: 'Conviene tener stock y responder rápido en ese horario.' })
  const { actual, previo } = datos.indicadores
  if (previo.pedidos) {
    const cambio = Math.round(((actual.pedidos - previo.pedidos) / previo.pedidos) * 100)
    if (cambio < 0) lista.push({ titulo: `Pedidos iniciados bajó ${Math.abs(cambio)} %.`, texto: 'Revisá si el paso de confirmar pedido se entiende bien.' })
    else if (cambio > 0) lista.push({ titulo: `Pedidos iniciados subió ${cambio} %.`, texto: 'Lo que cambiaste en el período está funcionando.' })
    else lista.push({ titulo: 'Pedidos iniciados se mantiene estable.', texto: 'Igual que en el período anterior.' })
  }
  return lista
}

function LineaVisitas({ datos, comparar }) {
  const actual = datos.serie.visitas
  const previa = datos.serie.visitasPrevias
  const hayPrevia = comparar && previa.some(valor => valor > 0)
  const maximo = Math.max(...actual, ...(hayPrevia ? previa : [0]), 1)
  const trazo = serie => {
    const n = serie.length
    return 'M' + serie.map((valor, i) => `${n > 1 ? (i / (n - 1)) * 640 : 320} ${190 - (valor / maximo) * 170}`).join(' L')
  }
  return (
    <>
      <div className="an-leyenda" id="anLeyenda">
        <span><i className="an-linea-solida"></i>Últimos {datos.dias} días</span>
        {hayPrevia && <span><i className="an-linea-punteada"></i>Anteriores {datos.dias}</span>}
      </div>
      <div id="anLinea">
        <svg viewBox="0 0 640 200" width="100%" height="200" role="img" aria-label={`Línea de visitas diarias de los últimos ${datos.dias} días`} preserveAspectRatio="none">
          <g stroke="#ece6d6" strokeWidth="1"><line x1="0" y1="40" x2="640" y2="40" /><line x1="0" y1="90" x2="640" y2="90" /><line x1="0" y1="140" x2="640" y2="140" /><line x1="0" y1="190" x2="640" y2="190" /></g>
          {hayPrevia && <path d={trazo(previa)} fill="none" stroke="#a39b83" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          <path d={trazo(actual)} fill="none" stroke="#1f3a2e" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </>
  )
}

function Dispositivo({ nombre, d, color }) {
  return (
    <div className="an-disp">
      <div className="an-disp-cabecera"><span>{nombre}</span><span>{d.porcentaje} %</span></div>
      <div className="an-disp-pista"><div style={{ width: d.porcentaje + '%', background: color }}></div></div>
      <span className="an-disp-nota">{d.sesiones ? `${d.conversion} de cada 100 visitas terminan en pedido` : 'Sin visitas en este período'}</span>
    </div>
  )
}

function Resumen({ datos, comparar }) {
  const a = datos.indicadores.actual
  const p = datos.indicadores.previo
  const serie = datos.serie
  const conversionDiaria = serie.visitas.map((v, i) => (v ? serie.pedidos[i] / v : 0))
  const colorDe = delta => (delta.color === '#8a5a12' ? '#b7791f' : '#4a7c59')
  const dVisitas = textoDelta(comparar, a.visitas, p.visitas)
  const dCarrito = textoDelta(comparar, a.carrito, p.carrito)
  const dPedidos = textoDelta(comparar, a.pedidos, p.pedidos)
  const lista = conclusiones(datos)
  return (
    <div className="an-vista" id="anResumen">
      <section className="an-kpis" id="anKpis" aria-label="Indicadores">
        <Kpi titulo="Visitas (sesiones)" valor={numero(a.visitas)} delta={dVisitas} sparkline={<Sparkline serie={serie.visitas} color={colorDe(dVisitas)} etiqueta="Visitas por día" />} />
        <Kpi titulo="Agregaron al carrito" valor={numero(a.carrito)} delta={dCarrito} sparkline={<Sparkline serie={serie.carrito} color={colorDe(dCarrito)} etiqueta="Carritos por día" />} />
        <Kpi titulo="Pedidos iniciados" valor={numero(a.pedidos)} delta={dPedidos} sparkline={<Sparkline serie={serie.pedidos} color={colorDe(dPedidos)} etiqueta="Pedidos por día" />} />
        <Kpi titulo="Conversión de visita a pedido" valor={`${porcentaje(a.pedidos, a.visitas)} %`} delta={{ texto: `${numero(a.pedidos)} de ${numero(a.visitas)} visitas`, color: '#5b6b60' }} sparkline={<Sparkline serie={conversionDiaria} color="#5b6b60" etiqueta="Conversión por día" />} />
      </section>
      <div className="an-fila">
        <section className="an-tarjeta an-grande" aria-labelledby="anTituloEmbudo">
          <div className="an-tarjeta-cabecera">
            <h2 id="anTituloEmbudo">Embudo de compra</h2>
            <span>Cuántos siguen en cada paso y dónde se van</span>
          </div>
          <Embudo datos={datos} />
        </section>
        <section className="an-tarjeta an-oscura" aria-labelledby="anTituloMirar">
          <div>
            <h2 id="anTituloMirar">Lo que conviene mirar</h2>
            <p>Lectura automática en lenguaje simple, sin tener que interpretar gráficos.</p>
          </div>
          <div className="an-insights" id="anInsights">
            {lista.length
              ? lista.map(item => <div className="an-insight" key={item.titulo}><strong>{item.titulo}</strong> {item.texto}</div>)
              : <div className="an-insight">Todavía no hay datos suficientes para sacar conclusiones. Aparecen a medida que entran visitas.</div>}
          </div>
          <span className="an-pie">Se calcula con los eventos que ya guarda el sitio.</span>
        </section>
      </div>
      <div className="an-fila">
        <section className="an-tarjeta an-doble" aria-labelledby="anTituloVisitas">
          <div className="an-tarjeta-cabecera">
            <h2 id="anTituloVisitas">Visitas por día</h2>
            <LineaVisitas datos={datos} comparar={comparar} />
          </div>
        </section>
        <section className="an-tarjeta" aria-labelledby="anTituloDisp">
          <h2 id="anTituloDisp">Celular y computadora</h2>
          <div className="an-dispositivos" id="anDispositivos">
            <Dispositivo nombre="Celular" d={datos.dispositivos.movil} color="#3d6b4f" />
            <Dispositivo nombre="Computadora" d={datos.dispositivos.computadora} color="#1f3a2e" />
          </div>
        </section>
      </div>
    </div>
  )
}

/* ----- Productos, horarios y páginas ----- */

function Horarios({ horarios }) {
  const maximo = Math.max(...horarios.flat(), 0)
  const nivel = valor => (valor === 0 || maximo === 0 ? 0 : Math.max(1, Math.ceil((valor / maximo) * 4)))
  const celdas = celdasPico(horarios, 2)
  const rango = celda => `de ${8 + celda.bloque * 2} a ${10 + celda.bloque * 2}`
  const frase = celdas.length === 2 && celdas[0].dia === celdas[1].dia
    ? `los ${DIAS_PLURAL[celdas[0].dia]} ${rango(celdas[0])} y ${rango(celdas[1])}`
    : celdas.map(c => `los ${DIAS_PLURAL[c.dia]} ${rango(c)}`).join(' y ')
  return (
    <>
      <div id="anHorarios">
        <div className="an-calor" role="img" aria-label="Mapa de calor de visitas por día y franja horaria; más oscuro es más visitas">
          <div className="an-calor-encabezado">{['8h', '', '12h', '', '16h', '', '20h'].map((h, i) => <span key={i}>{h}</span>)}</div>
          {horarios.map((fila, dia) => (
            <div className="an-calor-fila" key={dia}>
              <span className="an-calor-dia">{DIAS_SEMANA[dia]}</span>
              {fila.map((valor, i) => <div className="an-calor-celda" key={i} style={{ background: COLORES_CALOR[nivel(valor)] }}></div>)}
            </div>
          ))}
          <div className="an-calor-leyenda"><span>Menos</span>{COLORES_CALOR.map(c => <i key={c} style={{ background: c }}></i>)}<span>Más</span></div>
        </div>
      </div>
      {celdas.length > 0 && <div className="an-callout an-callout-arena" id="anPico"><strong>Pico:</strong><span>{frase}. Buen momento para publicar en redes.</span></div>}
    </>
  )
}

function Productos({ datos }) {
  const productos = datos.productos
  const maximo = Math.max(...productos.map(p => Math.max(p.agregados, p.pedidos)), 1)
  const candidato = productos.filter(p => p.agregados >= 5).sort((x, y) => x.pedidos / x.agregados - y.pedidos / y.agregados)[0]
  const paraMirar = candidato && candidato.pedidos / candidato.agregados < 0.25
  const paginas = datos.paginas
  const maxVisitas = Math.max(...paginas.map(p => p.visitas), 1)
  const peor = paginas.filter(p => p.visitas >= maxVisitas * 0.1).sort((x, y) => x.siguen - y.siguen)[0]
  return (
    <div className="an-vista" id="anProductos">
      <div className="an-fila">
        <section className="an-tarjeta an-grande" aria-labelledby="anTituloProductos">
          <h2 id="anTituloProductos">Productos: interés contra compra</h2>
          <div className="an-leyenda an-leyenda-fila">
            <span><i className="an-cuadro an-cuadro-claro"></i>Agregados al carrito</span>
            <span><i className="an-cuadro an-cuadro-oscuro"></i>Pedidos</span>
          </div>
          <div className="an-productos" id="anListaProductos">
            {productos.length === 0
              ? <p className="estado-vacio">Todavía no hay datos. A partir de ahora el sitio registra qué producto se agrega al carrito, y acá se compara con lo que se compra.</p>
              : productos.slice(0, 6).map(p => (
                <div className="an-producto" key={p.nombre}>
                  <div className="an-producto-cabecera"><strong>{p.nombre}</strong><span>{p.agregados ? `${p.pedidos} de ${p.agregados} se compran` : `${p.pedidos} ${p.pedidos === 1 ? 'pedido' : 'pedidos'}`}</span></div>
                  <div className="an-barra-pista"><div style={{ width: (p.agregados / maximo) * 100 + '%', background: '#a9c5b3' }}></div></div>
                  <div className="an-barra-pista"><div style={{ width: (p.pedidos / maximo) * 100 + '%', background: '#1f3a2e' }}></div></div>
                </div>
              ))}
          </div>
          {paraMirar && <div className="an-callout an-callout-ambar" id="anParaMirar"><strong>Para mirar:</strong><span>{candidato.nombre} se agrega mucho y casi no se compra. Puede ser precio, stock o que la foto no convence.</span></div>}
        </section>
        <section className="an-tarjeta" aria-labelledby="anTituloHorarios">
          <h2 id="anTituloHorarios">Cuándo entran más</h2>
          <Horarios horarios={datos.horarios} />
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
            <tbody id="anCuerpoPaginas">
              {paginas.map(p => {
                const bajo = p.siguen < 30
                return (
                  <tr key={p.pagina}>
                    <th scope="row">{nombreDePagina(p.pagina)}</th>
                    <td>{numero(p.visitas)}</td>
                    <td>{numero(p.clics)}</td>
                    <td><div className="an-sigue"><div className="an-sigue-pista"><div style={{ width: p.siguen + '%', background: bajo ? '#b7791f' : '#4a7c59' }}></div></div><strong>{p.siguen} %</strong>{peor && peor.pagina === p.pagina && bajo && <span className="an-sigue-aviso">se pierden acá</span>}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="estado-vacio" id="anPaginasVacio" hidden={paginas.length > 0}>Todavía no hay visitas registradas en este período.</p>
      </section>
    </div>
  )
}

/* ----- Clientes ----- */

function telefonoWhatsApp(telefono) {
  let digitos = String(telefono || '').replace(/\D/g, '')
  if (digitos.startsWith('0')) digitos = `598${digitos.slice(1)}`
  return digitos
}

function Ficha({ cliente, verPedidosDe }) {
  const [ahora] = useState(() => Date.now()) // fecha de hoy, fija mientras se ve la ficha
  if (!cliente) return <aside className="an-tarjeta an-ficha" id="anFicha" aria-label="Detalle del cliente"><p className="estado-vacio">Cuando haya pedidos, acá aparece la ficha de cada cliente.</p></aside>
  const mensaje = encodeURIComponent(`Hola ${cliente.nombre.split(' ')[0]}, te escribimos de ZAPI.`)
  const telefono = telefonoWhatsApp(cliente.telefono)
  return (
    <aside className="an-tarjeta an-ficha" id="anFicha" aria-label="Detalle del cliente">
      <div>
        <div className="an-etiqueta">FICHA DEL CLIENTE</div>
        <h2 className="an-ficha-nombre">{cliente.nombre}</h2>
        <span className="an-ficha-sub">Cliente desde {textoDesde(Math.floor((ahora - new Date(cliente.primera).getTime()) / 86400000))}{cliente.zona ? ` · ${cliente.zona}` : ''}</span>
      </div>
      <div className="an-ficha-cifras">
        <div><strong>{cliente.pedidos}</strong><span>pedidos</span></div>
        <div><strong>{formatearPrecio(cliente.ticket)}</strong><span>por pedido</span></div>
        <div><strong>{cliente.entreCompras === null ? '—' : `${cliente.entreCompras} d`}</strong><span>entre compras</span></div>
      </div>
      {cliente.favoritos.length > 0 && <div><h3>Lo que más compra</h3><div className="an-chips">{cliente.favoritos.map(f => <span key={f}>{f}</span>)}</div></div>}
      <div>
        <h3>Últimos pedidos</h3>
        <ul className="an-ultimos">
          {cliente.ultimos.map((u, i) => (
            <li key={i}><span>{u.dias <= 0 ? 'Hoy' : `Hace ${u.dias} días`} · {u.productos} {u.productos === 1 ? 'producto' : 'productos'}</span><strong>{u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}</strong></li>
          ))}
        </ul>
      </div>
      <div className="an-ficha-acciones">
        {telefono && <a className="an-boton-verde" href={`https://wa.me/${telefono}?text=${mensaje}`} target="_blank" rel="noopener">Escribirle por WhatsApp</a>}
        <button className="an-boton" type="button" onClick={() => verPedidosDe(cliente.nombre)}>Ver todos sus pedidos</button>
      </div>
    </aside>
  )
}

function Clientes({ datos, verPedidosDe }) {
  const [segmento, setSegmento] = useState('todos')
  const [elegidoId, setElegidoId] = useState(null)
  const r = datos.resumen
  const ticket = textoDelta(true, r.ticket.valor, r.ticket.previo)
  const s = datos.segmentos
  const segmentos = [
    { id: 'todos', texto: 'Todos', n: s.todos }, { id: 'nuevos', texto: 'Nuevos', n: s.nuevos },
    { id: 'recurrentes', texto: 'Recurrentes', n: s.recurrentes }, { id: 'inactivos', texto: 'Sin comprar hace 60 días', n: s.inactivos }
  ]
  const filtrados = datos.clientes.filter(c => segmento === 'todos'
    || (segmento === 'nuevos' && c.pedidos === 1)
    || (segmento === 'recurrentes' && c.pedidos > 1)
    || (segmento === 'inactivos' && c.estado === 'inactivo'))
  // Si no se eligió nadie (o el elegido ya no existe), se muestra el primero de la lista completa.
  const elegido = datos.clientes.find(c => c.id === elegidoId) || datos.clientes[0] || null

  return (
    <div className="an-vista" id="anClientes">
      <section className="an-kpis" id="anClientesKpis" aria-label="Resumen de clientes">
        <article className="an-kpi"><span className="an-kpi-titulo">Clientes con pedido</span><div className="an-kpi-valor">{numero(r.clientes)}</div><span className="an-kpi-nota">en los últimos 90 días</span></article>
        <article className="an-kpi"><span className="an-kpi-titulo">Nuevos y recurrentes</span>
          <div className="an-doble-barra"><div style={{ width: r.nuevosPct + '%', background: '#3d6b4f' }}></div><div style={{ width: r.recurrentesPct + '%', background: '#b7791f' }}></div></div>
          <div className="an-doble-leyenda"><span><strong>{r.nuevosPct} %</strong> nuevos</span><span><strong>{r.recurrentesPct} %</strong> vuelven a comprar</span></div></article>
        <article className="an-kpi"><span className="an-kpi-titulo">Pedido promedio</span><div className="an-kpi-valor">{formatearPrecio(r.ticket.valor)}</div><span className="an-kpi-nota" style={{ color: ticket.color || '#5b6b60' }}>{ticket.texto || 'En los últimos 90 días'}</span></article>
        <article className="an-kpi"><span className="an-kpi-titulo">Tiempo entre compras</span><div className="an-kpi-valor">{r.entreCompras === null ? '—' : `${r.entreCompras} días`}</div><span className="an-kpi-nota">en clientes que repiten</span></article>
      </section>
      <div className="an-fila an-fila-arriba">
        <section className="an-tarjeta an-lista" aria-labelledby="anTituloClientes">
          <div className="an-lista-cabecera">
            <h2 id="anTituloClientes">Clientes</h2>
            <div className="an-segmentos" id="anSegmentos" role="group" aria-label="Segmento">
              {segmentos.map(seg => <button key={seg.id} type="button" aria-pressed={seg.id === segmento} onClick={() => setSegmento(seg.id)}>{seg.texto} <span>{seg.n}</span></button>)}
            </div>
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
              <tbody id="anCuerpoClientes">
                {filtrados.map(c => (
                  <tr key={c.id} className={'an-fila-cliente' + (elegido && c.id === elegido.id ? ' elegido' : '')} tabIndex="0" onClick={() => setElegidoId(c.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setElegidoId(c.id) } }}>
                    <th scope="row">{c.nombre}</th><td>{c.pedidos}</td><td>{formatearPrecio(c.total)}</td><td>{hacePalabra(c.dias)}</td>
                    <td><span className={'an-estado an-estado-' + c.estado}>{ETIQUETAS_ESTADO_CLIENTE[c.estado]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="estado-vacio" id="anClientesVacio" hidden={filtrados.length > 0}>No hay clientes en este segmento.</p>
        </section>
        <Ficha cliente={elegido} verPedidosDe={verPedidosDe} />
      </div>
    </div>
  )
}

function descargarCsv(datos) {
  const celda = valor => `"${String(valor).replace(/"/g, '""')}"`
  const a = datos.indicadores.actual
  const filas = [
    ['Indicador', `Últimos ${datos.dias} días`],
    ['Visitas (sesiones)', a.visitas], ['Agregaron al carrito', a.carrito],
    ['Pedidos iniciados', a.pedidos], ['Escribieron por WhatsApp', a.whatsapp],
    [],
    ['Día', 'Visitas', 'Carritos', 'Pedidos iniciados'],
    ...datos.serie.visitas.map((v, i) => [i + 1, v, datos.serie.carrito[i], datos.serie.pedidos[i]])
  ]
  const csv = filas.map(fila => fila.map(celda).join(',')).join('\n')
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  enlace.download = `analitica-${datos.dias}-dias.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(enlace.href)
}

// Analítica de clientes: tres vistas (resumen, clientes, productos y horarios).
function PanelAnalitica({ activo }) {
  const { verPedidosDe } = useAdmin()
  const [vista, setVista] = useState('resumen')
  const [dias, setDias] = useState(30)
  const [comparar, setComparar] = useState(true)

  // Los clientes no dependen del período; el resto sí.
  const enClientes = vista === 'clientes'
  const analitica = useCarga(() => obtenerAnalitica(dias), 'No se pudo cargar la analítica', activo && !enClientes, [dias])
  const clientes = useCarga(obtenerClientes, 'No se pudieron cargar los clientes', activo && enClientes)
  const textos = TEXTOS[vista]

  return (
    <section className="admin-panel an-panel" id="panelAnalitica" hidden={!activo} aria-label="Analítica de clientes">
      <header className="an-cabecera">
        <div className="an-cabecera-texto">
          <div className="an-etiqueta" id="anEtiqueta">ANALÍTICA DE CLIENTES · {textos.etiqueta}</div>
          <h1 id="anTitulo">{textos.titulo}</h1>
        </div>
        <div className="an-periodo" id="anPeriodo" role="group" aria-label="Período" hidden={enClientes}>
          {[7, 30, 90].map(n => <button key={n} type="button" aria-pressed={dias === n} onClick={() => setDias(n)}>{n} días</button>)}
        </div>
        <button className="an-boton" id="anComparar" type="button" aria-pressed={comparar} hidden={vista !== 'resumen'} onClick={() => setComparar(c => !c)}>Comparar con el período anterior</button>
        <button className="an-boton an-boton-oscuro" id="anCsv" type="button" hidden={vista !== 'resumen'} onClick={() => analitica.datos && descargarCsv(analitica.datos)}>Descargar CSV</button>
      </header>
      <div className="an-vistas" id="anVistas" role="tablist" aria-label="Secciones de la analítica">
        {[['resumen', 'Resumen'], ['clientes', 'Clientes'], ['productos', 'Productos y horarios']].map(([id, texto]) => (
          <button key={id} className={'an-vista-tab' + (vista === id ? ' activa' : '')} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}>{texto}</button>
        ))}
      </div>
      <p className="an-nota" id="anNota">{enClientes
        ? 'Sale de los pedidos que ya existen. Solo con datos que la persona dejó al pedir; la navegación anónima nunca se une a un cliente.'
        : 'Eventos anónimos del sitio: sin IP ni datos personales. Se conservan 90 días.'}</p>
      {vista === 'resumen' && analitica.datos && <Resumen datos={analitica.datos} comparar={comparar} />}
      {vista === 'productos' && analitica.datos && <Productos datos={analitica.datos} />}
      {enClientes && clientes.datos && <Clientes datos={clientes.datos} verPedidosDe={verPedidosDe} />}
    </section>
  )
}

export default PanelAnalitica
