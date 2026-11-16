import { useEffect, useState } from 'react'
import { crearVentaPresencial, obtenerProductosAdmin } from '../api.js'
import { formatearPrecio } from '../data/negocio.js'
import { limpiarValor, validarTelefono } from '../utilidades.js'
import { useAdmin } from './contexto.jsx'
import AdminDialogo from './AdminDialogo.jsx'

const LINEA_NUEVA = () => ({ productoId: '', cantidad: 1 })

// Ventana para registrar una venta hecha en persona (descuenta el stock).
// El panel la monta solo cuando hay que mostrarla, así siempre arranca limpia.
function DialogoVentaPresencial({ alCerrar, alCrear }) {
  const { avisar } = useAdmin()
  const [productos, setProductos] = useState([])
  const [cliente, setCliente] = useState({ nombre: '', telefono: '' })
  const [lineas, setLineas] = useState([LINEA_NUEVA()])
  const [errores, setErrores] = useState({})
  const [estado, setEstado] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    obtenerProductosAdmin()
      .then(datos => { if (vigente) setProductos(Array.isArray(datos.products) ? datos.products : []) })
      .catch(e => { if (vigente) { avisar('No se pudieron cargar los productos', e.message); alCerrar() } })
    return () => { vigente = false }
  }, [avisar, alCerrar])

  const total = lineas.reduce((suma, l) => {
    const producto = productos.find(p => String(p.id) === l.productoId)
    return producto ? suma + Number(producto.precioBase || 0) * (Number(l.cantidad) || 0) : suma
  }, 0)

  const cambiarLinea = (indice, cambio) => setLineas(ls => ls.map((l, i) => (i === indice ? { ...l, ...cambio } : l)))

  async function guardar(evento) {
    evento.preventDefault()
    const nombre = limpiarValor(cliente.nombre)
    const telefono = limpiarValor(cliente.telefono)
    const nuevos = {}
    if (!nombre) nuevos.ventaClienteNombre = 'Ingresá el nombre del cliente.'
    if (!validarTelefono(telefono)) nuevos.ventaClienteTelefono = 'Ingresá un teléfono válido.'
    if (lineas.length === 0) nuevos.ventaLineas = 'Agregá al menos una línea de producto.'
    if (lineas.some(l => !l.productoId)) nuevos.ventaLineas = 'Seleccioná un producto en todas las líneas.'
    else if (lineas.some(l => !l.cantidad || Number(l.cantidad) < 1)) nuevos.ventaLineas = 'La cantidad debe ser mayor a 0.'
    setErrores(nuevos)
    const primero = Object.values(nuevos)[0]
    if (primero) { setEstado(primero); return }
    setEstado('')

    setEnviando(true)
    try {
      await crearVentaPresencial({
        cliente: { nombre, telefono },
        // El servidor espera cada línea como { id: número, cantidad } (el panel viejo mandaba "productoId" y fallaba).
        lineas: lineas.map(l => ({ id: Number(l.productoId), cantidad: Number(l.cantidad) }))
      })
      avisar('Venta creada', 'La venta presencial se registró correctamente.')
      alCerrar()
      alCrear()
    } catch (error) {
      avisar('No se pudo crear la venta', error.message)
    }
    setEnviando(false)
  }

  const claseCampo = id => 'campo-input' + (errores[id] ? ' campo-con-error' : '')

  return (
    <AdminDialogo
      id="dialogoVentaPresencial"
      etiqueta="Venta presencial"
      titulo="Nueva venta presencial"
      abierto
      alCerrar={alCerrar}
      acciones={(
        <>
          <button className="boton boton-texto" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="boton boton-primario" id="adminGuardarVentaPresencial" type="submit" form="formVentaPresencial" disabled={enviando}>{enviando ? 'Procesando...' : 'Crear venta'}</button>
        </>
      )}
    >
      <form id="formVentaPresencial" noValidate onSubmit={guardar}>
        <div className="admin-campo">
          <label className="campo-label" htmlFor="ventaClienteNombre">Nombre del cliente <span aria-hidden="true">*</span></label>
          <input className={claseCampo('ventaClienteNombre')} id="ventaClienteNombre" name="nombre" type="text" autoComplete="name" maxLength="120" required aria-invalid={errores.ventaClienteNombre ? 'true' : undefined} value={cliente.nombre} onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} />
          <span className="campo-error" id="errorVentaClienteNombre">{errores.ventaClienteNombre}</span>
        </div>
        <div className="admin-campo">
          <label className="campo-label" htmlFor="ventaClienteTelefono">Teléfono <span aria-hidden="true">*</span></label>
          <input className={claseCampo('ventaClienteTelefono')} id="ventaClienteTelefono" name="telefono" type="tel" autoComplete="tel" maxLength="40" required aria-invalid={errores.ventaClienteTelefono ? 'true' : undefined} value={cliente.telefono} onChange={e => setCliente(c => ({ ...c, telefono: e.target.value }))} />
          <span className="campo-error" id="errorVentaClienteTelefono">{errores.ventaClienteTelefono}</span>
        </div>
        <div className="admin-campo admin-campo-lineas">
          <label className="campo-label" htmlFor="ventaProducto">Líneas de producto</label>
          <div id="ventaLineas" className={'admin-lineas-venta' + (errores.ventaLineas ? ' campo-con-error' : '')}>
            {lineas.map((linea, indice) => (
              <div className="admin-linea-venta" key={indice}>
                <select className="campo-input admin-select-linea-producto" aria-label={'Producto de la línea ' + (indice + 1)} value={linea.productoId} onChange={e => cambiarLinea(indice, { productoId: e.target.value })}>
                  <option value="">Seleccioná un producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock {p.stock})</option>)}
                </select>
                <input className="campo-input admin-input-linea-cantidad" type="number" min="1" aria-label={'Cantidad de la línea ' + (indice + 1)} value={linea.cantidad} onChange={e => cambiarLinea(indice, { cantidad: e.target.value })} />
                <button className="boton boton-texto admin-quitar-linea" type="button" onClick={() => lineas.length > 1 && setLineas(ls => ls.filter((_, i) => i !== indice))}>Quitar</button>
              </div>
            ))}
          </div>
          <span className="campo-error" id="errorVentaLineas">{errores.ventaLineas}</span>
          <button className="boton boton-texto" type="button" id="adminAgregarLineaVenta" onClick={() => setLineas(ls => [...ls, LINEA_NUEVA()])}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span> Agregar línea
          </button>
        </div>
        <div className="admin-total-venta">
          <span className="admin-total-venta-label">Total</span>
          <span className="admin-total-valor" id="ventaTotal">{formatearPrecio(total)}</span>
        </div>
        <p className={'formulario-estado' + (estado ? ' estado-error' : '')} id="estadoVentaPresencial" role="status" aria-live="polite" hidden={!estado}>{estado}</p>
      </form>
    </AdminDialogo>
  )
}

export default DialogoVentaPresencial
