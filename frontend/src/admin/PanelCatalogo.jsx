function PanelCatalogo() {
  return (
      <section className="admin-panel" id="panelCatalogo" hidden aria-label="Catálogo y stock">
        <div className="admin-panel-cabecera">
          <h1>Catálogo y stock</h1>
          <p>Todos los productos, incluidos los inactivos.</p>
          <div className="admin-panel-herramientas">
            <button className="boton boton-primario" id="adminNuevoProducto" type="button">Nuevo producto</button>
          </div>
        </div>
        <div className="admin-tabla-wrap">
          <table className="admin-tabla" id="adminTablaCatalogo" aria-label="Productos">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Slug</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Stock</th>
                <th scope="col">Visible</th>
                <th scope="col">Activo</th>
                <th scope="col">Destacado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="adminCuerpoCatalogo"></tbody>
          </table>
          <p id="adminCatalogoVacio" className="estado-vacio" hidden>No hay productos cargados.</p>
        </div>
      </section>
  )
}

export default PanelCatalogo
