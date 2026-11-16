import { Link } from 'react-router-dom'

function Servicios() {
  return (
    <>
        <section className="banner-pagina">
          <div>
            <span className="etiqueta">Servicios</span>
            <h1>Soluciones para cada proyecto.</h1>
            <p>Además de vender plantas, te ayudamos a planificar, desarrollar y mantener espacios verdes de forma eficiente.</p>
          </div>
          <ul className="banner-ventajas">
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Presupuesto claro y sin compromiso
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">eco</span> Enfoque 100% agroecológico
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">location_on</span> Atención cercana en Montevideo
            </li>
          </ul>
        </section>
        <section className="seccion servicios" aria-labelledby="tituloServicios">
          <div className="seccion-cabecera">
            <span className="etiqueta">Cómo trabajamos</span>
            <h2 id="tituloServicios">Del diagnóstico al cuidado cotidiano</h2>
            <p>Cada propuesta parte de tu espacio, tu tiempo disponible y el uso que quieras darle.</p>
          </div>
          <div className="servicios-grid">
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">support_agent</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">01</span>
              <h3>Asesoramiento personalizado</h3>
              <p>Guía paso a paso adaptada a tu espacio y tu tiempo.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Asesoramiento personalizado">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">yard</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">02</span>
              <h3>Diseño de jardines</h3>
              <p>Planificación estética y funcional para patios y balcones.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Diseño de jardines">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">agriculture</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">03</span>
              <h3>Huertas familiares</h3>
              <p>Proyectamos tu huerta urbana para cosechar alimentos en casa.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Huertas familiares">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">local_florist</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">04</span>
              <h3>Selección de especies</h3>
              <p>Elegimos las plantas ideales según la luz y el clima de tu espacio.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Selección de especies">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">grass</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">05</span>
              <h3>Mantenimiento</h3>
              <p>Podas, nutrición del suelo y control orgánico de plagas.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Mantenimiento">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">apartment</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">06</span>
              <h3>Proyectos para empresas</h3>
              <p>Ambientación verde para oficinas, comercios e instituciones.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Proyectos para empresas">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">school</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">07</span>
              <h3>Talleres y capacitaciones</h3>
              <p>Aprendé siembra, compostaje y cuidados paso a paso.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Talleres y capacitaciones">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
            <article className="servicio-card">
              <div className="servicio-icono">
                <span className="material-symbols-outlined" aria-hidden="true">request_quote</span>
              </div>
              <span className="servicio-numero" aria-hidden="true">08</span>
              <h3>Propuestas a medida</h3>
              <p>Contanos tu idea y armamos una solución personalizada.</p>
              <a className="enlace-flecha" href="https://wa.me/59898268560" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp sobre Propuestas a medida">Consultar por WhatsApp <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
            </article>
          </div>
        </section>
        <section className="seccion servicios-cierre">
          <div>
            <span className="etiqueta">¿Necesitás algo a medida?</span>
            <h2>Contanos tu idea y la convertimos en un proyecto.</h2>
            <p>Respondemos consultas de hogares, empresas e instituciones de Montevideo.</p>
          </div>
          <Link className="boton boton-primario" to="/contacto">Pedir presupuesto</Link>
        </section>
    </>
  )
}

export default Servicios
