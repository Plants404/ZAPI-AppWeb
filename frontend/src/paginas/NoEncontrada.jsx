// Página 404 para direcciones que no existen.
import { Link } from 'react-router-dom'
import Estilos from '../components/Estilos.jsx'

function NoEncontrada() {
  return (
    <>
      <Estilos hojas={['404']} />
      <main className="escena">
        <p className="marca">ZAPI</p>
        <h1 className="year go" id="planta404" aria-label="Error 404">
          <span className="digit" aria-hidden="true">4</span>
          <svg className="tazon-svg" viewBox="0 0 200 260" aria-hidden="true" focusable="false">
            <g className="tazon">
              <path className="tazon-cuerpo" d="M44 176 L156 176 L140 246 c-2 8 -9 12 -17 12 H77 c-8 0 -15 -4 -17 -12 Z"></path>
              <ellipse className="tazon-borde" cx="100" cy="176" rx="58" ry="13"></ellipse>
              <ellipse className="tierra" cx="100" cy="177" rx="48" ry="10"></ellipse>
              <ellipse className="tierra-luz" cx="86" cy="174" rx="16" ry="4"></ellipse>
            </g>
            <g className="planta">
              <path className="tallo" pathLength="1" d="M100 178 C 93 146, 107 112, 100 82 C 95 58, 104 50, 100 42"></path>
              <g transform="translate(100,146) rotate(-34)">
                <g className="hoja hoja--salvia l1">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,124) rotate(212) scale(.95)">
                <g className="hoja hoja--oliva l2">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,102) rotate(-42) scale(.95)">
                <g className="hoja hoja--oliva l3">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,82) rotate(206) scale(.9)">
                <g className="hoja hoja--salvia l4">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,64) rotate(-30) scale(.85)">
                <g className="hoja hoja--salvia l5">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,50) rotate(218) scale(.8)">
                <g className="hoja hoja--oliva l6">
                  <path className="hoja-cuerpo" d="M0 0 C 12 -13, 35 -13, 46 0 C 35 13, 12 13, 0 0 Z"></path>
                  <path className="hoja-vena" d="M4 0 C 16 -1.6, 30 -1.6, 42 0"></path>
                </g>
              </g>
              <g transform="translate(100,42)">
                <g className="brote">
                  <path className="brote-cuerpo" d="M0 0 C -10 -12, -8 -28, 0 -34 C 8 -28, 10 -12, 0 0 Z"></path>
                  <path className="brote-linea" d="M0 -3 L 0 -31"></path>
                </g>
              </g>
            </g>
          </svg>
          <span className="digit" aria-hidden="true">4</span>
        </h1>
        <h2 className="titulo">Esta planta aún no brotó</h2>
        <p className="texto">La página que buscás no existe o cambió de lugar. Volvamos a sembrar desde el inicio.</p>
        <Link className="boton" to="/" id="volverInicio">Volver al inicio</Link>
      </main>
    </>
  )
}

export default NoEncontrada
