/* Conexión con el backend. La dirección sale de .env (VITE_API_URL).
   En la Fase 5 se agregan aquí el resto de los endpoints. */
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
