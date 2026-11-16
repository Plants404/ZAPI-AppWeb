import { HOJAS } from '../estilos/hojas.js'

// Pone las hojas de estilo de la lista, en orden; al salir de la página se quitan.
function Estilos({ hojas }) {
  return (
    <>
      {hojas.map(nombre => <style key={nombre} data-hoja={nombre}>{HOJAS[nombre]}</style>)}
    </>
  )
}

export default Estilos
