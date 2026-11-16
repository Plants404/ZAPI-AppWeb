import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Raiz from './components/Raiz.jsx'
import Layout from './components/Layout.jsx'
import Inicio from './paginas/Inicio.jsx'
import Catalogo from './paginas/Catalogo.jsx'
import Carrito from './paginas/Carrito.jsx'
import Servicios from './paginas/Servicios.jsx'
import Nosotros from './paginas/Nosotros.jsx'
import Contacto from './paginas/Contacto.jsx'
import Pedidos from './paginas/Pedidos.jsx'
import Privacidad from './paginas/Privacidad.jsx'
import Producto from './paginas/Producto.jsx'
import Login from './paginas/Login.jsx'
import NoEncontrada from './paginas/NoEncontrada.jsx'
import AdminPagina from './admin/AdminPagina.jsx'

const BASE = ['tokens', 'base', 'estructura']
const BOT = ['zapi-bot']
const TIENDA = ['catalogo-catalogo', 'catalogo-modal']

// "handle" = datos de cada ruta que lee <Layout> y <Raiz>:
// sección (para marcar el menú), hojas de estilo, título y clase del body.
function pagina(seccion, titulo, extra = {}) {
  return {
    seccion,
    titulo,
    bodyClass: 'pagina-' + seccion,
    hojas: [...BASE, seccion === 'catalogo' ? 'catalogo-catalogo' : seccion, ...(extra.tienda || []), ...BOT],
    ...extra
  }
}

const router = createBrowserRouter([
  {
    element: <Raiz />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Inicio />, handle: pagina('inicio', 'ZAPI | Vivero agroecológico en Montevideo', { tienda: TIENDA, productos: true, opiniones: true, hojas: [...BASE, 'inicio', ...TIENDA, ...BOT] }) },
          { path: '/catalogo', element: <Catalogo />, handle: pagina('catalogo', 'Catalogo | ZAPI Vivero Agroecologico', { productos: true, hojas: [...BASE, 'catalogo-catalogo', 'catalogo-modal', ...BOT] }) },
          { path: '/carrito', element: <Carrito />, handle: pagina('carrito', 'Carrito | ZAPI Vivero Agroecologico', { compacto: true, productos: true, opiniones: true, hojas: [...BASE, 'carrito', ...TIENDA, ...BOT] }) },
          { path: '/servicios', element: <Servicios />, handle: pagina('servicios', 'Servicios | ZAPI Vivero Agroecologico') },
          { path: '/nosotros', element: <Nosotros />, handle: pagina('nosotros', 'Nosotros | ZAPI Vivero Agroecologico') },
          { path: '/contacto', element: <Contacto />, handle: pagina('contacto', 'Contacto | ZAPI Vivero Agroecologico') },
          { path: '/pedidos', element: <Pedidos />, handle: pagina('pedidos', 'Mis pedidos | ZAPI Vivero Agroecologico') },
          { path: '/privacidad', element: <Privacidad />, handle: pagina('privacidad', 'Privacidad | ZAPI') },
          {
            path: '/producto/:slug',
            element: <Producto />,
            handle: { seccion: 'producto', titulo: 'Producto | ZAPI Vivero Agroecológico', bodyClass: 'pagina-producto', ficha: true, hojas: ['styles', 'tokens', 'base', 'estructura', 'estilos-producto', 'zapi-bot', 'ajustes-estilo'] }
          }
        ]
      },
      { path: '/login', element: <Login />, handle: { titulo: 'Ingresar | ZAPI', bodyClass: 'pagina-login' } },
      { path: '/admin', element: <AdminPagina />, handle: { titulo: 'Panel de administración | ZAPI Vivero Agroecológico', bodyClass: 'pagina-admin admin-armazon admin-page' } },
      { path: '*', element: <NoEncontrada />, handle: { titulo: '404 · ZAPI | Esta planta aún no brotó', bodyClass: '' } }
    ]
  }
])

function App() {
  return <RouterProvider router={router} />
}

export default App
