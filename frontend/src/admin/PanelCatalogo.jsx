// Panel "Catálogo": alta, edición, stock y orden de los productos.
import { useCallback, useState } from 'react'
import { obtenerProductosAdmin, resolverImagen } from '../api.js'
import { formatearPrecio, textoDeStock, claseDeStock } from '../data/negocio.js'
import { useCarga } from './contexto.jsx'
import DialogoProducto from './DialogoProducto.jsx'

function PanelCatalogo({ activo }) {
  const { datos, cargando, recargar } = useCarga(obtenerProductosAdmin, 'No se pudo cargar el catálogo', activo)
  const [edicion, setEdicion] = useState(undefined) // undefined = cerrado, null = producto nuevo, número = id
  const productos = (datos && Array.isArray(datos.products) ? datos.products : [])
  const cerrar = useCallback(() => setEdicion(undefined), [])

  return (
    <section className="admin-panel" id="panelCatalogo" hidden={!activo} aria-label="Catálogo y stock">
      <div className="admin-panel-cabecera">
        <h1>Catálogo y stock</h1>
        <p>Todos los productos, incluidos los inactivos.</p>
        <div className="admin-panel-herramientas">
          <button className="boton boton-primario" id="adminNuevoProducto" type="button" onClick={() => setEdicion(null)}>Nuevo producto</button>
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
          <tbody id="adminCuerpoCatalogo">
            {productos.map(p => (
              <tr id={'fila-producto-' + p.id} key={p.id}>
                <td className="admin-codigo">#{p.id}</td>
                <td>{p.slug}</td>
                <td>
                  <span className="admin-producto-nombre">
                    {p.imagen
                      ? <img className="admin-miniatura" src={resolverImagen(p.imagen)} alt="" loading="lazy" />
                      : <span className="admin-miniatura admin-miniatura-vacia" aria-hidden="true"></span>}
                    {p.nombre}
                  </span>
                </td>
                <td>{p.categoria}</td>
                <td className="admin-numero">{formatearPrecio(p.precioBase)}</td>
                <td><span className={'stock ' + claseDeStock(p.stock)}>{textoDeStock(p.stock)}</span></td>
                <td>{p.visible ? 'Sí' : 'No'}</td>
                <td>{p.active ? 'Sí' : 'No'}</td>
                <td>{p.destacado ? 'Sí' : 'No'}</td>
                <td className="admin-acciones"><button className="boton boton-texto" type="button" onClick={() => setEdicion(p.id)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p id="adminCatalogoVacio" className="estado-vacio" hidden={cargando || productos.length > 0}>No hay productos cargados.</p>
      </div>
      {edicion !== undefined && (
        <DialogoProducto
          producto={edicion === null ? null : productos.find(p => p.id === edicion) || null}
          productos={productos}
          alCerrar={cerrar}
          alGuardar={recargar}
        />
      )}
    </section>
  )
}

export default PanelCatalogo
