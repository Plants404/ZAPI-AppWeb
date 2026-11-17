/* Conexión con el backend. La dirección sale de .env (VITE_API_URL).
   Acá vive una función por cada endpoint que usa el frontend. */
const BASE = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

export function urlApi(ruta) {
  return BASE + (ruta.startsWith('/') ? ruta : '/' + ruta)
}

async function leerError(respuesta, porDefecto) {
  try { return (await respuesta.json()).error || porDefecto } catch { return porDefecto }
}

// Guarda la consulta del formulario de contacto. Devuelve true si salió bien.
export async function enviarContacto(datos) {
  try {
    const respuesta = await fetch(urlApi('/api/contact'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    return respuesta.ok
  } catch {
    return false
  }
}

// Publica una opinión. Si falla, lanza un Error con el mensaje para mostrar.
export async function crearTestimonio(datos) {
  const respuesta = await fetch(urlApi('/api/testimonials'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(datos)
  })
  if (!respuesta.ok) throw new Error(await leerError(respuesta, 'No pudimos publicar tu opinión. Probá de nuevo en un rato.'))
  return true
}

// ¿Hay una sesión iniciada? (se usa para poder confirmar pedidos)
export async function hayClienteConSesion() {
  try {
    const respuesta = await fetch(urlApi('/api/auth/yo'), { credentials: 'include' })
    return respuesta.ok
  } catch {
    return false
  }
}

// Inicia sesión. Devuelve { ok, status, datos } (datos trae el rol o el error).
export async function iniciarSesion(email, clave) {
  const respuesta = await fetch(urlApi('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, clave })
  })
  const datos = await respuesta.json().catch(() => ({}))
  return { ok: respuesta.ok, status: respuesta.status, datos }
}

// Crea una cuenta nueva (no inicia sesión por sí sola).
export async function registrarCuenta(nombre, email, clave) {
  const respuesta = await fetch(urlApi('/api/auth/registro'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ nombre, email, clave })
  })
  const datos = await respuesta.json().catch(() => ({}))
  return { ok: respuesta.ok, status: respuesta.status, datos }
}

// Pregunta al asistente (IA). Devuelve el texto, o null si falla (entonces se usan las respuestas fijas).
export async function preguntarAlChat(mensajes) {
  try {
    const respuesta = await fetch(urlApi('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensajes })
    })
    if (!respuesta.ok) return null
    const datos = await respuesta.json()
    const texto = typeof datos.respuesta === 'string' ? datos.respuesta.trim() : ''
    return texto || null
  } catch {
    return null
  }
}

// Cierra la sesión en el servidor (si falla, igual se sale del panel).
export async function cerrarSesion() {
  try {
    await fetch(urlApi('/api/auth/logout'), { method: 'POST', credentials: 'include' })
  } catch { /* sin conexión */ }
}

// Datos de la sesión actual: { ok, rol, nombre, email } o null si no hay sesión.
export async function obtenerSesion() {
  try {
    const respuesta = await fetch(urlApi('/api/auth/yo'), { credentials: 'include' })
    if (!respuesta.ok) return null
    const datos = await respuesta.json()
    return datos && datos.ok ? datos : null
  } catch {
    return null
  }
}

// Las imágenes de la base pueden ser "public/img/x", "/api/imagenes/<id>" o una URL https.
export function resolverImagen(ruta) {
  const valor = String(ruta || '')
  if (!valor) return ''
  if (/^https?:\/\//i.test(valor)) return valor
  if (valor.startsWith('/api/')) return urlApi(valor)
  if (valor.startsWith('public/')) return '/' + valor.slice('public/'.length)
  return valor
}

// Pide algo a la API y devuelve el JSON. Si falla, lanza un Error con el mensaje.
// En las llamadas del panel (no públicas) un 401 manda al login, como hacía el panel viejo.
async function pedirJson(ruta, { metodo = 'GET', cuerpo, publico = false, irAlLogin = !publico } = {}) {
  const opciones = { method: metodo, headers: { Accept: 'application/json' } }
  if (!publico) opciones.credentials = 'include'
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json'
    opciones.body = JSON.stringify(cuerpo)
  }
  let respuesta
  try {
    respuesta = await fetch(urlApi(ruta), opciones)
  } catch {
    throw new Error('No hay conexión con el servidor.')
  }
  if (respuesta.status === 401 && irAlLogin) {
    window.location.href = '/login?volver=/admin'
    throw new Error('Sesión requerida. Iniciá sesión para continuar.')
  }
  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '')
    let detalle = texto
    try {
      const datos = JSON.parse(texto)
      detalle = datos.error || datos.message || texto
    } catch { /* respuesta que no es JSON */ }
    const error = new Error('Error ' + respuesta.status + (detalle ? ': ' + detalle : ''))
    error.status = respuesta.status
    throw error
  }
  return respuesta.status === 204 ? null : respuesta.json()
}

/* ---------- Sitio público ---------- */

// Catálogo vivo (con las imágenes ya resueltas).
// Pedido web del cliente: el servidor descuenta el stock y devuelve el pedido con su id definitivo.
export async function crearPedidoWeb(datos) {
  const { order } = await pedirJson('/api/orders', { metodo: 'POST', cuerpo: datos, irAlLogin: false })
  return order
}

export async function obtenerProductos() {
  const { products } = await pedirJson('/api/products', { publico: true })
  return (products || []).map(p => ({
    ...p,
    imagen: resolverImagen(p.imagen),
    imagenes: (p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen]).filter(Boolean).map(resolverImagen)
  }))
}

export async function obtenerTestimonios() {
  const { testimonials } = await pedirJson('/api/testimonials', { publico: true })
  return testimonials || []
}

// Estilo y textos publicados desde el panel: { version, estilo, contenido, catalogo, publicadoEn }.
export const obtenerPublicado = () => pedirJson('/api/publicado', { publico: true })

// Analítica anónima (no debe romper nada si falla).
export function enviarEvento(evento) {
  fetch(urlApi('/api/eventos'), {
    method: 'POST',
    keepalive: true,
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento)
  }).catch(() => { /* no crítica */ })
}

/* ---------- Panel de administración (todas llevan la cookie de sesión) ---------- */

const ADMIN = '/api/admin'
const consulta = parametros => {
  const q = new URLSearchParams()
  Object.entries(parametros).forEach(([clave, valor]) => { if (valor !== '' && valor != null) q.set(clave, valor) })
  return q.toString()
}

export const obtenerResumen = () => pedirJson(ADMIN + '/resumen')
export const obtenerPedidos = parametros => pedirJson(ADMIN + '/pedidos?' + consulta(parametros))
export const cambiarEstadoPedido = (id, estado) => pedirJson(ADMIN + '/pedidos/' + id + '/estado', { metodo: 'PATCH', cuerpo: { estado } })
export const crearVentaPresencial = datos => pedirJson(ADMIN + '/pedidos/presencial', { metodo: 'POST', cuerpo: datos })

export const obtenerProductosAdmin = () => pedirJson(ADMIN + '/productos')
export const crearProductoAdmin = datos => pedirJson(ADMIN + '/productos', { metodo: 'POST', cuerpo: datos })
export const editarProductoAdmin = (id, datos) => pedirJson(ADMIN + '/productos/' + id, { metodo: 'PATCH', cuerpo: datos })

export const obtenerAuditoria = () => pedirJson(ADMIN + '/auditoria')

export const obtenerMensajes = () => pedirJson(ADMIN + '/mensajes')
export const obtenerTestimoniosAdmin = () => pedirJson(ADMIN + '/testimonios')
export const obtenerUsuarios = () => pedirJson(ADMIN + '/usuarios')
export const cambiarGestion = (ruta, cuerpo) => pedirJson(ADMIN + '/' + ruta, { metodo: 'PATCH', cuerpo })
export const eliminarGestion = ruta => pedirJson(ADMIN + '/' + ruta, { metodo: 'DELETE' })

export const obtenerAnalitica = dias => pedirJson(ADMIN + '/analitica?dias=' + dias)
export const obtenerClientes = () => pedirJson(ADMIN + '/clientes')

// Sube una imagen (ya reducida, JPEG) a la biblioteca del servidor. Devuelve { url, ... }.
export async function subirImagenAdmin(blob) {
  let respuesta
  try {
    respuesta = await fetch(urlApi('/api/admin/imagenes'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg', Accept: 'application/json' },
      body: blob
    })
  } catch {
    throw new Error('No hay conexión con el servidor.')
  }
  if (!respuesta.ok) throw new Error('Error ' + respuesta.status)
  return respuesta.json()
}
