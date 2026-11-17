// Punto de entrada: monta React con los proveedores de estado.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SesionProvider } from './estado/sesion.jsx'
import { CatalogoProvider } from './estado/catalogo.jsx'
import { CarritoProvider } from './estado/carrito.jsx'
import { AvisoProvider } from './estado/aviso.jsx'
import { InterfazProvider } from './estado/interfaz.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SesionProvider>
    <CatalogoProvider>
    <CarritoProvider>
      <AvisoProvider>
        <InterfazProvider>
          <App />
        </InterfazProvider>
      </AvisoProvider>
    </CarritoProvider>
    </CatalogoProvider>
    </SesionProvider>
  </StrictMode>
)
