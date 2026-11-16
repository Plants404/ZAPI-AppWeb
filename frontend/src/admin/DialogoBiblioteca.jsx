function DialogoBiblioteca() {
  return (
      <dialog className="ed-dialogo" id="dialogoBiblioteca" aria-labelledby="dialogoBibliotecaTitulo">
        <div className="ed-modal" role="document">
          <header className="ed-modal-cabecera">
            <div className="ed-modal-titulo">
              <div className="ed-etiqueta" id="bibliotecaContexto">BIBLIOTECA</div>
              <h2 id="dialogoBibliotecaTitulo">Biblioteca de imágenes</h2>
            </div>
            <label className="ed-buscar">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input id="bibliotecaBuscar" type="search" placeholder="Buscar por nombre" autoComplete="off" aria-label="Buscar imagen por nombre" />
            </label>
            <button className="ed-cerrar" type="button" data-cerrar-biblioteca="" aria-label="Cerrar">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>
          <div className="ed-modal-cuerpo">
            <div className="ed-modal-principal">
              <div className="ed-filtros" id="bibliotecaFiltros" role="group" aria-label="Filtrar por tipo"></div>
              <div className="ed-zona-subida" id="bibliotecaZona" tabIndex="0" role="button" aria-label="Subir imágenes">
                <span className="material-symbols-outlined" aria-hidden="true">upload</span>
                <div>
                  <strong>Arrastrá fotos acá o <u>elegí desde tu equipo</u></strong>
                  <span id="bibliotecaEstado" role="status" aria-live="polite">JPG, PNG o WebP · las reducimos solas para que el sitio cargue rápido</span>
                </div>
              </div>
              <div className="ed-grilla" id="bibliotecaGrilla"></div>
            </div>
            <aside className="ed-modal-detalle" id="bibliotecaDetalle" aria-label="Detalle de la imagen"></aside>
          </div>
        </div>
      </dialog>
  )
}

export default DialogoBiblioteca
