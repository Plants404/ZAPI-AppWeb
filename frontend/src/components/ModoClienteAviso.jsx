import { destinoModoCliente } from '../estado/sitio.js'

// Aviso flotante cuando quien administra recorre el sitio "como cliente".
function ModoClienteAviso() {
  const destino = destinoModoCliente()
  if (!destino) return null
  const volver = () => { try { sessionStorage.removeItem('zapiModoCliente') } catch { /* sin almacenamiento */ } }
  return (
    <aside className="modo-cliente-aviso" role="status">
      <strong>Estás viendo el sitio como cliente</strong>
      <span>Modo prueba: tus clics no se registran en la analítica.</span>
      <a href={destino} onClick={volver}>Volver al administrador</a>
    </aside>
  )
}

export default ModoClienteAviso
