'use strict';

/* Productos y stock: listado con filtros, alta y edición, desactivación y
   registro de entradas, ajustes y mermas con historial de movimientos. */

let productosPagina = 1;
let productoActual = null;
let productoStock = null;
let productosActualesCache = [];

function filaProducto(producto) {
    const estado = producto.activo
        ? '<span class="admin-etiqueta-estado estado-activo">Activo</span>'
        : '<span class="admin-etiqueta-estado estado-bloqueado">Inactivo</span>';
    const stockBajo = producto.stock <= producto.stockMinimo;
    const imagen = producto.imagen
        ? `<img src="${escaparHTML(adminUrlImagen(producto.imagen))}" alt="" width="36" height="42" loading="lazy">`
        : '';

    return `
        <tr>
            <td class="admin-celda-principal">
                <div class="admin-producto-mini">
                    ${imagen}
                    <div>
                        <strong>${escaparHTML(producto.nombre)}</strong>
                        <small>#${producto.productoId} · ${escaparHTML(producto.slug)}</small>
                    </div>
                </div>
            </td>
            <td>${escaparHTML(producto.categoria)}</td>
            <td class="numero">${formatearPrecio(producto.precio)}</td>
            <td class="numero">${formatearPrecio(producto.costo)}</td>
            <td class="numero${stockBajo ? ' admin-stock-bajo' : ''}">${producto.stock} / ${producto.stockMinimo}</td>
            <td>${estado}</td>
            <td>
                <div class="admin-acciones">
                    <button class="boton-texto" type="button" data-editar-producto="${escaparHTML(producto.id)}">Editar</button>
                    <button class="boton-texto" type="button" data-stock-producto="${escaparHTML(producto.id)}">Stock</button>
                    ${producto.activo ? `<button class="boton-texto" type="button" data-desactivar-producto="${escaparHTML(producto.id)}">Desactivar</button>` : ''}
                </div>
            </td>
        </tr>`;
}

function pintarProductos(datos) {
    const cuerpo = document.getElementById('productosTabla');

    productosActualesCache = datos.productos;

    if (!cuerpo) return;

    if (!datos.productos.length) {
        cuerpo.innerHTML = '<tr><td colspan="7"><div class="admin-vacio">No hay productos con esos filtros.</div></td></tr>';
    } else {
        cuerpo.innerHTML = datos.productos.map(filaProducto).join('');
    }

    adminPaginar(document.getElementById('productosPaginacion'), datos, irAPaginaProductos);
}

async function cargarProductos(pagina = 1) {
    const formulario = document.getElementById('productosFiltros');
    const estado = document.getElementById('productosEstado');
    const parametros = adminLeerFormulario(formulario);

    productosPagina = pagina;
    parametros.set('pagina', String(pagina));

    try {
        const datos = await adminPedir('/api/admin/productos?' + parametros.toString());
        pintarProductos(datos);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function irAPaginaProductos(pagina) {
    if (pagina < 1) return;
    cargarProductos(pagina);
}

async function cargarCategorias() {
    const filtro = document.getElementById('productosCategoria');
    const lista = document.getElementById('productosCategoriasLista');

    try {
        const datos = await adminPedir('/api/admin/productos/categorias');

        if (filtro) {
            const valor = filtro.value;
            adminRellenarSelect(filtro, datos.categorias, 'Todas las categorías');
            filtro.value = valor;
        }

        if (lista) {
            lista.innerHTML = datos.categorias
                .map(categoria => `<option value="${escaparHTML(categoria)}"></option>`)
                .join('');
        }
    } catch {
        /* Las categorías son una ayuda: el formulario acepta texto libre. */
    }
}

function abrirNuevoProducto() {
    const formulario = document.getElementById('productoForm');
    const titulo = document.getElementById('productoDialogoTitulo');
    const estado = document.getElementById('productoFormEstado');

    productoActual = null;

    if (formulario) formulario.reset();

    const activo = document.getElementById('productoActivo');
    if (activo) activo.checked = true;

    if (titulo) titulo.textContent = 'Nuevo producto';
    adminEstado(estado, '', '');
    adminAbrirDialogo('productoDialogo');
}

function llenarProducto(producto) {
    const campos = {
        productoNombre: producto.nombre,
        productoCategoria: producto.categoria,
        productoPrecio: producto.precio,
        productoCosto: producto.costo,
        productoStock: producto.stock,
        productoStockMinimo: producto.stockMinimo,
        productoDescripcion: producto.descripcion,
        productoImagenes: (producto.imagenes || []).join('\n'),
        productoInfo: (producto.infoDeVenta || []).join('\n')
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor === undefined || valor === null ? '' : valor;
    });

    const destacado = document.getElementById('productoDestacado');
    const activo = document.getElementById('productoActivo');

    if (destacado) destacado.checked = Boolean(producto.destacado);
    if (activo) activo.checked = Boolean(producto.activo);
}

async function abrirEdicion(id) {
    const estado = document.getElementById('productoFormEstado');

    try {
        const datos = await adminPedir('/api/admin/productos/' + encodeURIComponent(id));
        const producto = datos.producto;

        productoActual = producto;
        llenarProducto(producto);

        const titulo = document.getElementById('productoDialogoTitulo');
        if (titulo) titulo.textContent = 'Editar ' + producto.nombre;

        adminEstado(estado, '', '');
        adminAbrirDialogo('productoDialogo');
    } catch (error) {
        adminEstado(document.getElementById('productosEstado'), mensajeDeError(error), 'error');
    }
}

function leerLineas(id) {
    const campo = document.getElementById(id);

    if (!campo) return [];

    return campo.value
        .split('\n')
        .map(linea => linea.trim())
        .filter(Boolean);
}

function cuerpoProducto() {
    const valor = id => {
        const campo = document.getElementById(id);
        return campo ? campo.value.trim() : '';
    };
    const marcado = id => {
        const campo = document.getElementById(id);
        return Boolean(campo && campo.checked);
    };

    return {
        nombre: valor('productoNombre'),
        categoria: valor('productoCategoria'),
        precio: Number(valor('productoPrecio')),
        costo: Number(valor('productoCosto') || 0),
        stock: Number(valor('productoStock') || 0),
        stockMinimo: Number(valor('productoStockMinimo') || 0),
        descripcion: valor('productoDescripcion'),
        imagenes: leerLineas('productoImagenes'),
        infoDeVenta: leerLineas('productoInfo'),
        destacado: marcado('productoDestacado'),
        activo: marcado('productoActivo')
    };
}

async function guardarProducto(evento) {
    evento.preventDefault();

    const estado = document.getElementById('productoFormEstado');
    const boton = document.querySelector('#productoForm button[type="submit"]');
    const cuerpo = cuerpoProducto();

    if (!cuerpo.imagenes.length) {
        adminEstado(estado, 'Agregá al menos una foto del producto.', 'error');
        return;
    }

    adminBloquearBoton(boton, true, 'Guardando…');
    adminEstado(estado, '', '');

    try {
        const datos = productoActual
            ? await adminPedir('/api/admin/productos/' + encodeURIComponent(productoActual.id), {
                method: 'PUT',
                body: cuerpo
            })
            : await adminPedir('/api/admin/productos', {
                method: 'POST',
                body: cuerpo
            });

        adminCerrarDialogo(document.getElementById('productoDialogo'));
        await Promise.all([cargarProductos(productosPagina), cargarCategorias()]);

        adminEstado(
            document.getElementById('productosEstado'),
            'Producto ' + datos.producto.nombre + ' guardado.',
            'ok'
        );
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Guardar producto');
    }
}

async function desactivarProducto(id) {
    const confirmado = window.confirm('¿Desactivar este producto? Dejará de mostrarse en el catálogo público.');

    if (!confirmado) return;

    const estado = document.getElementById('productosEstado');

    try {
        const datos = await adminPedir('/api/admin/productos/' + encodeURIComponent(id), { method: 'DELETE' });
        await cargarProductos(productosPagina);
        adminEstado(estado, 'Producto ' + datos.producto.nombre + ' desactivado.', 'ok');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function filaMovimiento(movimiento) {
    const usuario = movimiento.usuario ? movimiento.usuario.nombre : 'Sistema';
    const signo = movimiento.cantidad > 0 ? '+' : '';

    return `
        <tr>
            <td>${escaparHTML(adminFecha(movimiento.fecha))}</td>
            <td>${escaparHTML(movimiento.tipo)}</td>
            <td class="numero">${signo}${movimiento.cantidad}</td>
            <td class="numero">${movimiento.stockAnterior} → ${movimiento.stockNuevo}</td>
            <td>${escaparHTML(movimiento.motivo)}</td>
            <td>${escaparHTML(usuario)}</td>
        </tr>`;
}

async function cargarMovimientos() {
    const cuerpo = document.getElementById('stockTabla');

    if (!cuerpo || !productoStock) return;

    try {
        const datos = await adminPedir('/api/admin/productos/' + encodeURIComponent(productoStock.id) + '/movimientos?limite=50');

        cuerpo.innerHTML = datos.movimientos.length
            ? datos.movimientos.map(filaMovimiento).join('')
            : '<tr><td colspan="6"><div class="admin-vacio">Todavía no hay movimientos.</div></td></tr>';
    } catch (error) {
        cuerpo.innerHTML = '<tr><td colspan="6">' + escaparHTML(mensajeDeError(error)) + '</td></tr>';
    }
}

function abrirStock(id) {
    const producto = productosActualesCache.find(item => item.id === id);

    productoStock = producto || { id };
    const titulo = document.getElementById('stockDialogoTitulo');
    const formulario = document.getElementById('stockForm');

    if (formulario) formulario.reset();

    if (titulo) {
        titulo.textContent = producto
            ? 'Movimientos de ' + producto.nombre + ' (stock ' + producto.stock + ')'
            : 'Movimientos de stock';
    }

    adminEstado(document.getElementById('stockEstado'), '', '');
    actualizarCamposStock();
    adminAbrirDialogo('stockDialogo');
    cargarMovimientos();
}

function actualizarCamposStock() {
    const tipo = document.getElementById('stockTipo');
    const cantidad = document.getElementById('stockCantidad');
    const stockNuevo = document.getElementById('stockNuevo');
    const valor = tipo ? tipo.value : 'entrada';

    if (cantidad) {
        cantidad.disabled = valor === 'ajuste';
        cantidad.required = valor !== 'ajuste';
    }

    if (stockNuevo) {
        stockNuevo.disabled = valor !== 'ajuste';
        stockNuevo.required = valor === 'ajuste';
    }
}

async function guardarMovimiento(evento) {
    evento.preventDefault();

    if (!productoStock) return;

    const estado = document.getElementById('stockEstado');
    const boton = document.querySelector('#stockForm button[type="submit"]');
    const tipo = document.getElementById('stockTipo').value;
    const motivo = document.getElementById('stockMotivo').value.trim();
    const cuerpo = { tipo, motivo };

    if (tipo === 'ajuste') {
        cuerpo.stockNuevo = Number(document.getElementById('stockNuevo').value);
    } else {
        cuerpo.cantidad = Number(document.getElementById('stockCantidad').value);
    }

    adminBloquearBoton(boton, true, 'Registrando…');
    adminEstado(estado, '', '');

    try {
        const datos = await adminPedir(
            '/api/admin/productos/' + encodeURIComponent(productoStock.id) + '/movimientos',
            { method: 'POST', body: cuerpo }
        );

        productoStock = { ...productoStock, ...datos.producto };
        document.getElementById('stockForm').reset();
        actualizarCamposStock();

        const titulo = document.getElementById('stockDialogoTitulo');
        if (titulo) titulo.textContent = 'Movimientos de ' + datos.producto.nombre + ' (stock ' + datos.producto.stock + ')';

        adminEstado(estado, 'Movimiento registrado. Stock actual: ' + datos.producto.stock + '.', 'ok');
        await Promise.all([cargarMovimientos(), cargarProductos(productosPagina)]);
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    } finally {
        adminBloquearBoton(boton, false, 'Registrar movimiento');
    }
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('productosFiltros');
    const parametros = new URLSearchParams(window.location.search);
    const busqueda = document.getElementById('productosBuscar');
    const nuevo = document.getElementById('productoNuevo');
    const formularioProducto = document.getElementById('productoForm');
    const formularioStock = document.getElementById('stockForm');
    const tipoStock = document.getElementById('stockTipo');

    if (busqueda && parametros.get('q')) busqueda.value = parametros.get('q');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarProductos(1);
        });

        formulario.addEventListener('reset', () => {
            window.setTimeout(() => cargarProductos(1), 0);
        });
    }

    if (nuevo) nuevo.addEventListener('click', abrirNuevoProducto);
    if (formularioProducto) formularioProducto.addEventListener('submit', guardarProducto);
    if (formularioStock) formularioStock.addEventListener('submit', guardarMovimiento);
    if (tipoStock) tipoStock.addEventListener('change', actualizarCamposStock);

    document.addEventListener('click', evento => {
        const editar = evento.target.closest('[data-editar-producto]');
        const stock = evento.target.closest('[data-stock-producto]');
        const desactivar = evento.target.closest('[data-desactivar-producto]');

        if (editar) abrirEdicion(editar.dataset.editarProducto);
        if (stock) abrirStock(stock.dataset.stockProducto);
        if (desactivar) desactivarProducto(desactivar.dataset.desactivarProducto);
    });

    cargarCategorias();
    cargarProductos(1);
});
