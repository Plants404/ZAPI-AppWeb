import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router-dom'

// Raíz de todas las rutas: pone el título de la pestaña y la clase del <body>
// según el "handle" de la ruta (lo mismo que hacía cada HTML del sitio viejo).
function Raiz() {
  const handle = useMatches().map(m => m.handle).filter(Boolean).pop() || {}
  const { titulo = 'ZAPI | Vivero agroecológico en Montevideo', bodyClass = '' } = handle

  useEffect(() => { document.title = titulo }, [titulo])
  useEffect(() => {
    document.body.className = bodyClass
    document.documentElement.dataset.cuentas = 'off'
    return () => { document.body.className = '' }
  }, [bodyClass])

  return <Outlet />
}

export default Raiz
