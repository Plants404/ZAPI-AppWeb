function Contacto() {
  return (
    <>
        <section className="banner-pagina">
          <div>
            <span className="etiqueta">Contacto</span>
            <h1>Empezá hoy a transformar tus espacios.</h1>
            <p>Contanos qué necesitás y te respondemos a la brevedad. También podés coordinar todo directamente por WhatsApp.</p>
          </div>
          <ul className="banner-ventajas">
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Presupuesto claro y personalizado
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">eco</span> Asesoramiento agroecológico
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">location_on</span> Atención cercana en Montevideo
            </li>
          </ul>
        </section>
        <section className="contacto-pagina">
          <aside className="contacto-info">
            <span className="etiqueta">Atención directa</span>
            <h2>Hablemos de tu espacio.</h2>
            <p>Respondemos consultas de hogares, empresas e instituciones. Si preferís una respuesta más rápida, escribinos por WhatsApp.</p>
            <ul className="contacto-datos">
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">chat</span>
                <div>
                  <strong>WhatsApp</strong>
                  <a href="https://wa.me/59898268560" target="_blank" rel="noopener">098 268 560</a>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <div>
                  <strong>Correo</strong>
                  <a href="mailto:zapi.vivero@gmail.com">zapi.vivero@gmail.com</a>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                <div>
                  <strong>Ubicación</strong>
                  <span>Congreso de Abril, Montevideo, Uruguay</span>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                <div>
                  <strong>Visitas</strong>
                  <span>Visitas coordinadas previamente por WhatsApp.</span>
                </div>
              </li>
            </ul>
            <a className="boton boton-primario boton-bloque" href="https://wa.me/59898268560" target="_blank" rel="noopener">
              <span className="material-symbols-outlined" aria-hidden="true">chat</span> Escribir por WhatsApp
            </a>
          </aside>
          <div className="contacto-card">
            <div className="contacto-card-cabecera">
              <span className="etiqueta">Escribinos</span>
              <h2>Contanos qué necesitás.</h2>
            </div>
            <form className="contacto-form" id="contactoForm" noValidate>
              <div className="form-fila">
                <div>
                  <label className="campo-label" htmlFor="contactoNombre">Nombre <span aria-hidden="true">*</span></label>
                  <input className="campo-input" id="contactoNombre" name="nombre" type="text" autoComplete="name" maxLength="120" aria-describedby="errorNombre" />
                  <span className="campo-error" id="errorNombre"></span>
                </div>
                <div>
                  <label className="campo-label" htmlFor="contactoCorreo">Correo electrónico <span aria-hidden="true">*</span></label>
                  <input className="campo-input" id="contactoCorreo" name="correo" type="email" autoComplete="email" maxLength="160" aria-describedby="errorCorreo" />
                  <span className="campo-error" id="errorCorreo"></span>
                </div>
              </div>
              <div className="form-fila">
                <div>
                  <label className="campo-label" htmlFor="contactoAsunto">Asunto <span aria-hidden="true">*</span></label>
                  <input className="campo-input" id="contactoAsunto" name="asunto" type="text" maxLength="160" aria-describedby="errorAsunto" />
                  <span className="campo-error" id="errorAsunto"></span>
                </div>
                <div>
                  <label className="campo-label" htmlFor="contactoTelefono">Teléfono (opcional)</label>
                  <input className="campo-input" id="contactoTelefono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" maxLength="40" aria-describedby="errorTelefono" />
                  <span className="campo-error" id="errorTelefono"></span>
                </div>
              </div>
              <label className="campo-label" htmlFor="contactoConsulta">Mensaje <span aria-hidden="true">*</span></label>
              <textarea className="campo-input" id="contactoConsulta" name="consulta" rows="6" maxLength="2000" aria-describedby="errorConsulta contactoContador" />
              <span className="campo-error" id="errorConsulta"></span>
              <span className="contacto-contador" id="contactoContador">2000/2000</span>
              <div className="visually-hidden" aria-hidden="true">
                <label htmlFor="contactoSitio">Dejá este campo vacío</label>
                <input id="contactoSitio" name="sitio_web" type="text" tabIndex="-1" autoComplete="off" />
              </div>
              <p className="formulario-estado" id="contactoEstado" role="status" aria-live="polite" hidden></p>
              <div className="contacto-pie">
                <p className="privacy-note">Tus datos solo se usan para responderte esta consulta. Los campos con * son obligatorios.</p>
                <button className="boton boton-primario" id="contactoEnviar" type="submit">
                  <span id="contactoEnviarTexto">Enviar mensaje</span>
                </button>
              </div>
            </form>
            <div className="contacto-confirmacion" id="contactoOk" hidden>
              <span className="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
              <h3 id="contactoOkTitulo" tabIndex="-1">¡Gracias por escribirnos!</h3>
              <p>Recibimos tu consulta y te responderemos a la brevedad.</p>
              <button className="boton boton-secundario" id="contactoReiniciar" type="button">Enviar otra consulta</button>
            </div>
          </div>
        </section>
    </>
  )
}

export default Contacto
