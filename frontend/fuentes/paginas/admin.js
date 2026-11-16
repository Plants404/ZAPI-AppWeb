'use strict';

/* Fuente de la página de administración de ZAPI.
   Genera frontend/admin.html vía frontend/tools/construir.js.
   Usa armazón propio (barra superior + menú lateral) y no es indexable. */

module.exports = {
    archivo: 'admin.html',
    seccion: 'admin',
    titulo: 'Panel de administración | ZAPI Vivero Agroecológico',
    descripcion: 'Panel de lectura para la administración de ZAPI: resumen, pedidos, ventas y catálogo. Solo acceso de administradores, no indexable.',
    robots: 'noindex, nofollow',
    armazonPropio: true,
    claseBody: 'admin-page',
    scripts: ['admin.js'],
    contenido: `
    <div class="admin-shell">
        <header class="admin-topbar" id="adminTopbar">
            <div class="admin-topbar-inicio">
                <button class="admin-boton-menu" id="adminBotonMenu" type="button" aria-expanded="false" aria-controls="adminSidebar" aria-label="Abrir menú de navegación">
                    <span class="material-symbols-outlined" aria-hidden="true">menu</span>
                </button>
                <div class="admin-marca">
                    <img class="admin-marca-logo" src="./public/img/logo.svg" alt="" width="34" height="48">
                    <strong class="admin-marca-titulo">ZAPI</strong>
                    <span class="admin-marca-sub">Admin</span>
                </div>
            </div>
            <div class="admin-topbar-centro">
                <div class="admin-modo" role="group" aria-label="Modo de visualización del panel">
                    <span class="admin-modo-texto">Modo</span>
                    <select class="admin-select" id="adminModo" aria-label="Cambiar modo">
                        <option value="admin">Administrador</option>
                        <option value="cliente">Ver como cliente</option>
                    </select>
                </div>
                <a class="admin-boton-barra" href="./index.html" target="_blank" rel="noopener" id="adminVerSitio">
                    <span class="material-symbols-outlined" aria-hidden="true">public</span><span class="admin-boton-barra-texto">Ver sitio web</span>
                </a>
                <button class="admin-boton-barra admin-boton-barra-salir" type="button" id="adminCerrarSesion">
                    <span class="material-symbols-outlined" aria-hidden="true">logout</span><span class="admin-boton-barra-texto">Cerrar sesión</span>
                </button>
            </div>
        </header>

        <nav class="admin-sidebar" id="adminSidebar" aria-label="Menú del panel de administración" hidden>
            <div class="admin-sidebar-fondo" data-cerrar-sidebar aria-hidden="true"></div>
            <div class="admin-sidebar-caja">
                <button class="admin-boton-cerrar" type="button" data-cerrar-sidebar aria-label="Cerrar menú">
                    <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
                <ul class="admin-menu">
                    <li><a class="admin-menu-enlace admin-menu-enlace-activo" href="#" data-panel="resumen" aria-current="true"><span class="material-symbols-outlined" aria-hidden="true">dashboard</span><span class="admin-menu-texto">Resumen</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="auditoria"><span class="material-symbols-outlined" aria-hidden="true">history</span><span class="admin-menu-texto">Últimos cambios</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="pedidos"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span><span class="admin-menu-texto">Pedidos y ventas</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="catalogo"><span class="material-symbols-outlined" aria-hidden="true">inventory</span><span class="admin-menu-texto">Catálogo y stock</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="estilo"><span class="material-symbols-outlined" aria-hidden="true">palette</span><span class="admin-menu-texto">Estilo del sitio</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="analitica"><span class="material-symbols-outlined" aria-hidden="true">bar_chart</span><span class="admin-menu-texto">Analítica de clientes</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="mensajes"><span class="material-symbols-outlined" aria-hidden="true">message</span><span class="admin-menu-texto">Mensajes</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="testimonios"><span class="material-symbols-outlined" aria-hidden="true">rate_review</span><span class="admin-menu-texto">Testimonios</span></a></li>
                    <li><a class="admin-menu-enlace" href="#" data-panel="accesos"><span class="material-symbols-outlined" aria-hidden="true">people</span><span class="admin-menu-texto">Accesos</span></a></li>
                </ul>
            </div>
        </nav>

        <main class="admin-main" id="adminMain">
            <div id="adminAviso" role="status" aria-live="polite" hidden>
                <button class="admin-boton-cerrar-aviso" type="button" data-cerrar-aviso aria-label="Cerrar aviso"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
                <div class="admin-aviso-contenido"><strong id="adminAvisoTitulo"></strong><span id="adminAvisoMensaje"></span></div>
            </div>


            <section class="admin-panel" id="panelResumen" aria-label="Resumen">
                <div class="admin-panel-cabecera">
                    <h1>Resumen</h1>
                    <p>Datos de solo lectura del panel de administración.</p>
                </div>
                <div class="admin-tarjetas" id="adminTarjetas"></div>
                <div class="admin-bloque">
                    <h2>Ventas por semana (últimas 8 semanas)</h2>
                    <div class="admin-grafico-wrap">
                        <svg class="admin-grafico" id="adminGraficoSVG" aria-label="Ventas por semana y canal" role="img"></svg>
                        <p id="adminGraficoVacio" class="estado-vacio" hidden>No hay datos de ventas para mostrar.</p>
                    </div>
                </div>
                <div class="admin-bloque">
                    <h2>Stock bajo (1 a 3 unidades)</h2>
                    <div class="admin-tabla-wrap" id="adminStockBajoWrap"></div>
                    <p id="adminStockBajoVacio" class="estado-vacio" hidden>No hay productos con stock bajo.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelPedidos" hidden aria-label="Pedidos y ventas">
                <div class="admin-panel-cabecera">
                    <h1>Pedidos y ventas</h1>
                    <p>Listado de pedidos con filtros y paginación.</p>
                    <div class="admin-panel-herramientas">
                        <button class="boton boton-primario" id="adminVentaPresencial" type="button">Venta presencial</button>
                    </div>
                </div>
                <form class="admin-filtros" id="adminFiltrosPedidos" novalidate>
                    <div class="admin-filtro">
                        <label class="campo-label" for="filtroEstado">Estado</label>
                        <select class="campo-input" id="filtroEstado">
                            <option value="">Todos</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="admin-filtro">
                        <label class="campo-label" for="filtroCanal">Canal</label>
                        <select class="campo-input" id="filtroCanal">
                            <option value="">Todos</option>
                            <option value="web">Web</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div class="admin-filtro">
                        <label class="campo-label" for="filtroDesde">Desde</label>
                        <input class="campo-input" id="filtroDesde" type="date">
                    </div>
                    <div class="admin-filtro">
                        <label class="campo-label" for="filtroHasta">Hasta</label>
                        <input class="campo-input" id="filtroHasta" type="date">
                    </div>
                    <div class="admin-filtro">
                        <label class="campo-label" for="filtroQ">Buscar</label>
                        <input class="campo-input" id="filtroQ" type="search" placeholder="ID, cliente o email">
                    </div>
                    <button class="boton boton-primario" type="submit">Aplicar filtros</button>
                    <button class="boton boton-texto" type="button" id="adminLimpiarFiltros">Limpiar</button>
                </form>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" id="adminTablaPedidos" aria-label="Pedidos">
                        <thead>
                            <tr><th scope="col">ID</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Canal</th><th scope="col">Cliente</th><th scope="col">Líneas</th><th scope="col">Subtotal</th><th scope="col">Envío</th><th scope="col">Total</th><th scope="col">Acciones</th></tr>
                        </thead>
                        <tbody id="adminCuerpoPedidos"></tbody>
                    </table>
                    <p id="adminPedidosVacio" class="estado-vacio" hidden>No se encontraron pedidos.</p>
                </div>
                <div class="admin-paginacion" id="adminPaginacion" hidden></div>
            </section>

            <section class="admin-panel" id="panelCatalogo" hidden aria-label="Catálogo y stock">
                <div class="admin-panel-cabecera">
                    <h1>Catálogo y stock</h1>
                    <p>Todos los productos, incluidos los inactivos.</p>
                    <div class="admin-panel-herramientas">
                        <button class="boton boton-primario" id="adminNuevoProducto" type="button">Nuevo producto</button>
                    </div>
                </div>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" id="adminTablaCatalogo" aria-label="Productos">
                        <thead>
                            <tr><th scope="col">ID</th><th scope="col">Slug</th><th scope="col">Nombre</th><th scope="col">Categoría</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Visible</th><th scope="col">Activo</th><th scope="col">Destacado</th><th scope="col">Acciones</th></tr>
                        </thead>
                        <tbody id="adminCuerpoCatalogo"></tbody>
                    </table>
                    <p id="adminCatalogoVacio" class="estado-vacio" hidden>No hay productos cargados.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelMensajes" hidden aria-label="Mensajes">
                <div class="admin-panel-cabecera">
                    <h1>Mensajes</h1>
                    <p>Consultas recibidas desde el formulario de contacto (últimas 100).</p>
                    <div class="admin-panel-herramientas">
                        <label class="campo-label" for="filtroMensajes">Estado</label>
                        <select class="campo-input admin-select-estado" id="filtroMensajes"><option value="">Todos</option><option value="new">Nuevos</option><option value="read">Leídos</option><option value="answered">Respondidos</option></select>
                    </div>
                </div>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" aria-label="Mensajes">
                        <thead><tr><th scope="col">Fecha</th><th scope="col">Contacto</th><th scope="col">Asunto</th><th scope="col">Mensaje</th><th scope="col">Estado</th></tr></thead>
                        <tbody id="adminCuerpoMensajes"></tbody>
                    </table>
                    <p id="adminMensajesVacio" class="estado-vacio" hidden>No hay registros para mostrar.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelTestimonios" hidden aria-label="Testimonios">
                <div class="admin-panel-cabecera">
                    <h1>Testimonios</h1>
                    <p>Opiniones de clientes: aprobá las que se pueden mostrar.</p>
                    <div class="admin-panel-herramientas">
                        <label class="campo-label" for="filtroTestimonios">Estado</label>
                        <select class="campo-input admin-select-estado" id="filtroTestimonios"><option value="">Todos</option><option value="pending">Pendientes</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option></select>
                    </div>
                </div>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" aria-label="Testimonios">
                        <thead><tr><th scope="col">Fecha</th><th scope="col">Autor</th><th scope="col">Opinión</th><th scope="col">Estrellas</th><th scope="col">Estado</th></tr></thead>
                        <tbody id="adminCuerpoTestimonios"></tbody>
                    </table>
                    <p id="adminTestimoniosVacio" class="estado-vacio" hidden>No hay registros para mostrar.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelAccesos" hidden aria-label="Accesos">
                <div class="admin-panel-cabecera">
                    <h1>Accesos</h1>
                    <p>Personas con cuenta y su rol. Los administradores pueden entrar a este panel.</p>
                </div>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" aria-label="Accesos">
                        <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Alta</th><th scope="col">Acciones</th></tr></thead>
                        <tbody id="adminCuerpoAccesos"></tbody>
                    </table>
                    <p id="adminAccesosVacio" class="estado-vacio" hidden>No hay registros para mostrar.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelAuditoria" hidden aria-label="Últimos cambios">
                <div class="admin-panel-cabecera">
                    <h1>Últimos cambios</h1>
                    <p>Historial de acciones de administración (últimas 20 entradas).</p>
                </div>
                <div class="admin-tabla-wrap">
                    <table class="admin-tabla" id="adminTablaAuditoria" aria-label="Auditoría">
                        <thead>
                            <tr><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Acción</th><th scope="col">Resumen</th></tr>
                        </thead>
                        <tbody id="adminCuerpoAuditoria"></tbody>
                    </table>
                    <p id="adminAuditoriaVacio" class="estado-vacio" hidden>No hay cambios registrados.</p>
                </div>
            </section>

            <section class="admin-panel" id="panelEstilo" hidden aria-label="Estilo del sitio">
                <div class="admin-panel-cabecera">
                    <h1>Estilo del sitio</h1>
                    <p>Editá los textos, las imágenes y los colores de cada página. Los cambios quedan en borrador hasta que los publiques.</p>
                </div>

                <div class="admin-bloque">
                    <form id="formEstilo" novalidate>
                        <div class="estilo-pestanas" id="estiloPestanas" role="tablist" aria-label="Páginas del sitio"></div>

                        <div id="estiloPaginas" class="estilo-paginas" aria-live="polite"></div>

                        <div id="estiloMarca" class="estilo-paginas" hidden>
                            <section class="estilo-seccion">
                                <h2 class="estilo-seccion-titulo">Colores de la marca</h2>
                                <p class="admin-ayuda">Se aplican a botones, títulos y detalles de todo el sitio.</p>
                                <div class="admin-campo-grid">
                                    <div class="admin-campo">
                                        <label class="campo-label" for="estiloColorPrimario">Color primario</label>
                                        <input class="campo-input campo-color" id="estiloColorPrimario" name="primario" type="color" value="#1f3a2e">
                                        <span class="campo-error" id="errorEstiloColorPrimario"></span>
                                    </div>
                                    <div class="admin-campo">
                                        <label class="campo-label" for="estiloColorSecundario">Color secundario</label>
                                        <input class="campo-input campo-color" id="estiloColorSecundario" name="secundario" type="color" value="#3d6b4f">
                                        <span class="campo-error" id="errorEstiloColorSecundario"></span>
                                    </div>
                                    <div class="admin-campo">
                                        <label class="campo-label" for="estiloColorAcento">Color acento</label>
                                        <input class="campo-input campo-color" id="estiloColorAcento" name="acento" type="color" value="#4a7c59">
                                        <span class="campo-error" id="errorEstiloColorAcento"></span>
                                    </div>
                                </div>
                                <p class="admin-ayuda" id="estiloContrastes"></p>
                            </section>
                        </div>

                        <div id="estiloImagenes" class="estilo-paginas" hidden>
                            <section class="estilo-seccion">
                                <h2 class="estilo-seccion-titulo">Biblioteca de imágenes</h2>
                                <p class="admin-ayuda">Subí fotos una sola vez y usalas donde quieras. Se reducen solas para que el sitio cargue rápido.</p>
                                <div class="estilo-biblioteca-acciones">
                                    <button class="boton boton-primario" id="estiloSubirImagen" type="button">Subir imágenes</button>
                                </div>
                                <div class="estilo-biblioteca" id="estiloBibliotecaPagina"></div>
                            </section>
                        </div>

                        <p class="formulario-estado" id="estadoEstilo" role="status" aria-live="polite" hidden></p>
                        <div class="admin-panel-herramientas estilo-herramientas">
                            <span class="estilo-cambios" id="estiloCambios" aria-live="polite"></span>
                            <button class="boton boton-primario" id="btnGuardarBorrador" type="button">Guardar borrador</button>
                            <button class="boton boton-texto" id="btnVistaPrevia" type="button"><span class="material-symbols-outlined" aria-hidden="true">visibility</span> Vista previa</button>
                            <button class="boton boton-primario" id="btnPublicar" type="button">Publicar</button>
                        </div>
                    </form>
                    <input type="file" id="estiloArchivos" accept="image/jpeg,image/png,image/webp" multiple hidden>
                </div>

                <div class="admin-bloque">
                    <div class="admin-panel-cabecera">
                        <h2>Historial de publicaciones</h2>
                        <p>Últimas 20 versiones publicadas.</p>
                    </div>
                    <div class="admin-tabla-wrap">
                        <table class="admin-tabla" id="adminTablaHistorial" aria-label="Historial de publicaciones">
                            <thead>
                                <tr><th scope="col">Versión</th><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Productos</th><th scope="col">Título</th><th scope="col">Colores</th><th scope="col">Acciones</th></tr>
                            </thead>
                            <tbody id="adminCuerpoHistorial"></tbody>
                        </table>
                        <p id="adminHistorialVacio" class="estado-vacio" hidden>No hay versiones publicadas.</p>
                    </div>
                </div>
            </section>

            <section class="admin-panel" id="panelAnalitica" hidden aria-label="Analítica de clientes">
                <div class="admin-panel-cabecera">
                    <h1>Analítica de clientes</h1>
                    <p>Eventos anónimos de navegación del sitio público. Sin direcciones IP ni datos personales.</p>
                </div>

                <div class="admin-bloque">
                    <h2>Embudo de compra</h2>
                    <div class="admin-embudo" id="adminEmbudo"></div>
                    <p id="adminEmbudoVacio" class="estado-vacio" hidden>No hay eventos de embudo registrados.</p>
                </div>

                <div class="admin-bloque admin-flujo">
                    <h2>Flujo de navegación</h2>
                    <div id="adminFlujoSVG" role="img" aria-label="Flujo de navegación"></div>
                    <p id="adminFlujoVacio" class="estado-vacio" hidden>No hay datos de navegación para mostrar.</p>
                </div>

                <div class="admin-metricas-grid">
                    <div class="admin-bloque">
                        <h2>Mapa de clics por página</h2>
                        <div class="admin-tabla-wrap">
                            <table class="admin-tabla" id="adminTablaClicksPagina" aria-label="Clics en elemento clave por página">
                                <thead>
                                    <tr><th scope="col">Página</th><th class="admin-numero" scope="col">Clics en elemento clave</th></tr>
                                </thead>
                                <tbody id="adminCuerpoClicksPagina"></tbody>
                            </table>
                            <p id="adminClicksPaginaVacio" class="estado-vacio" hidden>No hay clics registrados por página.</p>
                        </div>
                    </div>
                    <div class="admin-bloque">
                        <h2>Ranking de elementos</h2>
                        <div class="admin-tabla-wrap">
                            <table class="admin-tabla" id="adminTablaRanking" aria-label="Elementos más clickeados">
                                <thead>
                                    <tr><th scope="col">Elemento</th><th class="admin-numero" scope="col">Clics</th><th scope="col">Tipo</th></tr>
                                </thead>
                                <tbody id="adminCuerpoRanking"></tbody>
                            </table>
                            <p id="adminRankingVacio" class="estado-vacio" hidden>No hay elementos clickeados.</p>
                        </div>
                    </div>
                </div>

                <div class="admin-bloque">
                    <h2>Reparto por dispositivo</h2>
                    <div class="admin-dispositivos" id="adminDispositivos"></div>
                </div>
            </section>
        </main>

        <dialog class="admin-dialog" id="dialogoVentaPresencial" aria-labelledby="dialogoVentaPresencialTitulo">
                        <div class="admin-dialog-caja">
                <button class="admin-dialog-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
                <span class="etiqueta">Venta presencial</span>
                <h2 id="dialogoVentaPresencialTitulo">Nueva venta presencial</h2>
                <form id="formVentaPresencial" novalidate>
                    <div class="admin-campo">
                        <label class="campo-label" for="ventaClienteNombre">Nombre del cliente <span aria-hidden="true">*</span></label>
                        <input class="campo-input" id="ventaClienteNombre" name="nombre" type="text" autocomplete="name" maxlength="120" required>
                        <span class="campo-error" id="errorVentaClienteNombre"></span>
                    </div>
                    <div class="admin-campo">
                        <label class="campo-label" for="ventaClienteTelefono">Teléfono <span aria-hidden="true">*</span></label>
                        <input class="campo-input" id="ventaClienteTelefono" name="telefono" type="tel" autocomplete="tel" maxlength="40" required>
                        <span class="campo-error" id="errorVentaClienteTelefono"></span>
                    </div>
                    <div class="admin-campo admin-campo-lineas">
                        <label class="campo-label" for="ventaProducto">Líneas de producto</label>
                        <div id="ventaLineas" class="admin-lineas-venta"></div>
                        <button class="boton boton-texto" type="button" id="adminAgregarLineaVenta"><span class="material-symbols-outlined" aria-hidden="true">add</span> Agregar línea</button>
                    </div>
                    <div class="admin-total-venta">
                        <span class="admin-total-venta-label">Total</span>
                        <span class="admin-total-valor" id="ventaTotal">$0</span>
                    </div>
                    <p class="formulario-estado" id="estadoVentaPresencial" role="status" aria-live="polite" hidden></p>
                </form>
                <div class="admin-dialog-acciones">
                    <button class="boton boton-texto" type="button" data-cerrar-dialogo>Cancelar</button>
                    <button class="boton boton-primario" id="adminGuardarVentaPresencial" type="submit">Crear venta</button>
                </div>
            </div>
        </dialog>

        <dialog class="admin-dialog" id="dialogoVistaPrevia" aria-labelledby="dialogoVistaPreviaTitulo">
            <div class="admin-dialog-caja admin-dialog-previa">
                <button class="admin-dialog-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
                <span class="etiqueta">Estilo del sitio</span>
                <h2 id="dialogoVistaPreviaTitulo">Vista previa</h2>
                <p class="admin-ayuda" id="vistaPreviaAyuda">Así se vería la página con tus cambios. Todavía no está publicada.</p>
                <iframe class="admin-previa-marco" id="marcoVistaPrevia" name="zapi-vista-previa" title="Vista previa de la página" src="about:blank"></iframe>
            </div>
        </dialog>

        <dialog class="admin-dialog" id="dialogoBiblioteca" aria-labelledby="dialogoBibliotecaTitulo">
            <div class="admin-dialog-caja admin-dialog-ancho">
                <button class="admin-dialog-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
                <span class="etiqueta">Estilo del sitio</span>
                <h2 id="dialogoBibliotecaTitulo">Elegí una imagen</h2>
                <p class="admin-ayuda" id="bibliotecaAyuda">Tocá una imagen para usarla, o subí una nueva.</p>
                <div class="estilo-biblioteca-acciones">
                    <button class="boton boton-secundario" id="bibliotecaSubir" type="button">Subir imagen nueva</button>
                    <span class="admin-ayuda" id="bibliotecaEstado" role="status" aria-live="polite"></span>
                </div>
                <div class="estilo-biblioteca" id="bibliotecaGrilla"></div>
            </div>
        </dialog>

        <dialog class="admin-dialog" id="dialogoProducto" aria-labelledby="dialogoProductoTitulo">
                        <div class="admin-dialog-caja admin-dialog-ancho">
                <button class="admin-dialog-cerrar" type="button" data-cerrar-dialogo aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
                <span class="etiqueta">Catálogo y stock</span>
                <h2 id="dialogoProductoTitulo">Nuevo producto</h2>
                <form id="formProducto" novalidate>
                    <div class="admin-campo admin-campo-dos">
                        <div>
                            <label class="campo-label" for="prodNombre">Nombre <span aria-hidden="true">*</span></label>
                            <input class="campo-input" id="prodNombre" name="nombre" type="text" maxlength="160" required>
                            <span class="campo-error" id="errorProdNombre"></span>
                        </div>
                        <div>
                            <label class="campo-label" for="prodSlug">Slug <span aria-hidden="true">*</span></label>
                            <input class="campo-input" id="prodSlug" name="slug" type="text" maxlength="120" placeholder="ej. maceta-terracota" required>
                            <span class="campo-error" id="errorProdSlug"></span>
                        </div>
                    </div>
                    <div class="admin-campo">
                        <label class="campo-label" for="prodCategoria">Categoría</label>
                        <input class="campo-input" id="prodCategoria" name="categoria" type="text" maxlength="80" list="prodCategorias">
                        <datalist id="prodCategorias"></datalist>
                    </div>
                    <div class="admin-campo">
                        <label class="campo-label" for="prodDescripcion">Descripción</label>
                        <textarea class="campo-input" id="prodDescripcion" name="descripcion" rows="3" maxlength="1000"></textarea>
                    </div>
                    <div class="admin-campo admin-campo-dos">
                        <div>
                            <label class="campo-label" for="prodPrecio">Precio <span aria-hidden="true">*</span></label>
                            <input class="campo-input" id="prodPrecio" name="precioBase" type="number" min="0" step="0.01" required>
                            <span class="campo-error" id="errorProdPrecio"></span>
                        </div>
                        <div>
                            <label class="campo-label" for="prodStock">Stock <span aria-hidden="true">*</span></label>
                            <input class="campo-input" id="prodStock" name="stock" type="number" min="0" step="1" required>
                            <span class="campo-error" id="errorProdStock"></span>
                        </div>
                    </div>
                    <div class="admin-campo admin-campo-tres">
                        <div>
                            <label class="campo-label" for="prodVisible">Visible</label>
                            <select class="campo-input" id="prodVisible" name="visible"><option value="true">Sí</option><option value="false">No</option></select>
                        </div>
                        <div>
                            <label class="campo-label" for="prodActivo">Activo</label>
                            <select class="campo-input" id="prodActivo" name="active"><option value="true">Sí</option><option value="false">No</option></select>
                        </div>
                        <div>
                            <label class="campo-label" for="prodDestacado">Destacado</label>
                            <select class="campo-input" id="prodDestacado" name="destacado"><option value="false">No</option><option value="true">Sí</option></select>
                        </div>
                    </div>
                    <div class="admin-campo">
                        <label class="campo-label" for="prodInfo">Información de venta</label>
                        <textarea class="campo-input" id="prodInfo" name="infoDeVenta" rows="3" placeholder="Una línea por dato"></textarea>
                        <span class="admin-ayuda">Una línea por dato (hasta 8).</span>
                    </div>
                    <fieldset class="admin-campo admin-imagenes">
                        <legend class="campo-label">Imágenes</legend>
                        <ul class="admin-galeria" id="prodGaleria"></ul>
                        <p class="admin-ayuda" id="prodGaleriaVacia">Todavía no hay imágenes. La primera es la principal.</p>
                        <div class="admin-imagenes-acciones">
                            <label class="boton boton-secundario admin-subir" for="prodArchivos">
                                <span class="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span> Subir imágenes
                            </label>
                            <input class="admin-archivo" id="prodArchivos" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                        </div>
                        <div class="admin-imagenes-url">
                            <label class="campo-label" for="prodUrl">O pegá una URL https</label>
                            <div class="admin-fila-url">
                                <input class="campo-input" id="prodUrl" type="url" maxlength="480" placeholder="https://...">
                                <button class="boton boton-texto" id="prodAgregarUrl" type="button">Agregar</button>
                            </div>
                        </div>
                    </fieldset>
                    <p class="formulario-estado" id="estadoProducto" role="status" aria-live="polite" hidden></p>
                </form>
                <div class="admin-dialog-acciones">
                    <button class="boton boton-texto" type="button" data-cerrar-dialogo>Cancelar</button>
                    <button class="boton boton-primario" id="adminGuardarProducto" type="submit" form="formProducto">Guardar producto</button>
                </div>
            </div>
        </dialog>
    </div>
    `
};
