function DialogoTestimonio() {
  return (
      <dialog className="testimonio-modal dialogo" id="dialogoTestimonio" aria-labelledby="testimonioTitulo">
        <div className="testimonio-fondo" data-cerrar-dialogo=""></div>
        <form className="testimonio-caja testimonio-form dialogo-caja" id="testimonioForm" noValidate>
          <button className="testimonio-cerrar-x icono-boton dialogo-cerrar" type="button" data-cerrar-dialogo="" aria-label="Cerrar formulario de opinion">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <span className="etiqueta">Tu experiencia</span>
          <h2 className="testimonio-titulo" id="testimonioTitulo">Contanos cómo fue tu compra</h2>
          <p className="testimonio-bajada">Tu opinión se publica enseguida en la página. Contanos con honestidad cómo te fue.</p>
          <div className="testimonio-campo">
            <label className="testimonio-etiqueta campo-label" htmlFor="testimonioNombre">Nombre <span aria-hidden="true">*</span></label>
            <input className="testimonio-input campo-input" id="testimonioNombre" name="autor" type="text" autoComplete="name" maxLength="120" aria-describedby="errorTestimonioNombre" />
            <span className="testimonio-error campo-error" id="errorTestimonioNombre"></span>
          </div>
          <div className="testimonio-campo">
            <label className="testimonio-etiqueta campo-label" htmlFor="testimonioLugar">Lugar (opcional)</label>
            <input className="testimonio-input campo-input" id="testimonioLugar" name="lugar" type="text" maxLength="120" aria-describedby="errorTestimonioLugar" />
            <span className="testimonio-error campo-error" id="errorTestimonioLugar"></span>
          </div>
          <div className="testimonio-campo">
            <span className="testimonio-etiqueta campo-label" id="testimonioEstrellasEtiqueta">Puntaje</span>
            <div className="estrellas-selector" id="testimonioEstrellasSelector" role="radiogroup" aria-labelledby="testimonioEstrellasEtiqueta">
              <button className="estrella-boton" type="button" role="radio" aria-checked="false" data-valor="1" aria-label="1 estrella">★</button>
              <button className="estrella-boton" type="button" role="radio" aria-checked="false" data-valor="2" aria-label="2 estrellas">★</button>
              <button className="estrella-boton" type="button" role="radio" aria-checked="false" data-valor="3" aria-label="3 estrellas">★</button>
              <button className="estrella-boton" type="button" role="radio" aria-checked="false" data-valor="4" aria-label="4 estrellas">★</button>
              <button className="estrella-boton" type="button" role="radio" aria-checked="true" data-valor="5" aria-label="5 estrellas">★</button>
              <span className="estrellas-texto" id="testimonioEstrellasTexto" aria-live="polite">Excelente</span>
            </div>
            <input type="hidden" id="testimonioEstrellas" name="estrellas" defaultValue="5" />
          </div>
          <div className="testimonio-campo">
            <label className="testimonio-etiqueta campo-label" htmlFor="testimonioTexto">Tu opinion <span aria-hidden="true">*</span></label>
            <textarea className="testimonio-texto campo-input" id="testimonioTexto" name="texto" rows="5" maxLength="600" aria-describedby="errorTestimonioTexto" />
            <span className="testimonio-error campo-error" id="errorTestimonioTexto"></span>
          </div>
          <div className="visually-hidden" aria-hidden="true">
            <label htmlFor="testimonioSitio">Dejá este campo vacío</label>
            <input id="testimonioSitio" name="sitio_web" type="text" tabIndex="-1" autoComplete="off" />
          </div>
          <p className="testimonio-error formulario-estado" id="testimonioEstado" role="status" aria-live="polite" hidden></p>
          <div className="testimonio-acciones">
            <button className="testimonio-btn-secundario" type="button" data-cerrar-dialogo="">Cerrar</button>
            <button className="testimonio-btn-primario boton boton-primario boton-bloque" id="testimonioEnviar" type="submit">
              <span id="testimonioEnviarTexto">Enviar opinión</span>
            </button>
          </div>
        </form>
      </dialog>
  )
}

export default DialogoTestimonio
