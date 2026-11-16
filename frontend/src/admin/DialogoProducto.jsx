function DialogoProducto() {
  return (
      <dialog className="admin-dialog" id="dialogoProducto" aria-labelledby="dialogoProductoTitulo">
        <div className="admin-dialog-caja admin-dialog-ancho">
          <button className="admin-dialog-cerrar" type="button" data-cerrar-dialogo="" aria-label="Cerrar">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <span className="etiqueta">Catálogo y stock</span>
          <h2 id="dialogoProductoTitulo">Nuevo producto</h2>
          <form id="formProducto" noValidate>
            <div className="admin-campo admin-campo-dos">
              <div>
                <label className="campo-label" htmlFor="prodNombre">Nombre <span aria-hidden="true">*</span></label>
                <input className="campo-input" id="prodNombre" name="nombre" type="text" maxLength="160" required />
                <span className="campo-error" id="errorProdNombre"></span>
              </div>
              <div>
                <label className="campo-label" htmlFor="prodSlug">Slug <span aria-hidden="true">*</span></label>
                <input className="campo-input" id="prodSlug" name="slug" type="text" maxLength="120" placeholder="ej. maceta-terracota" required />
                <span className="campo-error" id="errorProdSlug"></span>
              </div>
            </div>
            <div className="admin-campo">
              <label className="campo-label" htmlFor="prodCategoria">Categoría</label>
              <input className="campo-input" id="prodCategoria" name="categoria" type="text" maxLength="80" list="prodCategorias" />
              <datalist id="prodCategorias"></datalist>
            </div>
            <div className="admin-campo">
              <label className="campo-label" htmlFor="prodDescripcion">Descripción</label>
              <textarea className="campo-input" id="prodDescripcion" name="descripcion" rows="3" maxLength="1000" />
            </div>
            <div className="admin-campo admin-campo-dos">
              <div>
                <label className="campo-label" htmlFor="prodPrecio">Precio <span aria-hidden="true">*</span></label>
                <input className="campo-input" id="prodPrecio" name="precioBase" type="number" min="0" step="0.01" required />
                <span className="campo-error" id="errorProdPrecio"></span>
              </div>
              <div>
                <label className="campo-label" htmlFor="prodStock">Stock <span aria-hidden="true">*</span></label>
                <input className="campo-input" id="prodStock" name="stock" type="number" min="0" step="1" required />
                <span className="campo-error" id="errorProdStock"></span>
              </div>
            </div>
            <div className="admin-campo admin-campo-tres">
              <div>
                <label className="campo-label" htmlFor="prodVisible">Visible</label>
                <select className="campo-input" id="prodVisible" name="visible">
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="campo-label" htmlFor="prodActivo">Activo</label>
                <select className="campo-input" id="prodActivo" name="active">
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="campo-label" htmlFor="prodDestacado">Destacado</label>
                <select className="campo-input" id="prodDestacado" name="destacado">
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>
            </div>
            <div className="admin-campo">
              <label className="campo-label" htmlFor="prodInfo">Información de venta</label>
              <textarea className="campo-input" id="prodInfo" name="infoDeVenta" rows="3" placeholder="Una línea por dato" />
              <span className="admin-ayuda">Una línea por dato (hasta 8).</span>
            </div>
            <fieldset className="admin-campo admin-imagenes">
              <legend className="campo-label">Imágenes</legend>
              <ul className="admin-galeria" id="prodGaleria"></ul>
              <p className="admin-ayuda" id="prodGaleriaVacia">Todavía no hay imágenes. La primera es la principal.</p>
              <div className="admin-imagenes-acciones">
                <label className="boton boton-secundario admin-subir" htmlFor="prodArchivos">
                  <span className="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span> Subir imágenes
                </label>
                <input className="admin-archivo" id="prodArchivos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
              </div>
              <div className="admin-imagenes-url">
                <label className="campo-label" htmlFor="prodUrl">O pegá una URL https</label>
                <div className="admin-fila-url">
                  <input className="campo-input" id="prodUrl" type="url" maxLength="480" placeholder="https://..." />
                  <button className="boton boton-texto" id="prodAgregarUrl" type="button">Agregar</button>
                </div>
              </div>
            </fieldset>
            <p className="formulario-estado" id="estadoProducto" role="status" aria-live="polite" hidden></p>
          </form>
          <div className="admin-dialog-acciones">
            <button className="boton boton-texto" type="button" data-cerrar-dialogo="">Cancelar</button>
            <button className="boton boton-primario" id="adminGuardarProducto" type="submit" form="formProducto">Guardar producto</button>
          </div>
        </div>
      </dialog>
  )
}

export default DialogoProducto
