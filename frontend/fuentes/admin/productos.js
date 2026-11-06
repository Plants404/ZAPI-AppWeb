'use strict';

module.exports = {
    archivo: 'productos.html',
    seccion: 'productos',
    titulo: 'Productos y stock',
    descripcion: 'Catálogo, precios, costos y movimientos de stock de ZAPI.',
    contenido: `
<div class="admin-seccion-cabecera">
    <div>
        <span class="admin-etiqueta">Catálogo</span>
        <p>Creá, editá y desactivá productos. Cada cambio de stock queda registrado.</p>
    </div>
    <button class="boton boton-primario" type="button" id="productoNuevo">Nuevo producto</button>
</div>

<form class="admin-filtros" id="productosFiltros">
    <label class="visually-hidden" for="productosBuscar">Buscar</label>
    <input class="campo-input" id="productosBuscar" name="q" type="search" placeholder="Nombre, categoría o descripción">
    <select class="campo-input" id="productosCategoria" name="categoria"><option value="">Todas las categorías</option></select>
    <select class="campo-input" name="activo" aria-label="Estado">
        <option value="">Todos</option>
        <option value="1">Activos</option>
        <option value="0">Inactivos</option>
    </select>
    <label class="admin-check"><input type="checkbox" name="stockBajo" value="1"> Stock bajo</label>
    <button class="boton boton-primario" type="submit">Filtrar</button>
    <button class="boton boton-secundario" type="reset">Limpiar</button>
</form>

<p class="formulario-estado" id="productosEstado" role="status" aria-live="polite" hidden></p>

<div class="admin-card">
    <div class="admin-tabla-scroll">
        <table class="admin-tabla">
            <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody id="productosTabla"></tbody>
        </table>
    </div>
    <nav class="admin-paginacion" id="productosPaginacion" aria-label="Paginación de productos"></nav>
</div>

<dialog class="admin-dialogo" id="productoDialogo" aria-labelledby="productoDialogoTitulo">
    <form class="admin-dialogo-caja admin-dialogo-ancho" id="productoForm">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta">Producto</span><h2 id="productoDialogoTitulo">Nuevo producto</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div class="admin-form-grid">
            <div><label class="campo-label" for="productoNombre">Nombre</label><input class="campo-input" id="productoNombre" type="text" maxlength="200" required></div>
            <div><label class="campo-label" for="productoCategoria">Categoría</label><input class="campo-input" id="productoCategoria" type="text" maxlength="80" list="productosCategoriasLista" required><datalist id="productosCategoriasLista"></datalist></div>
            <div><label class="campo-label" for="productoPrecio">Precio</label><input class="campo-input" id="productoPrecio" type="number" min="1" step="1" required></div>
            <div><label class="campo-label" for="productoCosto">Costo</label><input class="campo-input" id="productoCosto" type="number" min="0" step="1" value="0"></div>
            <div><label class="campo-label" for="productoStock">Stock</label><input class="campo-input" id="productoStock" type="number" min="0" step="1" value="0"></div>
            <div><label class="campo-label" for="productoStockMinimo">Stock mínimo</label><input class="campo-input" id="productoStockMinimo" type="number" min="0" step="1" value="3"></div>
        </div>
        <label class="campo-label" for="productoDescripcion">Descripción</label>
        <textarea class="campo-input" id="productoDescripcion" rows="3" maxlength="1200" required></textarea>
        <label class="campo-label" for="productoImagenes">Fotos (una ruta o URL por línea)</label>
        <textarea class="campo-input" id="productoImagenes" rows="3"></textarea>
        <label class="campo-label" for="productoInfo">Ventajas (una por línea)</label>
        <textarea class="campo-input" id="productoInfo" rows="3"></textarea>
        <div class="admin-form-grid">
            <label class="admin-check"><input type="checkbox" id="productoDestacado"> Destacado</label>
            <label class="admin-check"><input type="checkbox" id="productoActivo" checked> Activo</label>
        </div>
        <p class="formulario-estado" id="productoFormEstado" role="status" aria-live="polite" hidden></p>
        <div class="admin-form-acciones">
            <button class="boton boton-primario" type="submit">Guardar producto</button>
            <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cancelar</button>
        </div>
    </form>
</dialog>

<dialog class="admin-dialogo" id="stockDialogo" aria-labelledby="stockDialogoTitulo">
    <div class="admin-dialogo-caja admin-dialogo-ancho">
        <header class="admin-dialogo-cabecera">
            <div><span class="admin-etiqueta">Inventario</span><h2 id="stockDialogoTitulo">Movimientos de stock</h2></div>
            <button class="icono-boton" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div class="admin-tabla-scroll">
            <table class="admin-tabla">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Stock</th><th>Motivo</th><th>Usuario</th></tr></thead>
                <tbody id="stockTabla"></tbody>
            </table>
        </div>
        <form class="admin-form" id="stockForm">
            <div class="admin-form-grid">
                <div><label class="campo-label" for="stockTipo">Tipo</label><select class="campo-input" id="stockTipo"><option value="entrada">Entrada</option><option value="ajuste">Ajuste</option><option value="merma">Merma</option></select></div>
                <div><label class="campo-label" for="stockCantidad">Cantidad (entrada o merma)</label><input class="campo-input" id="stockCantidad" type="number" min="1" step="1"></div>
                <div><label class="campo-label" for="stockNuevo">Stock nuevo (ajuste)</label><input class="campo-input" id="stockNuevo" type="number" min="0" step="1"></div>
                <div><label class="campo-label" for="stockMotivo">Motivo</label><input class="campo-input" id="stockMotivo" type="text" maxlength="300" required></div>
            </div>
            <p class="formulario-estado" id="stockEstado" role="status" aria-live="polite" hidden></p>
            <div class="admin-form-acciones">
                <button class="boton boton-primario" type="submit">Registrar movimiento</button>
                <button class="boton boton-secundario" type="button" data-cerrar-dialogo>Cerrar</button>
            </div>
        </form>
    </div>
</dialog>`,
    scripts: ['admin-productos.js']
};
