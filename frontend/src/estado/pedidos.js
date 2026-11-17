/* Historial de pedidos guardado en el navegador (localStorage, clave "zapiPedidos"). */
import { formatearPrecio } from '../data/negocio.js'
import { formatearFecha } from '../utilidades.js'

const CLAVE_PEDIDOS = 'zapiPedidos'
const LIMITE_PEDIDOS = 40
const ESTADOS_PEDIDO = { pendiente: 'Pendiente de confirmación' }

function leerPedidosGuardados() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS))
    return Array.isArray(crudo) ? crudo : []
  } catch {
    return []
  }
}

function escribir(pedidos) {
  try { localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos)) } catch { /* sin almacenamiento */ }
}

export function obtenerPedidos() {
  return leerPedidosGuardados().map(p => ({ ...p, lineas: Array.isArray(p.lineas) ? p.lineas : [] }))
}

export function guardarPedido(pedido) {
  const pedidos = leerPedidosGuardados()
  const usados = new Set(pedidos.map(p => p.id))
  if (!pedido.id) {
    let id = ''
    do { id = 'ZAPI-' + Date.now().toString(36).toUpperCase() } while (usados.has(id))
    pedido.id = id
  }
  pedidos.unshift(pedido)
  escribir(pedidos.slice(0, LIMITE_PEDIDOS))
  return pedido
}

function armarPedido(datos) {
  const cliente = datos.cliente || {}
  return {
    id: '',
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    cliente: {
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      zona: cliente.zona || '',
      notas: cliente.notas || ''
    },
    lineas: datos.lineas.map(l => ({ id: l.id, nombre: l.nombre, precio: l.precio, cantidad: l.cantidad })),
    subtotal: datos.subtotal,
    envio: datos.envio,
    total: datos.envio === null ? datos.subtotal : datos.subtotal + datos.envio
  }
}

// Convierte el pedido que devuelve el servidor al formato del historial local.
export function pedidoDesdeServidor(orden) {
  const envio = orden.envio === null || orden.envio === undefined ? 0 : orden.envio
  return {
    id: orden.id,
    fecha: new Date(orden.fecha).toISOString(),
    estado: orden.estado || 'pendiente',
    cliente: armarPedido({ cliente: orden.cliente, lineas: [], subtotal: 0, envio: 0 }).cliente,
    lineas: orden.lineas.map(l => ({ id: l.id, nombre: l.nombre, precio: l.precio, cantidad: l.cantidad })),
    subtotal: orden.subtotal,
    envio,
    total: orden.total
  }
}

export const textoEstadoPedido = estado => ESTADOS_PEDIDO[estado] || ESTADOS_PEDIDO.pendiente

export function eliminarPedido(id) {
  escribir(leerPedidosGuardados().filter(p => p.id !== id))
}

export function mensajeDePedido(pedido) {
  const lineas = pedido.lineas.map(l => '- ' + l.cantidad + ' × ' + l.nombre + ' — ' + formatearPrecio(l.precio * l.cantidad))
  const envio = pedido.envio === null ? 'A coordinar' : formatearPrecio(pedido.envio)
  const total = pedido.envio === null ? formatearPrecio(pedido.total) + ' + envío a coordinar' : formatearPrecio(pedido.total)
  const datos = [
    'Hola ZAPI, quiero confirmar este pedido:', '',
    'Pedido: ' + pedido.id,
    'Fecha: ' + formatearFecha(pedido.fecha), '',
    ...lineas, '',
    'Subtotal: ' + formatearPrecio(pedido.subtotal),
    'Envío: ' + envio,
    'Total: ' + total, '',
    'Nombre: ' + pedido.cliente.nombre,
    'Teléfono: ' + pedido.cliente.telefono
  ]
  if (pedido.cliente.email) datos.push('Correo: ' + pedido.cliente.email)
  if (pedido.cliente.zona) datos.push('Zona: ' + pedido.cliente.zona)
  if (pedido.cliente.notas) datos.push('Notas: ' + pedido.cliente.notas)
  return datos.join('\n')
}
