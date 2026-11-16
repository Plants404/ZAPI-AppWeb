function DialogoVentaPresencial() {
  return (
      <dialog className="admin-dialog" id="dialogoVentaPresencial" aria-labelledby="dialogoVentaPresencialTitulo">
        <div className="admin-dialog-caja">
          <button className="admin-dialog-cerrar" type="button" data-cerrar-dialogo="" aria-label="Cerrar">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <span className="etiqueta">Venta presencial</span>
          <h2 id="dialogoVentaPresencialTitulo">Nueva venta presencial</h2>
          <form id="formVentaPresencial" noValidate>
            <div className="admin-campo">
              <label className="campo-label" htmlFor="ventaClienteNombre">Nombre del cliente <span aria-hidden="true">*</span></label>
              <input className="campo-input" id="ventaClienteNombre" name="nombre" type="text" autoComplete="name" maxLength="120" required />
              <span className="campo-error" id="errorVentaClienteNombre"></span>
            </div>
            <div className="admin-campo">
              <label className="campo-label" htmlFor="ventaClienteTelefono">Teléfono <span aria-hidden="true">*</span></label>
              <input className="campo-input" id="ventaClienteTelefono" name="telefono" type="tel" autoComplete="tel" maxLength="40" required />
              <span className="campo-error" id="errorVentaClienteTelefono"></span>
            </div>
            <div className="admin-campo admin-campo-lineas">
              <label className="campo-label" htmlFor="ventaProducto">Líneas de producto</label>
              <div id="ventaLineas" className="admin-lineas-venta"></div>
              <button className="boton boton-texto" type="button" id="adminAgregarLineaVenta">
                <span className="material-symbols-outlined" aria-hidden="true">add</span> Agregar línea
              </button>
            </div>
            <div className="admin-total-venta">
              <span className="admin-total-venta-label">Total</span>
              <span className="admin-total-valor" id="ventaTotal">$0</span>
            </div>
            <p className="formulario-estado" id="estadoVentaPresencial" role="status" aria-live="polite" hidden></p>
          </form>
          <div className="admin-dialog-acciones">
            <button className="boton boton-texto" type="button" data-cerrar-dialogo="">Cancelar</button>
            <button className="boton boton-primario" id="adminGuardarVentaPresencial" type="submit">Crear venta</button>
          </div>
        </div>
      </dialog>
  )
}

export default DialogoVentaPresencial
