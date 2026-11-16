// Ícono de Material Symbols (una fuente de íconos): el nombre va como texto.
function Icono({ nombre, clase = '' }) {
  return <span className={'material-symbols-outlined' + (clase ? ' ' + clase : '')} aria-hidden="true">{nombre}</span>
}

export default Icono
