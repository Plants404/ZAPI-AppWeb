import { Link } from 'react-router-dom'
import Estilos from '../components/Estilos.jsx'

function Login() {
  return (
    <>
      <Estilos hojas={['tokens', 'styles', 'login', 'zapi-bot', 'restauracion']} />
    <>
        <Link className="volver" to="/">Volver al inicio</Link>
        <main className="wrap">
          <div id="shake">
            <div className="head" id="hd" data-state="happy" data-face="1" role="img" aria-label="Personaje con un brote en la cabeza">
              <div className="tilt" id="tilt">
                <div className="pp" id="pp">
                  <div className="bob">
                    <img className="ex f1" src="./personaje/01-feliz.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f2" src="./personaje/02-duda.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f3" src="./personaje/03-llanto.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f4" src="./personaje/04-lentes.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f5" src="./personaje/05-ojos-tapados.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f7" src="./personaje/07-guino.svg" alt="" draggable="false" decoding="async" />
                    <img className="ex f8" src="./personaje/08-corazon.svg" alt="" draggable="false" decoding="async" />
                  </div>
                </div>
              </div>
            </div>
            <form className="card" id="f" noValidate>
              <div className="tabs" role="tablist" aria-label="Elegí una opción">
                <button className="tab" id="tabLogin" type="button" role="tab" aria-selected="true" aria-controls="f">Ingresar</button>
                <button className="tab" id="tabRegistro" type="button" role="tab" aria-selected="false" aria-controls="f">Crear cuenta</button>
              </div>
              <h1 id="titulo">Bienvenido</h1>
              <p className="msg" id="msg" aria-live="polite">¡Hola! Ingresá para seguir creciendo</p>
              <div className="f" id="fn" hidden>
                <label htmlFor="n">Nombre</label>
                <div className="campo">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z"></path>
                  </svg>
                  <input id="n" type="text" autoComplete="name" placeholder="Tu nombre" maxLength="120" />
                </div>
                <p className="err" id="errN" role="alert"></p>
              </div>
              <div className="f">
                <label htmlFor="u">Correo</label>
                <div className="campo">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 7.2L5.2 7H4.5v.3L12 13l7.5-5.7V7h-.7L12 12.2Z"></path>
                  </svg>
                  <input id="u" type="email" autoComplete="email" placeholder="tu@correo.com" />
                </div>
                <p className="err" id="errU" role="alert"></p>
              </div>
              <div className="f">
                <label htmlFor="p">Contraseña</label>
                <div className="campo">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"></path>
                  </svg>
                  <input id="p" type="password" autoComplete="current-password" placeholder="••••••••" />
                  <button type="button" className="eye" id="t" aria-label="Mostrar contraseña">VER</button>
                </div>
                <p className="err" id="errP" role="alert"></p>
              </div>
              <div className="registro-extra" id="extra" hidden>
                <div className="fuerza" aria-live="polite">
                  <div className="fuerza-barra">
                    <span id="fuerzaRelleno"></span>
                  </div>
                  <span className="fuerza-texto" id="fuerzaTexto">Escribí una contraseña</span>
                </div>
                <ul className="reqs" id="reqs">
                  <li data-req="largo">
                    <span className="tilde" aria-hidden="true"></span>Al menos 12 caracteres
                  </li>
                  <li data-req="mezcla">
                    <span className="tilde" aria-hidden="true"></span>Letras y números (recomendado)
                  </li>
                  <li data-req="igual">
                    <span className="tilde" aria-hidden="true"></span>Las dos contraseñas coinciden
                  </li>
                </ul>
                <div className="f" id="fp2">
                  <label htmlFor="p2">Repetí la contraseña</label>
                  <div className="campo">
                    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"></path>
                    </svg>
                    <input id="p2" type="password" autoComplete="new-password" placeholder="••••••••" />
                  </div>
                  <p className="err" id="errP2" role="alert"></p>
                </div>
                <p className="legal">Al crear tu cuenta aceptás nuestra <Link to="/privacidad">política de privacidad</Link>. Con tu cuenta seguís tus pedidos y comprás más rápido.</p>
              </div>
              <button className="go" id="go" type="submit">Ingresar</button>
              <p className="tag">Pequeños brotes, grandes sueños</p>
            </form>
          </div>
        </main>
    </>
    </>
  )
}

export default Login
