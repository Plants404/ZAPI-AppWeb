import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CarritoProvider } from './estado/carrito.jsx'
import { AvisoProvider } from './estado/aviso.jsx'
import { InterfazProvider } from './estado/interfaz.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CarritoProvider>
      <AvisoProvider>
        <InterfazProvider>
          <App />
        </InterfazProvider>
      </AvisoProvider>
    </CarritoProvider>
  </StrictMode>
)
