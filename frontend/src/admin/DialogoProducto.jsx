import { useState } from 'react'
import { crearProductoAdmin, editarProductoAdmin, resolverImagen, subirImagenAdmin } from '../api.js'
import { limpiarValor } from '../utilidades.js'
import { useAdmin } from './contexto.jsx'
import AdminDialogo from './AdminDialogo.jsx'
import { reducirImagen } from './imagenes.js'

const MAX_IMAGENES = 12

function formularioInicial(producto) {
  const valor = (campo, defecto) => (producto ? producto[campo] : defecto)
  return {
    nombre: valor('nombre', ''),
    slug: valor('slug', ''),
    categoria: valor('categoria', ''),
    descripcion: valor('descripcion', ''),
    precio: String(valor('precioBase', '')),
    stock: String(valor('stock', 8)),
    visible: String(valor('visible', true)),
    activo: String(valor('active', true)),
    destacado: String(valor('destacado', false)),
    info: producto ? (producto.infoDeVenta || []).join('\n') : ''
  }
}

// Alta y edición de un producto (datos + imágenes). "producto" es null para uno nuevo.
// El panel lo monta solo cuando hay que mostrarlo, así siempre arranca con los datos correctos.
function DialogoProducto({ producto, productos, alCerrar, alGuardar }) {
  const { avisar } = useAdmin()
  const [form, setForm] = useState(() => formularioInicial(producto))
  const [imagenes, setImagenes] = useState(() => (producto ? [...(producto.imagenes && producto.imagenes.length ? producto.imagenes : (producto.imagen ? [producto.imagen] : []))] : []))
  const [url, setUrl] = useState('')
  const [errores, setErrores] = useState({})
  const [estado, setEstado] = useState({ mensaje: '', tipo: '' })
  const [guardando, setGuardando] = useState(false)

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
  const campo = nombre => ({ value: form[nombre], onChange: e => setForm(f => ({ ...f, [nombre]: e.target.value })) })
  const claseCampo = nombre => 'campo-input' + (errores[nombre] ? ' campo-con-error' : '')
  const invalido = nombre => (errores[nombre] ? 'true' : undefined)

  async function subir(evento) {
    const archivos = [...evento.target.files]
    evento.target.value = ''
    let cantidad = imagenes.length
    for (const archivo of archivos) {
      if (cantidad >= MAX_IMAGENES) {
        setEstado({ mensaje: `Máximo ${MAX_IMAGENES} imágenes por producto.`, tipo: 'error' })
        break
      }
      try {
        setEstado({ mensaje: `Subiendo ${archivo.name}...`, tipo: 'info' })
        const blob = await reducirImagen(archivo)
        const datos = await subirImagenAdmin(blob)
        setImagenes(lista => [...lista, datos.url])
        cantidad += 1
        setEstado({ mensaje: '', tipo: '' })
      } catch (error) {
        setEstado({ mensaje: `No se pudo subir ${archivo.name}: ${error.message}`, tipo: 'error' })
      }
    }
  }

  function agregarUrl() {
    const valor = url.trim()
    if (!/^https:\/\/[^\s"'<>]{4,480}$/.test(valor)) {
      setEstado({ mensaje: 'Ingresá una URL que empiece con https://', tipo: 'error' })
      return
    }
    if (imagenes.length >= MAX_IMAGENES) {
      setEstado({ mensaje: `Máximo ${MAX_IMAGENES} imágenes por producto.`, tipo: 'error' })
      return
    }
    setImagenes(lista => (lista.includes(valor) ? lista : [...lista, valor]))
    setUrl('')
    setEstado({ mensaje: '', tipo: '' })
  }

  const quitarImagen = indice => setImagenes(lista => lista.filter((_, i) => i !== indice))
  const hacerPrincipal = indice => setImagenes(lista => [lista[indice], ...lista.filter((_, i) => i !== indice)])

  async function guardar(evento) {
    evento.preventDefault()
    const slug = limpiarValor(form.slug)
    const nombre = limpiarValor(form.nombre)
    const precioTexto = form.precio.trim()
    const stockTexto = form.stock.trim()
    const precio = Number(precioTexto)
    const stock = Number(stockTexto)

    const nuevos = {}
    if (!nombre) nuevos.nombre = 'Ingresá un nombre.'
    if (!slug) nuevos.slug = 'Ingresá un slug.'
    else if (!/^[a-z0-9-]+$/.test(slug)) nuevos.slug = 'Usá solo minúsculas, números y guiones.'
    if (precioTexto === '' || !Number.isFinite(precio) || precio < 0) nuevos.precio = 'Ingresá un precio válido.'
    if (stockTexto === '' || !Number.isInteger(stock) || stock < 0) nuevos.stock = 'Ingresá un stock entero válido.'
    setErrores(nuevos)
    const primero = Object.values(nuevos)[0]
    if (primero) { setEstado({ mensaje: primero, tipo: 'error' }); return }
    setEstado({ mensaje: '', tipo: '' })

    const cuerpo = {
      slug,
      nombre,
      categoria: limpiarValor(form.categoria),
      descripcion: limpiarValor(form.descripcion),
      precioBase: precio,
      stock,
      visible: form.visible === 'true',
      active: form.activo === 'true',
      destacado: form.destacado === 'true',
      infoDeVenta: form.info.split('\n').map(l => l.trim()).filter(Boolean),
      imagenes,
      imagen: imagenes[0] || ''
    }

    setGuardando(true)
    try {
      if (producto) await editarProductoAdmin(producto.id, cuerpo)
      else await crearProductoAdmin(cuerpo)
      avisar(producto ? 'Producto actualizado' : 'Producto creado', producto ? 'Los cambios se guardaron correctamente.' : 'El producto se agregó al catálogo.')
      alCerrar()
      alGuardar()
    } catch (error) {
      setEstado({ mensaje: error.message, tipo: 'error' })
      setGuardando(false)
    }
  }

  return (
    <AdminDialogo
      id="dialogoProducto"
      etiqueta="Catálogo y stock"
      titulo={producto ? `Editar producto #${producto.id}` : 'Nuevo producto'}
      ancho
      abierto
      alCerrar={alCerrar}
      acciones={(
        <>
          <button className="boton boton-texto" type="button" onClick={alCerrar}>Cancelar</button>
          <button className="boton boton-primario" id="adminGuardarProducto" type="submit" form="formProducto" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar producto'}</button>
        </>
      )}
    >
      <form id="formProducto" noValidate onSubmit={guardar}>
        <div className="admin-campo admin-campo-dos">
          <div>
            <label className="campo-label" htmlFor="prodNombre">Nombre <span aria-hidden="true">*</span></label>
            <input className={claseCampo('nombre')} id="prodNombre" name="nombre" type="text" maxLength="160" required aria-invalid={invalido('nombre')} {...campo('nombre')} />
            <span className="campo-error" id="errorProdNombre">{errores.nombre}</span>
          </div>
          <div>
            <label className="campo-label" htmlFor="prodSlug">Slug <span aria-hidden="true">*</span></label>
            <input className={claseCampo('slug')} id="prodSlug" name="slug" type="text" maxLength="120" placeholder="ej. maceta-terracota" required aria-invalid={invalido('slug')} {...campo('slug')} />
            <span className="campo-error" id="errorProdSlug">{errores.slug}</span>
          </div>
        </div>
        <div className="admin-campo">
          <label className="campo-label" htmlFor="prodCategoria">Categoría</label>
          <input className="campo-input" id="prodCategoria" name="categoria" type="text" maxLength="80" list="prodCategorias" {...campo('categoria')} />
          <datalist id="prodCategorias">{categorias.map(c => <option key={c} value={c}></option>)}</datalist>
        </div>
        <div className="admin-campo">
          <label className="campo-label" htmlFor="prodDescripcion">Descripción</label>
          <textarea className="campo-input" id="prodDescripcion" name="descripcion" rows="3" maxLength="1000" {...campo('descripcion')} />
        </div>
        <div className="admin-campo admin-campo-dos">
          <div>
            <label className="campo-label" htmlFor="prodPrecio">Precio <span aria-hidden="true">*</span></label>
            <input className={claseCampo('precio')} id="prodPrecio" name="precioBase" type="number" min="0" step="0.01" required aria-invalid={invalido('precio')} {...campo('precio')} />
            <span className="campo-error" id="errorProdPrecio">{errores.precio}</span>
          </div>
          <div>
            <label className="campo-label" htmlFor="prodStock">Stock <span aria-hidden="true">*</span></label>
            <input className={claseCampo('stock')} id="prodStock" name="stock" type="number" min="0" step="1" required aria-invalid={invalido('stock')} {...campo('stock')} />
            <span className="campo-error" id="errorProdStock">{errores.stock}</span>
          </div>
        </div>
        <div className="admin-campo admin-campo-tres">
          <div>
            <label className="campo-label" htmlFor="prodVisible">Visible</label>
            <select className="campo-input" id="prodVisible" name="visible" {...campo('visible')}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="campo-label" htmlFor="prodActivo">Activo</label>
            <select className="campo-input" id="prodActivo" name="active" {...campo('activo')}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="campo-label" htmlFor="prodDestacado">Destacado</label>
            <select className="campo-input" id="prodDestacado" name="destacado" {...campo('destacado')}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </div>
        </div>
        <div className="admin-campo">
          <label className="campo-label" htmlFor="prodInfo">Información de venta</label>
          <textarea className="campo-input" id="prodInfo" name="infoDeVenta" rows="3" placeholder="Una línea por dato" {...campo('info')} />
          <span className="admin-ayuda">Una línea por dato (hasta 8).</span>
        </div>
        <fieldset className="admin-campo admin-imagenes">
          <legend className="campo-label">Imágenes</legend>
          <ul className="admin-galeria" id="prodGaleria">
            {imagenes.map((ruta, indice) => (
              <li className={'admin-galeria-item' + (indice === 0 ? ' es-principal' : '')} key={ruta}>
                <img src={resolverImagen(ruta)} alt={'Imagen ' + (indice + 1)} loading="lazy" />
                {indice === 0 && <span className="admin-galeria-marca">Principal</span>}
                <div className="admin-galeria-botones">
                  {indice !== 0 && <button className="boton boton-texto" type="button" onClick={() => hacerPrincipal(indice)}>Principal</button>}
                  <button className="boton boton-texto" type="button" onClick={() => quitarImagen(indice)}>Quitar</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="admin-ayuda" id="prodGaleriaVacia" hidden={imagenes.length > 0}>Todavía no hay imágenes. La primera es la principal.</p>
          <div className="admin-imagenes-acciones">
            <label className="boton boton-secundario admin-subir" htmlFor="prodArchivos">
              <span className="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span> Subir imágenes
            </label>
            <input className="admin-archivo" id="prodArchivos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={subir} />
          </div>
          <div className="admin-imagenes-url">
            <label className="campo-label" htmlFor="prodUrl">O pegá una URL https</label>
            <div className="admin-fila-url">
              <input className="campo-input" id="prodUrl" type="url" maxLength="480" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
              <button className="boton boton-texto" id="prodAgregarUrl" type="button" onClick={agregarUrl}>Agregar</button>
            </div>
          </div>
        </fieldset>
        <p className={'formulario-estado' + (estado.tipo ? ' estado-' + estado.tipo : '')} id="estadoProducto" role="status" aria-live="polite" hidden={!estado.mensaje}>{estado.mensaje}</p>
      </form>
    </AdminDialogo>
  )
}

export default DialogoProducto
