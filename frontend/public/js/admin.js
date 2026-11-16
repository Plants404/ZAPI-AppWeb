'use strict';

/* Panel de administración de ZAPI — operaciones.
   Consume los endpoints protegidos /api/admin/* con la cookie de sesión
   (credentials: 'include'). Solo acceso de administradores. */

const API_RESUMEN = '/api/admin/resumen';
const API_PEDIDOS = '/api/admin/pedidos';
const API_PEDIDO_PRESENCIAL = '/api/admin/pedidos/presencial';
const API_ADMIN = '/api/admin';
const API_PRODUCTOS = '/api/admin/productos';
const API_AUDITORIA = '/api/admin/auditoria';
const API_PUBLICACION_BORRADOR = '/api/admin/publicacion/borrador';
const API_PUBLICACION_PUBLICAR = '/api/admin/publicacion/publicar';
const API_PUBLICACION_HISTORIAL = '/api/admin/publicacion/historial';
const API_PUBLICACION_RESTAURAR = '/api/admin/publicacion/restaurar';
const API_ANALITICA = '/api/admin/analitica';
const API_CLIENTES = '/api/admin/clientes';
const POR_PAGINA = 20;

const COLOR_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

let paginaActual = 1;
let totalPaginas = 1;
let filtros = {
    estado: '',
    canal: '',
    fechaDesde: '',
    fechaHasta: '',
    q: ''
};

let productosCatalogo = [];
let productoEnEdicion = null; /* id del producto abierto en el diálogo; null = alta */
let imagenesProducto = [];
const MAX_IMAGENES = 12;
const API_IMAGENES = '/api/admin/imagenes';

let productosVenta = [];
let lineasVenta = [];

const panels = {
    resumen: document.getElementById('panelResumen'),
    pedidos: document.getElementById('panelPedidos'),
    catalogo: document.getElementById('panelCatalogo'),
    auditoria: document.getElementById('panelAuditoria'),
    mensajes: document.getElementById('panelMensajes'),
    testimonios: document.getElementById('panelTestimonios'),
    accesos: document.getElementById('panelAccesos'),
    estilo: document.getElementById('panelEstilo'),
    analitica: document.getElementById('panelAnalitica')
};

const dialogoVentaPresencial = document.getElementById('dialogoVentaPresencial');
const dialogoProducto = document.getElementById('dialogoProducto');

function mostrarAviso(titulo, mensaje) {
    const aviso = document.getElementById('adminAviso');
    const tituloEl = document.getElementById('adminAvisoTitulo');
    const mensajeEl = document.getElementById('adminAvisoMensaje');
    if (!aviso || !tituloEl || !mensajeEl) return;
    tituloEl.textContent = titulo;
    mensajeEl.textContent = mensaje;
    aviso.hidden = false;
}

function cerrarAviso() {
    const aviso = document.getElementById('adminAviso');
    if (aviso) aviso.hidden = true;
}

async function fetchJson(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    const respuesta = await fetch(path, {
        credentials: 'include',
        method,
        headers,
        ...(body ? { body } : {})
    });
    if (respuesta.status === 401) {
        /* Sin sesión de administrador: se pide iniciar sesión en vez de mostrar el panel vacío. */
        window.location.href = './login.html';
        throw new Error('Sesión requerida. Iniciá sesión para continuar.');
    }
    if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        let detalle = texto;
        try {
            const datos = JSON.parse(texto);
            detalle = datos.error || datos.message || texto;
        } catch (e) { /* respuesta que no es JSON */ }
        throw new Error(`Error ${respuesta.status}${detalle ? ': ' + detalle : ''}`);
    }
    if (respuesta.status === 204) return null;
    return respuesta.json();
}

/* "Ver como cliente" abre el sitio real en esta misma pestaña; el aviso para volver
   lo muestra el propio sitio (modo-cliente.js) a partir de esta marca. */
function aplicarModo(modo) {
    if (modo !== 'cliente') return;
    try {
        sessionStorage.setItem('zapiModoCliente', '1');
        sessionStorage.setItem('zapiVolverA', location.pathname + location.search);
    } catch (error) { /* sin almacenamiento: se abre igual el sitio */ }
    location.href = './index.html';
}

function mostrarPanel(id) {
    for (const clave of Object.keys(panels)) {
        panels[clave].hidden = clave !== id;
    }
    document.querySelectorAll('.admin-menu-enlace').forEach(enlace => {
        const activo = enlace.dataset.panel === id;
        enlace.classList.toggle('admin-menu-enlace-activo', activo);
        enlace.setAttribute('aria-current', activo ? 'true' : 'false');
    });
    window.scrollTo(0, 0);
}

const ESCRITORIO = window.matchMedia('(min-width: 1024px)');

/* En escritorio el menú queda fijo a la izquierda; en pantallas chicas es un cajón. */
function ajustarSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const fondo = document.querySelector('.admin-sidebar-fondo');
    const boton = document.getElementById('adminBotonMenu');
    if (!sidebar) return;
    sidebar.hidden = !ESCRITORIO.matches;
    sidebar.classList.toggle('admin-sidebar--abierto', ESCRITORIO.matches);
    if (fondo) fondo.hidden = true;
    if (boton) boton.setAttribute('aria-expanded', 'false');
}

function abrirSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const fondo = document.querySelector('.admin-sidebar-fondo');
    const boton = document.getElementById('adminBotonMenu');
    sidebar.hidden = false;
    sidebar.classList.add('admin-sidebar--abierto');
    fondo.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
}

function cerrarSidebar() {
    if (ESCRITORIO.matches) return;
    const sidebar = document.getElementById('adminSidebar');
    const fondo = document.querySelector('.admin-sidebar-fondo');
    const boton = document.getElementById('adminBotonMenu');
    sidebar.classList.remove('admin-sidebar--abierto');
    fondo.hidden = true;
    sidebar.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
}

async function cargarResumen() {
    try {
        const data = await fetchJson(API_RESUMEN);
        renderTarjetasResumen(data);
        renderGraficoVentas(data.ventasPorSemana);
        renderStockBajo(data.stockBajo);
    } catch (error) {
        mostrarAviso('No se pudo cargar el resumen', error.message);
    }
}

function renderTarjetasResumen(data) {
    const contenedor = document.getElementById('adminTarjetas');
    const tarjetas = [
        { label: 'Ventas', valor: formatearPrecio(data.ventas), subtitulo: 'Pedidos confirmados y entregados' },
        { label: 'Ticket promedio', valor: formatearPrecio(data.ticketPromedio), subtitulo: 'Por pedido válido' },
        { label: 'Pedidos por confirmar', valor: data.pedidosPorConfirmar ?? 0, subtitulo: 'Estado pendiente' },
        { label: 'Conversión', valor: data.conversion === null ? '—' : (data.conversion * 100).toFixed(1) + '%', subtitulo: 'Confirmados / visitantes únicos' },
        { label: 'Visitantes únicos', valor: data.visitantesUnicos ?? 0, subtitulo: 'Próxima entrega: analítica de clientes' },
        { label: 'Productos con stock bajo', valor: Array.isArray(data.stockBajo) ? data.stockBajo.length : 0, subtitulo: 'Entre 1 y 3 unidades' }
    ];
    contenedor.innerHTML = tarjetas.map(tarjeta => `
        <div class="admin-tarjeta">
            <p class="admin-tarjeta-label">${escaparHTML(tarjeta.label)}</p>
            <p class="admin-tarjeta-valor">${escaparHTML(tarjeta.valor)}</p>
            <p class="admin-tarjeta-sub">${escaparHTML(tarjeta.subtitulo)}</p>
        </div>
    `).join('');
}

function renderGraficoVentas(semanas) {
    const svg = document.getElementById('adminGraficoSVG');
    const vacio = document.getElementById('adminGraficoVacio');
    if (!svg) return;
    if (!semanas || semanas.length === 0) {
        svg.hidden = true;
        vacio.hidden = false;
        return;
    }
    svg.hidden = false;
    vacio.hidden = true;

    const altoMax = 130;
    const baseY = 170;
    const maxValor = Math.max(1, ...semanas.map(semana => Number(semana.web || 0) + Number(semana.presencial || 0)));

    const partes = [];
    for (let i = 0; i <= 4; i += 1) {
        const y = baseY - (altoMax * i / 4);
        const valor = Math.round((maxValor * i) / 4);
        partes.push(`<line x1="36" y1="${y}" x2="700" y2="${y}" class="admin-grafico-linea"></line>`);
        partes.push(`<text x="28" y="${y + 4}" class="admin-grafico-eje">${valor}</text>`);
    }

    const grupoAncho = (700 - 40) / semanas.length;
    semanas.forEach((semana, indice) => {
        const xCentro = 40 + grupoAncho * (indice + 0.5);
        const web = Number(semana.web || 0);
        const presencial = Number(semana.presencial || 0);
        const alturaWeb = (web / maxValor) * altoMax;
        const alturaPresencial = (presencial / maxValor) * altoMax;
        const xWeb = xCentro - 20;
        const xPresencial = xCentro + 2;
        partes.push(`<rect x="${xWeb}" y="${baseY - alturaWeb}" width="16" height="${alturaWeb}" class="admin-barra admin-barra-web" title="${escaparHTML(`Web: ${formatearPrecio(web)}`)}"></rect>`);
        partes.push(`<rect x="${xPresencial}" y="${baseY - alturaPresencial}" width="16" height="${alturaPresencial}" class="admin-barra admin-barra-pre" title="${escaparHTML(`Presencial: ${formatearPrecio(presencial)}`)}"></rect>`);
        const etiqueta = String(semana.semana || '').replace(/.*-W/, 'W');
        partes.push(`<text x="${xCentro}" y="${baseY + 22}" class="admin-grafico-etiqueta" text-anchor="middle">${escaparHTML(etiqueta)}</text>`);
    });

    svg.innerHTML = partes.join('');
    svg.setAttribute('viewBox', '0 0 720 210');
}

function renderStockBajo(productos) {
    const wrap = document.getElementById('adminStockBajoWrap');
    const vacio = document.getElementById('adminStockBajoVacio');
    if (!productos || productos.length === 0) {
        wrap.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    wrap.innerHTML = `
        <table class="admin-tabla admin-tabla-pequeña">
            <thead>
                <tr><th scope="col">Producto</th><th scope="col">Slug</th><th scope="col">Stock</th><th scope="col">Estado</th></tr>
            </thead>
            <tbody>
                ${productos.map(producto => `
                    <tr>
                        <td>${escaparHTML(producto.nombre)}</td>
                        <td>${escaparHTML(producto.slug)}</td>
                        <td class="admin-numero">${producto.stock}</td>
                        <td><span class="stock ${claseDeStock(producto.stock)}">${textoDeStock(producto.stock)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function claseEstado(estado) {
    switch (estado) {
        case 'pendiente': return 'pendiente';
        case 'confirmado': return 'confirmado';
        case 'entregado': return 'entregado';
        case 'cancelado': return 'cancelado';
        default: return 'neutral';
    }
}

function textoEstado(estado) {
    const map = { pendiente: 'Pendiente', confirmado: 'Confirmado', entregado: 'Entregado', cancelado: 'Cancelado' };
    return map[estado] || String(estado);
}

function opcionesDeEstado(estadoActual) {
    const map = {
        pendiente: ['confirmado', 'cancelado'],
        confirmado: ['entregado', 'cancelado'],
        entregado: ['cancelado'],
        cancelado: []
    };
    return map[estadoActual] || [];
}

async function cargarPedidos() {
    try {
        const consulta = new URLSearchParams();
        consulta.set('page', paginaActual);
        consulta.set('limit', POR_PAGINA);
        if (filtros.estado) consulta.set('estado', filtros.estado);
        if (filtros.canal) consulta.set('canal', filtros.canal);
        if (filtros.fechaDesde) consulta.set('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) consulta.set('fechaHasta', filtros.fechaHasta);
        if (filtros.q) consulta.set('q', filtros.q);
        const data = await fetchJson(`${API_PEDIDOS}?${consulta.toString()}`);
        renderPedidos(data);
    } catch (error) {
        mostrarAviso('No se pudieron cargar los pedidos', error.message);
    }
}

function renderPaginacion(total) {
    const contenedor = document.getElementById('adminPaginacion');
    totalPaginas = Math.max(1, total);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const deshabilitadaAnterior = paginaActual <= 1;
    const deshabilitadaSiguiente = paginaActual >= totalPaginas;

    let html = `<span id="adminPaginacionTexto">Página ${paginaActual} de ${totalPaginas} (${total} pedidos)</span>`;
    html += `<button class="admin-pagina-boton" type="button" data-dir="anterior" ${deshabilitadaAnterior ? 'disabled' : ''} aria-label="Página anterior">Anterior</button>`;

    const numeros = [];
    if (totalPaginas <= 10) {
        for (let i = 1; i <= totalPaginas; i += 1) numeros.push(i);
    } else {
        numeros.push(1);
        if (paginaActual > 3) numeros.push('...');
        const inicio = Math.max(2, paginaActual - 1);
        const fin = Math.min(totalPaginas - 1, paginaActual + 1);
        for (let i = inicio; i <= fin; i += 1) numeros.push(i);
        if (paginaActual < totalPaginas - 2) numeros.push('...');
        numeros.push(totalPaginas);
    }

    for (const nro of numeros) {
        if (nro === '...') {
            html += `<span class="admin-punto-suspensivo" aria-hidden="true">&#8230;</span>`;
        } else {
            const activo = nro === paginaActual;
            html += `<button class="admin-pagina-numero${activo ? ' admin-pagina-numero--activo' : ''}" type="button" data-page="${nro}" aria-label="Página ${nro}" ${activo ? 'aria-current="true"' : ''}>${nro}</button>`;
        }
    }

    html += `<button class="admin-pagina-boton" type="button" data-dir="siguiente" ${deshabilitadaSiguiente ? 'disabled' : ''} aria-label="Página siguiente">Siguiente</button>`;
    contenedor.innerHTML = html;
}

function renderPedidos(data) {
    const cuerpo = document.getElementById('adminCuerpoPedidos');
    const vacio = document.getElementById('adminPedidosVacio');
    const paginacion = document.getElementById('adminPaginacion');
    renderPaginacion(data.total || 0);
    paginacion.hidden = false;

    if (!data.pedidos || data.pedidos.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        paginacion.hidden = true;
        return;
    }
    vacio.hidden = true;
    cuerpo.innerHTML = data.pedidos.map(pedido => {
        const unidades = pedido.lineas ? pedido.lineas.reduce((suma, linea) => suma + (linea.cantidad || 0), 0) : 0;
        const estadoActual = pedido.estado;
        const opciones = opcionesDeEstado(estadoActual);
        const opcionesHtml = opciones.map(opcion => `<option value="${opcion}">${textoEstado(opcion)}</option>`).join('');
        const deshabilitado = estadoActual === 'cancelado' ? 'disabled' : '';
        return `
            <tr>
                <td>#${escaparHTML(pedido.id)}</td>
                <td>${formatearFecha(pedido.fecha)}</td>
                <td><span class="admin-badge admin-badge-${claseEstado(pedido.estado)}">${textoEstado(pedido.estado)}</span></td>
                <td>${pedido.canal === 'presencial' ? 'Presencial' : 'Web'}</td>
                <td>${escaparHTML((pedido.cliente && pedido.cliente.nombre) || '-')}</td>
                <td class="admin-numero">${unidades}</td>
                <td class="admin-numero">${formatearPrecio(pedido.subtotal)}</td>
                <td class="admin-numero">${formatearPrecio(pedido.envio)}</td>
                <td class="admin-numero admin-total">${formatearPrecio(pedido.total)}</td>
                <td class="admin-acciones">
                    <label class="visually-hidden">Cambiar estado del pedido #${escaparHTML(pedido.id)}</label>
                    <select class="admin-select-estado" data-id="${escaparHTML(pedido.id)}" data-actual="${escaparHTML(estadoActual)}" ${deshabilitado}>
                        <option value="${estadoActual}" selected>${textoEstado(estadoActual)}</option>
                        ${opcionesHtml}
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

async function cambiarEstadoPedido(id, estado) {
    await fetchJson(`${API_PEDIDOS}/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
    });
    mostrarAviso('Estado actualizado', `Pedido #${id} ahora ${textoEstado(estado)}.`);
    cargarPedidos();
}

async function cargarCatalogo() {
    try {
        const data = await fetchJson(API_PRODUCTOS);
        productosCatalogo = Array.isArray(data.products) ? data.products : [];
        renderCatalogo(productosCatalogo);
    } catch (error) {
        mostrarAviso('No se pudo cargar el catálogo', error.message);
    }
}

function renderCatalogo(productos) {
    const cuerpo = document.getElementById('adminCuerpoCatalogo');
    const vacio = document.getElementById('adminCatalogoVacio');
    if (!productos || productos.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    cuerpo.innerHTML = productos.map(producto => `
        <tr id="fila-producto-${producto.id}">
            <td class="admin-codigo">#${producto.id}</td>
            <td>${escaparHTML(producto.slug)}</td>
            <td><span class="admin-producto-nombre">${producto.imagen ? `<img class="admin-miniatura" src="${escaparHTML(srcImagen(producto.imagen))}" alt="" loading="lazy">` : '<span class="admin-miniatura admin-miniatura-vacia" aria-hidden="true"></span>'}${escaparHTML(producto.nombre)}</span></td>
            <td>${escaparHTML(producto.categoria)}</td>
            <td class="admin-numero">${formatearPrecio(producto.precioBase)}</td>
            <td><span class="stock ${claseDeStock(producto.stock)}">${textoDeStock(producto.stock)}</span></td>
            <td>${producto.visible ? 'Sí' : 'No'}</td>
            <td>${producto.active ? 'Sí' : 'No'}</td>
            <td>${producto.destacado ? 'Sí' : 'No'}</td>
            <td class="admin-acciones"><button class="boton boton-texto" data-accion="editar" data-id="${producto.id}" type="button">Editar</button></td>
        </tr>
    `).join('');
}

async function cargarAuditoria() {
    try {
        const data = await fetchJson(API_AUDITORIA);
        renderAuditoria(data.auditoria || []);
    } catch (error) {
        mostrarAviso('No se pudo cargar el historial', error.message);
    }
}

function claseDeAccion(accion) {
    const texto = String(accion || '').toLowerCase();
    if (texto.includes('crear') || texto.includes('alta') || texto.includes('nuevo')) return 'creado';
    if (texto.includes('actualizar') || texto.includes('editar') || texto.includes('modificar')) return 'actualizado';
    if (texto.includes('eliminar') || texto.includes('borrar') || texto.includes('cancelar')) return 'eliminado';
    return 'neutral';
}

function renderAuditoria(entradas) {
    const cuerpo = document.getElementById('adminCuerpoAuditoria');
    const vacio = document.getElementById('adminAuditoriaVacio');
    if (!entradas || entradas.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    cuerpo.innerHTML = entradas.map(entrada => `
        <tr>
            <td>${formatearFecha(entrada.fecha)}</td>
            <td>${escaparHTML(entrada.usuario || entrada.email || '-')}</td>
            <td><span class="admin-badge admin-badge-${claseDeAccion(entrada.accion)}">${escaparHTML(entrada.accion)}</span></td>
            <td>${escaparHTML(entrada.resumen || '-')}</td>
        </tr>
    `).join('');
}

/* ----- Mensajes, testimonios y accesos ----- */

const ETIQUETAS_MENSAJE = { new: 'Nuevo', read: 'Leído', answered: 'Respondido' };
const ETIQUETAS_TESTIMONIO = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
const CLASE_ESTADO_GESTION = { new: 'pendiente', read: 'entregado', answered: 'confirmado', pending: 'pendiente', approved: 'confirmado', rejected: 'cancelado' };

function selectorEstado(etiquetas, actual, atributo, id) {
    const opciones = Object.entries(etiquetas)
        .map(([valor, texto]) => `<option value="${valor}"${valor === actual ? ' selected' : ''}>${texto}</option>`).join('');
    return `<select class="campo-input admin-select-estado" ${atributo}="${escaparHTML(id)}" aria-label="Cambiar estado">${opciones}</select>`;
}

function pintarTabla(cuerpoId, vacioId, filas, vacioHtml) {
    document.getElementById(cuerpoId).innerHTML = filas.join('');
    document.getElementById(vacioId).hidden = filas.length > 0;
    if (vacioHtml) document.getElementById(vacioId).textContent = vacioHtml;
}

async function cargarMensajes() {
    try {
        const estado = document.getElementById('filtroMensajes').value;
        const data = await fetchJson(`${API_ADMIN}/mensajes${estado ? `?estado=${estado}` : ''}`);
        pintarTabla('adminCuerpoMensajes', 'adminMensajesVacio', (data.mensajes || []).map(m => `
            <tr>
                <td>${formatearFecha(m.fecha)}</td>
                <td>${escaparHTML(m.nombre)}<br><a href="mailto:${escaparHTML(m.email)}">${escaparHTML(m.email)}</a>${m.telefono ? `<br>${escaparHTML(m.telefono)}` : ''}</td>
                <td>${escaparHTML(m.asunto)}</td>
                <td class="admin-texto-largo">${escaparHTML(m.mensaje)}</td>
                <td><span class="admin-badge admin-badge-${CLASE_ESTADO_GESTION[m.estado] || 'pendiente'}">${ETIQUETAS_MENSAJE[m.estado] || escaparHTML(m.estado)}</span><br>${selectorEstado(ETIQUETAS_MENSAJE, m.estado, 'data-mensaje', m.id)}</td>
            </tr>`), 'No hay mensajes.');
    } catch (error) {
        mostrarAviso('No se pudieron cargar los mensajes', error.message);
    }
}

async function cargarTestimonios() {
    try {
        const estado = document.getElementById('filtroTestimonios').value;
        const data = await fetchJson(`${API_ADMIN}/testimonios${estado ? `?estado=${estado}` : ''}`);
        pintarTabla('adminCuerpoTestimonios', 'adminTestimoniosVacio', (data.testimonios || []).map(t => `
            <tr>
                <td>${formatearFecha(t.fecha)}</td>
                <td>${escaparHTML(t.autor)}${t.lugar ? `<br>${escaparHTML(t.lugar)}` : ''}</td>
                <td class="admin-texto-largo">${escaparHTML(t.texto)}</td>
                <td>${'★'.repeat(Number(t.estrellas) || 0)}</td>
                <td><span class="admin-badge admin-badge-${CLASE_ESTADO_GESTION[t.estado] || 'pendiente'}">${ETIQUETAS_TESTIMONIO[t.estado] || escaparHTML(t.estado)}</span><br>${selectorEstado(ETIQUETAS_TESTIMONIO, t.estado, 'data-testimonio', t.id)}</td>
            </tr>`), 'No hay testimonios.');
    } catch (error) {
        mostrarAviso('No se pudieron cargar los testimonios', error.message);
    }
}

async function cargarAccesos() {
    try {
        const data = await fetchJson(`${API_ADMIN}/usuarios`);
        pintarTabla('adminCuerpoAccesos', 'adminAccesosVacio', (data.usuarios || []).map(u => `
            <tr>
                <td>${escaparHTML(u.nombre || '-')}${u.esYo ? ' <span class="admin-badge">Vos</span>' : ''}</td>
                <td>${escaparHTML(u.email)}</td>
                <td><span class="admin-badge admin-badge-${u.rol === 'admin' ? 'confirmado' : 'entregado'}">${u.rol === 'admin' ? 'Administrador' : 'Cliente'}</span></td>
                <td>${formatearFecha(u.fecha)}</td>
                <td>${u.esYo ? '-' : `<select class="campo-input admin-select-estado" data-usuario="${escaparHTML(u.id)}" aria-label="Cambiar rol"><option value="cliente"${u.rol === 'cliente' ? ' selected' : ''}>Cliente</option><option value="admin"${u.rol === 'admin' ? ' selected' : ''}>Administrador</option></select>`}</td>
            </tr>`), 'No hay usuarios.');
    } catch (error) {
        mostrarAviso('No se pudieron cargar los accesos', error.message);
    }
}

async function cambiarGestion(ruta, cuerpo, recargar, titulo) {
    try {
        await fetchJson(`${API_ADMIN}/${ruta}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
        mostrarAviso(titulo, 'El cambio se guardó correctamente.');
    } catch (error) {
        mostrarAviso('No se pudo guardar', error.message);
    }
    recargar();
}

function iniciarGestion() {
    document.getElementById('filtroMensajes').addEventListener('change', cargarMensajes);
    document.getElementById('filtroTestimonios').addEventListener('change', cargarTestimonios);
    document.getElementById('adminCuerpoMensajes').addEventListener('change', evento => {
        const select = evento.target.closest('[data-mensaje]');
        if (select) cambiarGestion(`mensajes/${select.dataset.mensaje}`, { estado: select.value }, cargarMensajes, 'Mensaje actualizado');
    });
    document.getElementById('adminCuerpoTestimonios').addEventListener('change', evento => {
        const select = evento.target.closest('[data-testimonio]');
        if (select) cambiarGestion(`testimonios/${select.dataset.testimonio}`, { estado: select.value }, cargarTestimonios, 'Testimonio actualizado');
    });
    document.getElementById('adminCuerpoAccesos').addEventListener('change', evento => {
        const select = evento.target.closest('[data-usuario]');
        if (select) cambiarGestion(`usuarios/${select.dataset.usuario}`, { rol: select.value }, cargarAccesos, 'Rol actualizado');
    });
}

/* ----- Analítica de clientes ----- */

const TEXTOS_ANALITICA = {
    resumen: { etiqueta: 'RESUMEN', titulo: 'Cómo se mueven tus clientes' },
    clientes: { etiqueta: 'CLIENTES', titulo: 'Quiénes compran y cuándo vuelven' },
    productos: { etiqueta: 'PRODUCTOS Y HORARIOS', titulo: 'Qué interesa y cuándo conviene estar' }
};
const NOMBRES_PAGINA = {
    '/': 'Inicio', '/catalogo': 'Catálogo', '/carrito': 'Carrito', '/servicios': 'Servicios',
    '/nosotros': 'Nosotros', '/contacto': 'Contacto', '/pedidos': 'Mis pedidos', '/login': 'Ingreso', '/privacidad': 'Privacidad'
};
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
const COLORES_CALOR = ['#eef3ef', '#bcd3c4', '#6f9c80', '#2f5a43', '#1f3a2e'];
const ETIQUETAS_ESTADO_CLIENTE = { recurrente: 'Recurrente', nuevo: 'Nuevo', inactivo: 'Hace tiempo que no vuelve' };

let analiticaDias = 30;
let analiticaVista = 'resumen';
let analiticaComparar = true;
let analiticaDatos = null;
let clientesDatos = null;
let segmentoClientes = 'todos';
let clienteElegido = null;

const numeroAn = valor => new Intl.NumberFormat('es-UY').format(Number(valor) || 0);
const porcentajeAn = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

function hacePalabra(dias) {
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'ayer';
    return `hace ${dias} días`;
}

function textoDesde(dias) {
    if (dias >= 60) return `hace ${Math.round(dias / 30)} meses`;
    if (dias >= 30) return 'hace 1 mes';
    return `hace ${Math.max(dias, 1)} ${dias === 1 ? 'día' : 'días'}`;
}

async function cargarAnalitica() {
    mostrarVistaAnalitica(analiticaVista);
}

async function cargarDatosAnalitica() {
    try {
        analiticaDatos = await fetchJson(`${API_ANALITICA}?dias=${analiticaDias}`);
        renderResumenAnalitica();
        renderProductosAnalitica();
    } catch (error) {
        mostrarAviso('No se pudo cargar la analítica', error.message);
    }
}

async function cargarClientesAnalitica() {
    try {
        clientesDatos = await fetchJson(API_CLIENTES);
        const lista = clientesDatos.clientes || [];
        if (!lista.some(c => c.id === clienteElegido)) clienteElegido = lista.length ? lista[0].id : null;
        renderClientesAnalitica();
    } catch (error) {
        mostrarAviso('No se pudieron cargar los clientes', error.message);
    }
}

function mostrarVistaAnalitica(vista) {
    analiticaVista = vista;
    const textos = TEXTOS_ANALITICA[vista];
    document.getElementById('anEtiqueta').textContent = `ANALÍTICA DE CLIENTES · ${textos.etiqueta}`;
    document.getElementById('anTitulo').textContent = textos.titulo;
    document.getElementById('anResumen').hidden = vista !== 'resumen';
    document.getElementById('anClientes').hidden = vista !== 'clientes';
    document.getElementById('anProductos').hidden = vista !== 'productos';
    document.getElementById('anPeriodo').hidden = vista === 'clientes';
    document.getElementById('anComparar').hidden = vista !== 'resumen';
    document.getElementById('anCsv').hidden = vista !== 'resumen';
    document.getElementById('anNota').textContent = vista === 'clientes'
        ? 'Sale de los pedidos que ya existen. Solo con datos que la persona dejó al pedir; la navegación anónima nunca se une a un cliente.'
        : 'Eventos anónimos del sitio: sin IP ni datos personales. Se conservan 90 días.';
    document.querySelectorAll('#anVistas .an-vista-tab').forEach(tab => {
        const activa = tab.dataset.vista === vista;
        tab.classList.toggle('activa', activa);
        tab.setAttribute('aria-selected', String(activa));
    });
    if (vista === 'clientes') cargarClientesAnalitica();
    else cargarDatosAnalitica();
}

/* ----- Resumen ----- */

function trazoSparkline(serie, color, etiqueta) {
    const maximo = Math.max(...serie, 1);
    const n = serie.length;
    const puntos = serie.map((valor, i) => `${n > 1 ? 2 + (i / (n - 1)) * 86 : 45} ${26 - (valor / maximo) * 22}`);
    return `<svg width="90" height="28" viewBox="0 0 90 28" role="img" aria-label="${escaparHTML(etiqueta)}"><path d="M${puntos.join(' L')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function textoDelta(actual, previo) {
    if (!analiticaComparar) return { texto: '', color: '' };
    if (!previo) return { texto: 'Sin datos del período anterior', color: '#5b6b60' };
    const cambio = Math.round(((actual - previo) / previo) * 100);
    if (cambio === 0) return { texto: 'Igual que el período anterior', color: '#5b6b60' };
    return cambio > 0
        ? { texto: `▲ ${cambio} % vs. anterior`, color: '#1f5a3a' }
        : { texto: `▼ ${Math.abs(cambio)} % vs. anterior`, color: '#8a5a12' };
}

function tarjetaKpi(titulo, valor, delta, sparkline) {
    return `<article class="an-kpi">
        <span class="an-kpi-titulo">${escaparHTML(titulo)}</span>
        <div class="an-kpi-valor">${escaparHTML(valor)}</div>
        <div class="an-kpi-pie"><span style="color:${delta.color}">${escaparHTML(delta.texto)}</span>${sparkline}</div>
    </article>`;
}

function renderResumenAnalitica() {
    const datos = analiticaDatos;
    if (!datos) return;
    const a = datos.indicadores.actual;
    const p = datos.indicadores.previo;
    const serie = datos.serie;
    const conversionDiaria = serie.visitas.map((v, i) => (v ? serie.pedidos[i] / v : 0));
    const colorDe = delta => (delta.color === '#8a5a12' ? '#b7791f' : '#4a7c59');

    const dVisitas = textoDelta(a.visitas, p.visitas);
    const dCarrito = textoDelta(a.carrito, p.carrito);
    const dPedidos = textoDelta(a.pedidos, p.pedidos);
    document.getElementById('anKpis').innerHTML = [
        tarjetaKpi('Visitas (sesiones)', numeroAn(a.visitas), dVisitas, trazoSparkline(serie.visitas, colorDe(dVisitas), 'Visitas por día')),
        tarjetaKpi('Agregaron al carrito', numeroAn(a.carrito), dCarrito, trazoSparkline(serie.carrito, colorDe(dCarrito), 'Carritos por día')),
        tarjetaKpi('Pedidos iniciados', numeroAn(a.pedidos), dPedidos, trazoSparkline(serie.pedidos, colorDe(dPedidos), 'Pedidos por día')),
        tarjetaKpi('Conversión de visita a pedido', `${porcentajeAn(a.pedidos, a.visitas)} %`,
            { texto: `${numeroAn(a.pedidos)} de ${numeroAn(a.visitas)} visitas`, color: '#5b6b60' },
            trazoSparkline(conversionDiaria, '#5b6b60', 'Conversión por día'))
    ].join('');

    renderEmbudoAnalitica(datos);
    renderInsightsAnalitica(datos);
    renderLineaAnalitica(datos);
    renderDispositivosAnalitica(datos);
}

function renderEmbudoAnalitica(datos) {
    const contenedor = document.getElementById('anEmbudo');
    const perdida = document.getElementById('anPerdida');
    const [visitas, carrito, pedidos, whatsapp] = datos.embudo.map(paso => paso.valor);
    if (visitas === 0) {
        contenedor.innerHTML = '<p class="estado-vacio">No hay eventos de embudo registrados en este período.</p>';
        perdida.hidden = true;
        return;
    }
    const pasos = [
        { texto: 'Entraron al sitio', valor: visitas, color: '#1f3a2e', minimo: 0 },
        { texto: 'Agregaron al carrito', valor: carrito, color: '#3d6b4f', minimo: 70 },
        { texto: 'Iniciaron el pedido', valor: pedidos, color: '#4a7c59', minimo: 60 },
        { texto: 'Escribieron por WhatsApp', valor: whatsapp, color: '#b7791f', minimo: 56 }
    ];
    contenedor.innerHTML = pasos.map(paso => {
        const pct = porcentajeAn(paso.valor, visitas);
        return `<div class="an-paso">
            <span class="an-paso-nombre">${paso.texto}</span>
            <div class="an-paso-pista"><div class="an-paso-barra" style="width:${Math.min(pct, 100)}%;min-width:${paso.minimo}px;background:${paso.color}">${numeroAn(paso.valor)}</div></div>
            <span class="an-paso-pct">${pct} %</span>
        </div>`;
    }).join('');

    const caeCarrito = 1 - carrito / visitas;
    const caePedido = carrito ? 1 - pedidos / carrito : 0;
    perdida.hidden = false;
    perdida.innerHTML = caeCarrito >= caePedido
        ? `<strong>Mayor pérdida:</strong><span>de cada 100 personas que miran, ${Math.round(caeCarrito * 100)} no agregan nada al carrito. Ahí está el margen más grande.</span>`
        : `<strong>Mayor pérdida:</strong><span>de cada 100 personas que agregan al carrito, ${Math.round(caePedido * 100)} no inician el pedido. Ahí está el margen más grande.</span>`;
}

function franjaDelDia(bloque) {
    const hora = 8 + bloque * 2;
    return hora < 12 ? 'a la mañana' : hora < 19 ? 'a la tarde' : 'a la noche';
}

function celdasPico(horarios, cantidad) {
    const celdas = [];
    horarios.forEach((fila, dia) => fila.forEach((valor, bloque) => { if (valor > 0) celdas.push({ dia, bloque, valor }); }));
    return celdas.sort((x, y) => y.valor - x.valor).slice(0, cantidad);
}

function renderInsightsAnalitica(datos) {
    const lista = [];
    const { movil, computadora } = datos.dispositivos;
    if (movil.sesiones && computadora.sesiones) {
        const [mayor, menor, nMayor, nMenor] = movil.sesiones >= computadora.sesiones
            ? [movil, computadora, 'celular', 'computadora'] : [computadora, movil, 'computadora', 'celular'];
        if (mayor.conversion < menor.conversion) {
            lista.push({ titulo: `El ${nMayor} trae más visitas, pero convierte menos.`, texto: `${mayor.porcentaje} % de las entradas, ${mayor.conversion} % de pedidos contra ${menor.conversion} % en ${nMenor}.` });
        } else {
            lista.push({ titulo: `El ${nMayor} trae más visitas y convierte igual o mejor.`, texto: `${mayor.porcentaje} % de las entradas, ${mayor.conversion} % de pedidos contra ${menor.conversion} % en ${nMenor}.` });
        }
    }
    const pico = celdasPico(datos.horarios, 1)[0];
    if (pico) {
        lista.push({ titulo: `Los ${DIAS_PLURAL[pico.dia]} ${franjaDelDia(pico.bloque)} es el mejor momento.`, texto: 'Conviene tener stock y responder rápido en ese horario.' });
    }
    const { actual, previo } = datos.indicadores;
    if (previo.pedidos) {
        const cambio = Math.round(((actual.pedidos - previo.pedidos) / previo.pedidos) * 100);
        if (cambio < 0) lista.push({ titulo: `Pedidos iniciados bajó ${Math.abs(cambio)} %.`, texto: 'Revisá si el paso de confirmar pedido se entiende bien.' });
        else if (cambio > 0) lista.push({ titulo: `Pedidos iniciados subió ${cambio} %.`, texto: 'Lo que cambiaste en el período está funcionando.' });
        else lista.push({ titulo: 'Pedidos iniciados se mantiene estable.', texto: 'Igual que en el período anterior.' });
    }
    document.getElementById('anInsights').innerHTML = lista.length
        ? lista.map(item => `<div class="an-insight"><strong>${escaparHTML(item.titulo)}</strong> ${escaparHTML(item.texto)}</div>`).join('')
        : '<div class="an-insight">Todavía no hay datos suficientes para sacar conclusiones. Aparecen a medida que entran visitas.</div>';
}

function renderLineaAnalitica(datos) {
    const actual = datos.serie.visitas;
    const previa = datos.serie.visitasPrevias;
    const hayPrevia = analiticaComparar && previa.some(valor => valor > 0);
    const maximo = Math.max(...actual, ...(hayPrevia ? previa : [0]), 1);
    const trazo = serie => {
        const n = serie.length;
        return `M${serie.map((valor, i) => `${n > 1 ? (i / (n - 1)) * 640 : 320} ${190 - (valor / maximo) * 170}`).join(' L')}`;
    };
    document.getElementById('anLeyenda').innerHTML = `<span><i class="an-linea-solida"></i>Últimos ${datos.dias} días</span>${hayPrevia ? `<span><i class="an-linea-punteada"></i>Anteriores ${datos.dias}</span>` : ''}`;
    document.getElementById('anLinea').innerHTML = `<svg viewBox="0 0 640 200" width="100%" height="200" role="img" aria-label="Línea de visitas diarias de los últimos ${datos.dias} días" preserveAspectRatio="none">
        <g stroke="#ece6d6" stroke-width="1"><line x1="0" y1="40" x2="640" y2="40"/><line x1="0" y1="90" x2="640" y2="90"/><line x1="0" y1="140" x2="640" y2="140"/><line x1="0" y1="190" x2="640" y2="190"/></g>
        ${hayPrevia ? `<path d="${trazo(previa)}" fill="none" stroke="#a39b83" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ''}
        <path d="${trazo(actual)}" fill="none" stroke="#1f3a2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

function renderDispositivosAnalitica(datos) {
    const fila = (nombre, d, color) => `<div class="an-disp">
        <div class="an-disp-cabecera"><span>${nombre}</span><span>${d.porcentaje} %</span></div>
        <div class="an-disp-pista"><div style="width:${d.porcentaje}%;background:${color}"></div></div>
        <span class="an-disp-nota">${d.sesiones ? `${d.conversion} de cada 100 visitas terminan en pedido` : 'Sin visitas en este período'}</span>
    </div>`;
    document.getElementById('anDispositivos').innerHTML =
        fila('Celular', datos.dispositivos.movil, '#3d6b4f') + fila('Computadora', datos.dispositivos.computadora, '#1f3a2e');
}

/* ----- Productos, horarios y páginas ----- */

function renderProductosAnalitica() {
    const datos = analiticaDatos;
    if (!datos) return;

    const productos = datos.productos;
    const maximo = Math.max(...productos.map(p => Math.max(p.agregados, p.pedidos)), 1);
    const lista = document.getElementById('anListaProductos');
    const mirar = document.getElementById('anParaMirar');
    if (!productos.length) {
        lista.innerHTML = '<p class="estado-vacio">Todavía no hay datos. A partir de ahora el sitio registra qué producto se agrega al carrito, y acá se compara con lo que se compra.</p>';
    } else {
        lista.innerHTML = productos.slice(0, 6).map(p => `<div class="an-producto">
            <div class="an-producto-cabecera"><strong>${escaparHTML(p.nombre)}</strong><span>${p.agregados ? `${p.pedidos} de ${p.agregados} se compran` : `${p.pedidos} ${p.pedidos === 1 ? 'pedido' : 'pedidos'}`}</span></div>
            <div class="an-barra-pista"><div style="width:${(p.agregados / maximo) * 100}%;background:#a9c5b3"></div></div>
            <div class="an-barra-pista"><div style="width:${(p.pedidos / maximo) * 100}%;background:#1f3a2e"></div></div>
        </div>`).join('');
    }
    const candidato = productos.filter(p => p.agregados >= 5).sort((x, y) => x.pedidos / x.agregados - y.pedidos / y.agregados)[0];
    if (candidato && candidato.pedidos / candidato.agregados < 0.25) {
        mirar.hidden = false;
        mirar.innerHTML = `<strong>Para mirar:</strong><span>${escaparHTML(candidato.nombre)} se agrega mucho y casi no se compra. Puede ser precio, stock o que la foto no convence.</span>`;
    } else {
        mirar.hidden = true;
    }

    renderHorariosAnalitica(datos.horarios);
    renderPaginasAnalitica(datos.paginas);
}

function renderHorariosAnalitica(horarios) {
    const maximo = Math.max(...horarios.flat(), 0);
    const nivel = valor => (valor === 0 || maximo === 0 ? 0 : Math.max(1, Math.ceil((valor / maximo) * 4)));
    const encabezado = ['8h', '', '12h', '', '16h', '', '20h'].map(h => `<span>${h}</span>`).join('');
    const filas = horarios.map((fila, dia) => `<div class="an-calor-fila"><span class="an-calor-dia">${DIAS_SEMANA[dia]}</span>${fila.map(valor => `<div class="an-calor-celda" style="background:${COLORES_CALOR[nivel(valor)]}"></div>`).join('')}</div>`).join('');
    document.getElementById('anHorarios').innerHTML = `<div class="an-calor" role="img" aria-label="Mapa de calor de visitas por día y franja horaria; más oscuro es más visitas">
        <div class="an-calor-encabezado">${encabezado}</div>${filas}
        <div class="an-calor-leyenda"><span>Menos</span>${COLORES_CALOR.map(c => `<i style="background:${c}"></i>`).join('')}<span>Más</span></div>
    </div>`;

    const pico = document.getElementById('anPico');
    const celdas = celdasPico(horarios, 2);
    if (!celdas.length) { pico.hidden = true; return; }
    const rango = celda => `de ${8 + celda.bloque * 2} a ${10 + celda.bloque * 2}`;
    const frase = celdas.length === 2 && celdas[0].dia === celdas[1].dia
        ? `los ${DIAS_PLURAL[celdas[0].dia]} ${rango(celdas[0])} y ${rango(celdas[1])}`
        : celdas.map(celda => `los ${DIAS_PLURAL[celda.dia]} ${rango(celda)}`).join(' y ');
    pico.hidden = false;
    pico.innerHTML = `<strong>Pico:</strong><span>${frase}. Buen momento para publicar en redes.</span>`;
}

function nombreDePagina(ruta) {
    if (NOMBRES_PAGINA[ruta]) return NOMBRES_PAGINA[ruta];
    if (ruta.startsWith('/producto-')) return `Ficha: ${ruta.slice(10).replace(/-/g, ' ')}`;
    return ruta;
}

function renderPaginasAnalitica(paginas) {
    const cuerpo = document.getElementById('anCuerpoPaginas');
    document.getElementById('anPaginasVacio').hidden = paginas.length > 0;
    const maxVisitas = Math.max(...paginas.map(p => p.visitas), 1);
    const peor = paginas.filter(p => p.visitas >= maxVisitas * 0.1).sort((x, y) => x.siguen - y.siguen)[0];
    cuerpo.innerHTML = paginas.map(p => {
        const bajo = p.siguen < 30;
        return `<tr>
            <th scope="row">${escaparHTML(nombreDePagina(p.pagina))}</th>
            <td>${numeroAn(p.visitas)}</td>
            <td>${numeroAn(p.clics)}</td>
            <td><div class="an-sigue"><div class="an-sigue-pista"><div style="width:${p.siguen}%;background:${bajo ? '#b7791f' : '#4a7c59'}"></div></div><strong>${p.siguen} %</strong>${peor && peor.pagina === p.pagina && bajo ? '<span class="an-sigue-aviso">se pierden acá</span>' : ''}</div></td>
        </tr>`;
    }).join('');
}

/* ----- Clientes ----- */

function renderClientesAnalitica() {
    const datos = clientesDatos;
    if (!datos) return;
    const r = datos.resumen;
    const ticket = textoDelta(r.ticket.valor, r.ticket.previo);
    document.getElementById('anClientesKpis').innerHTML = `
        <article class="an-kpi"><span class="an-kpi-titulo">Clientes con pedido</span><div class="an-kpi-valor">${numeroAn(r.clientes)}</div><span class="an-kpi-nota">en los últimos 90 días</span></article>
        <article class="an-kpi"><span class="an-kpi-titulo">Nuevos y recurrentes</span>
            <div class="an-doble-barra"><div style="width:${r.nuevosPct}%;background:#3d6b4f"></div><div style="width:${r.recurrentesPct}%;background:#b7791f"></div></div>
            <div class="an-doble-leyenda"><span><strong>${r.nuevosPct} %</strong> nuevos</span><span><strong>${r.recurrentesPct} %</strong> vuelven a comprar</span></div></article>
        <article class="an-kpi"><span class="an-kpi-titulo">Pedido promedio</span><div class="an-kpi-valor">${formatearPrecio(r.ticket.valor)}</div><span class="an-kpi-nota" style="color:${ticket.color || '#5b6b60'}">${escaparHTML(ticket.texto || 'En los últimos 90 días')}</span></article>
        <article class="an-kpi"><span class="an-kpi-titulo">Tiempo entre compras</span><div class="an-kpi-valor">${r.entreCompras === null ? '—' : `${r.entreCompras} días`}</div><span class="an-kpi-nota">en clientes que repiten</span></article>`;

    const s = datos.segmentos;
    const segmentos = [
        { id: 'todos', texto: 'Todos', n: s.todos }, { id: 'nuevos', texto: 'Nuevos', n: s.nuevos },
        { id: 'recurrentes', texto: 'Recurrentes', n: s.recurrentes }, { id: 'inactivos', texto: 'Sin comprar hace 60 días', n: s.inactivos }
    ];
    document.getElementById('anSegmentos').innerHTML = segmentos.map(seg =>
        `<button type="button" data-segmento="${seg.id}" aria-pressed="${seg.id === segmentoClientes}">${seg.texto} <span>${seg.n}</span></button>`).join('');

    const filtrados = datos.clientes.filter(c => segmentoClientes === 'todos'
        || (segmentoClientes === 'nuevos' && c.pedidos === 1)
        || (segmentoClientes === 'recurrentes' && c.pedidos > 1)
        || (segmentoClientes === 'inactivos' && c.estado === 'inactivo'));
    document.getElementById('anClientesVacio').hidden = filtrados.length > 0;
    document.getElementById('anCuerpoClientes').innerHTML = filtrados.map(c => `<tr class="an-fila-cliente${c.id === clienteElegido ? ' elegido' : ''}" data-cliente="${escaparHTML(c.id)}" tabindex="0">
        <th scope="row">${escaparHTML(c.nombre)}</th><td>${c.pedidos}</td><td>${formatearPrecio(c.total)}</td><td>${hacePalabra(c.dias)}</td>
        <td><span class="an-estado an-estado-${c.estado}">${ETIQUETAS_ESTADO_CLIENTE[c.estado]}</span></td></tr>`).join('');
    renderFichaAnalitica();
}

function telefonoWhatsApp(telefono) {
    let digitos = String(telefono || '').replace(/\D/g, '');
    if (digitos.startsWith('0')) digitos = `598${digitos.slice(1)}`;
    return digitos;
}

function renderFichaAnalitica() {
    const ficha = document.getElementById('anFicha');
    const cliente = clientesDatos && clientesDatos.clientes.find(c => c.id === clienteElegido);
    if (!cliente) {
        ficha.innerHTML = '<p class="estado-vacio">Cuando haya pedidos, acá aparece la ficha de cada cliente.</p>';
        return;
    }
    const mensaje = encodeURIComponent(`Hola ${cliente.nombre.split(' ')[0]}, te escribimos de ZAPI.`);
    const telefono = telefonoWhatsApp(cliente.telefono);
    ficha.innerHTML = `
        <div><div class="an-etiqueta">FICHA DEL CLIENTE</div>
            <h2 class="an-ficha-nombre">${escaparHTML(cliente.nombre)}</h2>
            <span class="an-ficha-sub">Cliente desde ${textoDesde(Math.floor((Date.now() - new Date(cliente.primera).getTime()) / 86400000))}${cliente.zona ? ` · ${escaparHTML(cliente.zona)}` : ''}</span></div>
        <div class="an-ficha-cifras">
            <div><strong>${cliente.pedidos}</strong><span>pedidos</span></div>
            <div><strong>${formatearPrecio(cliente.ticket)}</strong><span>por pedido</span></div>
            <div><strong>${cliente.entreCompras === null ? '—' : `${cliente.entreCompras} d`}</strong><span>entre compras</span></div>
        </div>
        ${cliente.favoritos.length ? `<div><h3>Lo que más compra</h3><div class="an-chips">${cliente.favoritos.map(f => `<span>${escaparHTML(f)}</span>`).join('')}</div></div>` : ''}
        <div><h3>Últimos pedidos</h3><ul class="an-ultimos">${cliente.ultimos.map(u => `<li><span>${u.dias <= 0 ? 'Hoy' : `Hace ${u.dias} días`} · ${u.productos} ${u.productos === 1 ? 'producto' : 'productos'}</span><strong>${escaparHTML(u.estado.charAt(0).toUpperCase() + u.estado.slice(1))}</strong></li>`).join('')}</ul></div>
        <div class="an-ficha-acciones">
            ${telefono ? `<a class="an-boton-verde" href="https://wa.me/${telefono}?text=${mensaje}" target="_blank" rel="noopener">Escribirle por WhatsApp</a>` : ''}
            <button class="an-boton" type="button" data-ver-pedidos="${escaparHTML(cliente.nombre)}">Ver todos sus pedidos</button>
        </div>`;
}

function verPedidosDeCliente(nombre) {
    filtros.q = nombre;
    document.getElementById('filtroQ').value = nombre;
    paginaActual = 1;
    mostrarPanel('pedidos');
    cargarPedidos();
}

function descargarCsvAnalitica() {
    const datos = analiticaDatos;
    if (!datos) return;
    const celda = valor => `"${String(valor).replace(/"/g, '""')}"`;
    const a = datos.indicadores.actual;
    const filas = [
        ['Indicador', `Últimos ${datos.dias} días`],
        ['Visitas (sesiones)', a.visitas], ['Agregaron al carrito', a.carrito],
        ['Pedidos iniciados', a.pedidos], ['Escribieron por WhatsApp', a.whatsapp],
        [],
        ['Día', 'Visitas', 'Carritos', 'Pedidos iniciados'],
        ...datos.serie.visitas.map((v, i) => [i + 1, v, datos.serie.carrito[i], datos.serie.pedidos[i]])
    ];
    const csv = filas.map(fila => fila.map(celda).join(',')).join('\n');
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    enlace.download = `analitica-${datos.dias}-dias.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
}

function iniciarAnalitica() {
    document.getElementById('anVistas').addEventListener('click', evento => {
        const tab = evento.target.closest('.an-vista-tab');
        if (tab) mostrarVistaAnalitica(tab.dataset.vista);
    });
    document.getElementById('anPeriodo').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-dias]');
        if (!boton) return;
        analiticaDias = Number(boton.dataset.dias);
        document.querySelectorAll('#anPeriodo button').forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
        cargarDatosAnalitica();
    });
    document.getElementById('anComparar').addEventListener('click', evento => {
        analiticaComparar = !analiticaComparar;
        evento.currentTarget.setAttribute('aria-pressed', String(analiticaComparar));
        renderResumenAnalitica();
    });
    document.getElementById('anCsv').addEventListener('click', descargarCsvAnalitica);
    document.getElementById('anSegmentos').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-segmento]');
        if (!boton) return;
        segmentoClientes = boton.dataset.segmento;
        renderClientesAnalitica();
    });
    const elegirCliente = evento => {
        const fila = evento.target.closest('[data-cliente]');
        if (!fila || (evento.type === 'keydown' && evento.key !== 'Enter' && evento.key !== ' ')) return;
        evento.preventDefault();
        clienteElegido = fila.dataset.cliente;
        renderClientesAnalitica();
    };
    document.getElementById('anCuerpoClientes').addEventListener('click', elegirCliente);
    document.getElementById('anCuerpoClientes').addEventListener('keydown', elegirCliente);
    document.getElementById('anFicha').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-ver-pedidos]');
        if (boton) verPedidosDeCliente(boton.dataset.verPedidos);
    });
}

/* ----- Estilo del sitio: editor a pantalla completa ----- */

const ESQUEMA = window.ESQUEMA_EDITABLE;
const ANCHO_DISPOSITIVO = { escritorio: 1280, tablet: 768, celular: 390 };
const CATEGORIAS_IMAGEN = [
    { id: 'todas', nombre: 'Todas' },
    { id: 'portadas', nombre: 'Portadas' },
    { id: 'productos', nombre: 'Productos' },
    { id: 'servicios', nombre: 'Servicios' },
    { id: 'equipo', nombre: 'Equipo' }
];
const PALETAS = {
    bosque: { primario: '#1f3a2e', secundario: '#3d6b4f', acento: '#4a7c59' },
    tierra: { primario: '#2c4a3a', secundario: '#8a5a3c', acento: '#c98a4b' },
    rocio: { primario: '#1d3b4a', secundario: '#2f6f73', acento: '#5aa19a' }
};
const ESTILO_BASE = { colores: PALETAS.bosque, tipografia: 'bebas-inter', botones: 'redondeado' };

let contenidoEstilo = {};          /* lo que la persona cambió: { pagina: { seccion: { campo: valor } } } */
let marcaEstilo = JSON.parse(JSON.stringify(ESTILO_BASE));
let publicadoEstilo = null;        /* { contenido, estilo } de lo que ya está publicado */
let originalesPagina = {};         /* textos e imágenes originales de cada página */
let seleccion = { pagina: 'inicio', seccion: 'portada' };
let pestanaInspector = 'contenido';
let dispositivo = 'escritorio';
let vistaEstilo = 'editor';
let marcoListo = null;             /* página cargada en el marco del editor */
let imagenesBiblioteca = [];
let bibliotecaCategoria = 'todas';
let bibliotecaElegida = null;      /* id de la imagen elegida */
let campoBiblioteca = null;        /* { pagina, seccion, campo } */
let contenedoresSeccion = {};

const claveCampo = (pagina, seccion, campo) => `${pagina}.${seccion}.${campo}`;
const copiar = valor => JSON.parse(JSON.stringify(valor));

function valorGuardado(pagina, seccion, campo) {
    const p = contenidoEstilo[pagina];
    return p && p[seccion] ? p[seccion][campo] : undefined;
}

function guardarValor(pagina, seccion, campo, valor) {
    if (valor === undefined) {
        const p = contenidoEstilo[pagina];
        if (!p || !p[seccion]) return;
        delete p[seccion][campo];
        if (!Object.keys(p[seccion]).length) delete p[seccion];
        if (!Object.keys(p).length) delete contenidoEstilo[pagina];
        return;
    }
    contenidoEstilo[pagina] = contenidoEstilo[pagina] || {};
    contenidoEstilo[pagina][seccion] = contenidoEstilo[pagina][seccion] || {};
    contenidoEstilo[pagina][seccion][campo] = valor;
}

function paginaEditada() { return ESQUEMA.buscarPagina(seleccion.pagina); }
function seccionActual() { return paginaEditada().secciones.find(s => s.id === seleccion.seccion); }

function camposModificados(contenido, paginaId, seccionId) {
    const p = (contenido || {})[paginaId] || {};
    if (seccionId) return Object.keys(p[seccionId] || {}).length;
    return Object.values(p).reduce((total, campos) => total + Object.keys(campos).length, 0);
}

/* Cuántas cosas cambiaron respecto de lo publicado. */
function contarCambios() {
    if (!publicadoEstilo) return 0;
    let total = 0;
    ESQUEMA.paginas.forEach(pagina => pagina.secciones.forEach(seccion => seccion.campos.forEach(campo => {
        const a = JSON.stringify(valorEn(contenidoEstilo, pagina.id, seccion.id, campo.id) || null);
        const b = JSON.stringify(valorEn(publicadoEstilo.contenido, pagina.id, seccion.id, campo.id) || null);
        if (a !== b) total += 1;
    })));
    const pub = publicadoEstilo.estilo || {};
    const pubColores = Object.assign({}, ESTILO_BASE.colores, pub.colores || {});
    if (JSON.stringify(pubColores) !== JSON.stringify(marcaEstilo.colores)) total += 1;
    if ((pub.tipografia || ESTILO_BASE.tipografia) !== marcaEstilo.tipografia) total += 1;
    if ((pub.botones || ESTILO_BASE.botones) !== marcaEstilo.botones) total += 1;
    return total;
}

function valorEn(contenido, pagina, seccion, campo) {
    const p = contenido && contenido[pagina];
    return p && p[seccion] ? p[seccion][campo] : undefined;
}

function actualizarEstadoBarra() {
    const n = contarCambios();
    const estado = document.getElementById('edEstado');
    estado.classList.toggle('con-cambios', n > 0);
    document.getElementById('edEstadoTexto').textContent = n === 0
        ? 'Todo publicado'
        : `${n} ${n === 1 ? 'cambio sin publicar' : 'cambios sin publicar'}`;
}

/* ----- Originales de cada página ----- */

async function cargarOriginales(pagina) {
    if (originalesPagina[pagina.id]) return originalesPagina[pagina.id];
    const originales = {};
    try {
        const respuesta = await fetch('./' + pagina.archivo, { cache: 'no-cache' });
        if (!respuesta.ok) throw new Error('sin página');
        const doc = new DOMParser().parseFromString(await respuesta.text(), 'text/html');
        pagina.secciones.forEach(seccion => seccion.campos.forEach(campo => {
            const el = doc.querySelector(campo.selector);
            if (!el) return;
            if (campo.tipo === 'imagen') {
                const origen = el.getAttribute('src') || '';
                originales[claveCampo(pagina.id, seccion.id, campo.id)] = {
                    src: origen ? new URL(origen, window.location.href).href : '',
                    alt: el.getAttribute('alt') || ''
                };
            } else {
                originales[claveCampo(pagina.id, seccion.id, campo.id)] = (el.textContent || '').replace(/\s+/g, ' ').trim();
            }
        }));
    } catch (error) {
        /* Sin la página no hay textos de referencia: se edita igual. */
    }
    originalesPagina[pagina.id] = originales;
    return originales;
}

/* ----- Navegación de páginas y secciones ----- */

function textoSecciones(pagina) {
    const n = pagina.secciones.length;
    return `${n} ${n === 1 ? 'sección' : 'secciones'}`;
}

function textoSeccion(seccion) {
    const imagenes = seccion.campos.filter(c => c.tipo === 'imagen').length;
    const textos = seccion.campos.length - imagenes;
    const partes = [];
    if (imagenes) partes.push(`${imagenes} ${imagenes === 1 ? 'imagen' : 'imágenes'}`);
    if (textos) partes.push(`${textos} ${textos === 1 ? 'campo' : 'campos'}`);
    return partes.join(' · ');
}

function renderNavegacion() {
    const cuerpo = ESQUEMA.paginas.map(pagina => {
        const activa = pagina.id === seleccion.pagina && vistaEstilo === 'editor';
        const cambios = camposModificados(contenidoEstilo, pagina.id);
        const secciones = activa ? `<ul class="ed-secciones">${pagina.secciones.map(seccion => {
            const elegida = seccion.id === seleccion.seccion;
            const editada = camposModificados(contenidoEstilo, pagina.id, seccion.id) > 0;
            return `<li><button class="ed-seccion${elegida ? ' activa' : ''}" type="button" data-pagina="${pagina.id}" data-seccion="${seccion.id}">
                <span class="material-symbols-outlined ed-seccion-asa" aria-hidden="true">drag_indicator</span>
                <span class="ed-seccion-texto"><strong>${escaparHTML(seccion.titulo)}</strong><small>${escaparHTML(textoSeccion(seccion))}</small></span>
                ${editada ? '<i class="ed-seccion-punto" title="Con cambios"></i>' : ''}
            </button></li>`;
        }).join('')}</ul>` : '';
        return `<div class="ed-pagina${activa ? ' activa' : ''}">
            <button class="ed-pagina-boton" type="button" data-pagina="${pagina.id}" aria-expanded="${activa}">
                <span class="material-symbols-outlined" aria-hidden="true">${pagina.icono}</span>
                <span class="ed-pagina-nombre">${escaparHTML(pagina.titulo)}</span>
                ${cambios ? `<i class="ed-pagina-cambios" aria-label="${cambios} cambios">${cambios}</i>` : ''}
                <span class="ed-pagina-n">${textoSecciones(pagina)}</span>
            </button>${secciones}
        </div>`;
    }).join('');

    document.getElementById('edPaginas').innerHTML = `
        <div class="ed-etiqueta ed-nav-titulo">PÁGINAS</div>
        <div class="ed-nav-lista">${cuerpo}</div>
        <div class="ed-nav-pie">
            <button class="ed-nav-atajo" type="button" data-atajo="biblioteca"><span class="material-symbols-outlined" aria-hidden="true">photo_library</span><span>Biblioteca de imágenes</span><em>${imagenesBiblioteca.length || ''}</em></button>
            <button class="ed-nav-atajo${vistaEstilo === 'marca' ? ' activa' : ''}" type="button" data-atajo="marca"><span class="material-symbols-outlined" aria-hidden="true">palette</span><span>Marca y colores</span></button>
            <button class="ed-nav-atajo" type="button" data-atajo="historial"><span class="material-symbols-outlined" aria-hidden="true">history</span><span>Historial de versiones</span></button>
        </div>`;
}

async function seleccionar(paginaId, seccionId) {
    const cambioPagina = paginaId !== seleccion.pagina;
    seleccion.pagina = paginaId;
    const pagina = paginaEditada();
    seleccion.seccion = seccionId && pagina.secciones.some(s => s.id === seccionId) ? seccionId : pagina.secciones[0].id;
    if (vistaEstilo !== 'editor') mostrarVista('editor');
    await cargarOriginales(pagina);
    renderNavegacion();
    renderInspector();
    if (cambioPagina || marcoListo !== paginaId) cargarMarco();
    else resaltarSeccion(true);
}

/* ----- Inspector ----- */

function renderInspector() {
    const pagina = paginaEditada();
    const seccion = seccionActual();
    document.getElementById('edEtiqueta').textContent = `${pagina.titulo.toUpperCase()} · SECCIÓN`;
    document.getElementById('edTituloSeccion').textContent = seccion.titulo;
    document.querySelectorAll('#edTabs .ed-tab').forEach(tab => {
        const activa = tab.dataset.tab === pestanaInspector;
        tab.classList.toggle('activa', activa);
        tab.setAttribute('aria-selected', String(activa));
    });

    const originales = originalesPagina[pagina.id] || {};
    const campos = seccion.campos;
    const cuerpo = document.getElementById('edInspector');

    if (pestanaInspector === 'diseno') {
        cuerpo.innerHTML = `
            <p class="ed-ayuda">Los colores, la tipografía y la forma de los botones se definen una sola vez para todo el sitio, así las páginas no se ven distintas entre sí.</p>
            <button class="ed-boton-sec ed-ir-marca" type="button" data-atajo="marca"><span class="material-symbols-outlined" aria-hidden="true">palette</span>Abrir Marca y colores</button>`;
        return;
    }

    const visibles = campos.filter(c => (pestanaInspector === 'imagenes') === (c.tipo === 'imagen'));
    if (!visibles.length) {
        cuerpo.innerHTML = `<p class="ed-vacio">${pestanaInspector === 'imagenes'
            ? 'Esta sección no tiene imágenes editables.'
            : 'Esta sección solo tiene imágenes. Mirá la pestaña Imágenes.'}</p>`;
        return;
    }
    cuerpo.innerHTML = visibles.map(campo => (campo.tipo === 'imagen'
        ? htmlCampoImagen(pagina, seccion, campo, originales)
        : htmlCampoTexto(pagina, seccion, campo, originales))).join('');
}

function htmlCampoTexto(pagina, seccion, campo, originales) {
    const id = `ed-${pagina.id}-${seccion.id}-${campo.id}`;
    const original = originales[claveCampo(pagina.id, seccion.id, campo.id)] || '';
    const guardado = valorGuardado(pagina.id, seccion.id, campo.id);
    const valor = typeof guardado === 'string' ? guardado : original;
    const modificado = typeof guardado === 'string' && guardado !== original;
    const entrada = campo.tipo === 'parrafo'
        ? `<textarea id="${id}" rows="4" maxlength="${campo.max}" data-campo="${campo.id}">${escaparHTML(valor)}</textarea>`
        : `<input id="${id}" type="text" maxlength="${campo.max}" value="${escaparHTML(valor)}" data-campo="${campo.id}">`;
    return `<div class="ed-campo">
        <div class="ed-campo-cabecera"><label for="${id}">${escaparHTML(campo.etiqueta)}</label>
            ${modificado ? `<button class="ed-restaurar" type="button" data-restaurar="${campo.id}">Volver al original</button>` : ''}
            <span class="ed-contador" data-contador="${campo.id}">${valor.length}/${campo.max}</span></div>
        ${entrada}</div>`;
}

function htmlCampoImagen(pagina, seccion, campo, originales) {
    const original = originales[claveCampo(pagina.id, seccion.id, campo.id)] || { src: '', alt: '' };
    const guardado = valorGuardado(pagina.id, seccion.id, campo.id);
    const id = `ed-${pagina.id}-${seccion.id}-${campo.id}`;
    const src = guardado && guardado.id ? `/api/imagenes/${guardado.id}` : original.src;
    const alt = guardado && typeof guardado.alt === 'string' ? guardado.alt : original.alt;
    return `<div class="ed-campo ed-campo-imagen">
        <div class="ed-campo-cabecera"><span class="ed-campo-etiqueta">${escaparHTML(campo.etiqueta)}</span>
            ${guardado ? `<button class="ed-restaurar" type="button" data-restaurar="${campo.id}">Volver al original</button>` : ''}</div>
        <button class="ed-imagen-actual" type="button" data-elegir-imagen="${campo.id}" aria-label="Cambiar imagen">
            ${src ? `<img src="${escaparHTML(src)}" alt="">` : '<span class="ed-imagen-vacia">Sin imagen</span>'}
            <span class="ed-imagen-cambiar"><span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span>Cambiar imagen</span>
        </button>
        <p class="ed-ayuda">${escaparHTML(campo.ayuda)}</p>
        <label class="ed-campo-etiqueta" for="${id}-alt">Descripción de la imagen (alt)</label>
        <input id="${id}-alt" type="text" maxlength="160" value="${escaparHTML(alt)}" data-alt="${campo.id}" ${guardado ? '' : 'disabled'} placeholder="Qué se ve en la foto">
        ${guardado ? '' : '<p class="ed-ayuda">Elegí una imagen de la biblioteca para poder describirla.</p>'}
    </div>`;
}

function entradaInspector(evento) {
    const objetivo = evento.target;
    const pagina = paginaEditada();
    const seccion = seccionActual();
    if (objetivo.dataset.campo) {
        const campo = ESQUEMA.buscarCampo(pagina.id, seccion.id, objetivo.dataset.campo);
        const original = (originalesPagina[pagina.id] || {})[claveCampo(pagina.id, seccion.id, campo.id)] || '';
        const valor = campo.tipo === 'parrafo' ? objetivo.value : limpiarValor(objetivo.value);
        guardarValor(pagina.id, seccion.id, campo.id, valor.trim() === '' || valor === original ? undefined : valor);
        const contador = document.querySelector(`[data-contador="${campo.id}"]`);
        if (contador) contador.textContent = `${valor.length}/${campo.max}`;
        aplicarCampoVivo(pagina, seccion, campo);
        despuesDeCambio();
    } else if (objetivo.dataset.alt) {
        const campo = ESQUEMA.buscarCampo(pagina.id, seccion.id, objetivo.dataset.alt);
        const actual = valorGuardado(pagina.id, seccion.id, campo.id);
        if (!actual) return;
        guardarValor(pagina.id, seccion.id, campo.id, { id: actual.id, alt: limpiarValor(objetivo.value).slice(0, 160) });
        aplicarCampoVivo(pagina, seccion, campo);
        despuesDeCambio();
    }
}

function clicInspector(evento) {
    const restaurar = evento.target.closest('[data-restaurar]');
    const elegir = evento.target.closest('[data-elegir-imagen]');
    const atajo = evento.target.closest('[data-atajo]');
    const pagina = paginaEditada();
    const seccion = seccionActual();
    if (restaurar) {
        const campo = ESQUEMA.buscarCampo(pagina.id, seccion.id, restaurar.dataset.restaurar);
        guardarValor(pagina.id, seccion.id, campo.id, undefined);
        aplicarCampoVivo(pagina, seccion, campo);
        renderInspector();
        despuesDeCambio();
    } else if (elegir) {
        abrirBiblioteca({ pagina: pagina.id, seccion: seccion.id, campo: elegir.dataset.elegirImagen });
    } else if (atajo) {
        accionAtajo(atajo.dataset.atajo);
    }
}

function despuesDeCambio() {
    renderNavegacion();
    actualizarEstadoBarra();
}

/* ----- Marco con la página real ----- */

function docDelMarco(marco) {
    try { return marco.contentDocument && marco.contentDocument.body ? marco.contentDocument : null; } catch (error) { return null; }
}

function aplicarMarcaEn(marco) {
    const doc = docDelMarco(marco);
    const ventana = marco.contentWindow;
    if (!doc || !ventana || !ventana.ZapiEditable) return;
    ventana.ZapiEditable.aplicarEstilo(doc, { colores: marcaEstilo.colores, tipografia: marcaEstilo.tipografia, botones: marcaEstilo.botones });
}

function cargarMarco() {
    const marco = document.getElementById('edMarco');
    const pagina = paginaEditada();
    marcoListo = null;
    marco.onload = () => {
        const doc = docDelMarco(marco);
        if (!doc || !marco.contentWindow.ZapiEditable) return;
        marcoListo = pagina.id;
        aplicarMarcaEn(marco);
        marco.contentWindow.ZapiEditable.aplicarContenido(doc, pagina.id, contenidoEstilo);
        prepararMarco(doc);
        resaltarSeccion(true);
        ajustarMarco();
    };
    marco.src = './' + pagina.archivo;
    document.getElementById('edDireccion').textContent = `zapivivero.vercel.app / ${pagina.archivo === 'index.html' ? 'inicio' : pagina.archivo.replace('.html', '')}`;
}

function elementoDeSeccion(doc, seccion) {
    const elementos = seccion.campos.map(c => doc.querySelector(c.selector)).filter(Boolean);
    if (!elementos.length) return null;
    if (elementos.length === 1) return elementos[0].closest('section, header, article, aside') || elementos[0].parentElement;
    let ancestro = elementos[0].parentElement;
    while (ancestro && !elementos.every(e => ancestro.contains(e))) ancestro = ancestro.parentElement;
    return ancestro && ancestro !== doc.body && ancestro !== doc.documentElement ? ancestro : elementos[0].closest('section, header, article') || elementos[0].parentElement;
}

function prepararMarco(doc) {
    const pagina = paginaEditada();
    contenedoresSeccion = {};
    pagina.secciones.forEach(seccion => { contenedoresSeccion[seccion.id] = elementoDeSeccion(doc, seccion); });

    if (!doc.getElementById('zapi-editor-estilo')) {
        const estilo = doc.createElement('style');
        estilo.id = 'zapi-editor-estilo';
        estilo.textContent = `
            .zapi-editando { outline: 3px solid #4a7c59 !important; outline-offset: -3px; position: relative; }
            .zapi-etiqueta-seccion { position: absolute; top: 8px; left: 8px; z-index: 99999; background: #1f3a2e; color: #fff; font: 600 12px Inter, system-ui, sans-serif; padding: 6px 10px; border-radius: 999px; pointer-events: none; }
            html { cursor: default; }`;
        doc.head.appendChild(estilo);
    }
    doc.addEventListener('click', evento => {
        const enlace = evento.target.closest && evento.target.closest('a, button, form');
        if (enlace) evento.preventDefault();
        const hallada = pagina.secciones.find(seccion => {
            const contenedor = contenedoresSeccion[seccion.id];
            return contenedor && contenedor.contains(evento.target);
        });
        if (hallada && hallada.id !== seleccion.seccion) seleccionar(pagina.id, hallada.id);
    }, true);
    doc.addEventListener('submit', evento => evento.preventDefault(), true);
}

function resaltarSeccion(desplazar) {
    const doc = docDelMarco(document.getElementById('edMarco'));
    if (!doc) return;
    doc.querySelectorAll('.zapi-editando').forEach(el => el.classList.remove('zapi-editando'));
    doc.querySelectorAll('.zapi-etiqueta-seccion').forEach(el => el.remove());
    const contenedor = contenedoresSeccion[seleccion.seccion];
    if (!contenedor) return;
    contenedor.classList.add('zapi-editando');
    const etiqueta = doc.createElement('span');
    etiqueta.className = 'zapi-etiqueta-seccion';
    etiqueta.textContent = `${seccionActual().titulo} · editando`;
    contenedor.appendChild(etiqueta);
    if (desplazar) contenedor.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* Aplica un campo al marco: el valor editado o, si se borró, el original. */
function aplicarCampoVivo(pagina, seccion, campo) {
    const doc = docDelMarco(document.getElementById('edMarco'));
    if (!doc || marcoListo !== pagina.id) return;
    const elementos = doc.querySelectorAll(campo.selector);
    const guardado = valorGuardado(pagina.id, seccion.id, campo.id);
    const original = (originalesPagina[pagina.id] || {})[claveCampo(pagina.id, seccion.id, campo.id)];
    elementos.forEach(el => {
        if (campo.tipo === 'imagen') {
            if (el.tagName !== 'IMG') return;
            if (!el.dataset.zapiOriginal) el.dataset.zapiOriginal = JSON.stringify({ src: el.getAttribute('src') || '', srcset: el.getAttribute('srcset') || '', alt: el.alt || '' });
            const base = JSON.parse(el.dataset.zapiOriginal);
            if (guardado && guardado.id) {
                el.removeAttribute('srcset');
                el.src = `/api/imagenes/${guardado.id}`;
                el.alt = guardado.alt || '';
            } else {
                el.src = base.src;
                if (base.srcset) el.setAttribute('srcset', base.srcset);
                el.alt = base.alt;
            }
        } else {
            el.textContent = typeof guardado === 'string' ? guardado : (original || el.textContent);
        }
    });
}

function ajustarMarco() {
    [['edLienzo', 'edMarco'], ['edLienzoMarca', 'edMarcoMarca']].forEach(([idLienzo, idMarco]) => {
        const lienzo = document.getElementById(idLienzo);
        const marco = document.getElementById(idMarco);
        if (!lienzo || !marco || !lienzo.clientWidth) return;
        const ancho = idLienzo === 'edLienzoMarca' ? 1280 : ANCHO_DISPOSITIVO[dispositivo];
        const escala = Math.min(1, lienzo.clientWidth / ancho);
        marco.style.width = `${ancho}px`;
        marco.style.height = `${lienzo.clientHeight / escala}px`;
        marco.style.transform = `scale(${escala})`;
        marco.style.left = `${Math.max(0, (lienzo.clientWidth - ancho * escala) / 2)}px`;
    });
}

/* ----- Marca y colores ----- */

function luminancia(hex) {
    const canales = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contrasteConBlanco(hex) {
    return 1.05 / (luminancia(hex) + 0.05);
}

const NOMBRES_COLOR = { primario: 'Primario', secundario: 'Secundario', acento: 'Acento' };
const USOS_COLOR = { primario: 'botones, títulos', secundario: 'hover, íconos', acento: 'detalles, foco' };

function renderMarca() {
    ['primario', 'secundario', 'acento'].forEach(clave => {
        const hex = marcaEstilo.colores[clave];
        const sufijo = NOMBRES_COLOR[clave];
        const input = document.getElementById(`estiloColor${sufijo}`);
        if (input.value !== hex) input.value = hex;
        const razon = contrasteConBlanco(hex);
        const muestra = input.previousElementSibling;
        muestra.style.background = hex;
        document.getElementById(`contraste${sufijo}`).textContent = `${razon.toFixed(1)}:1`;
        document.getElementById(`hex${sufijo}`).textContent = `${hex.toUpperCase()} · ${USOS_COLOR[clave]}`;
        const juicio = document.getElementById(`juicio${sufijo}`);
        juicio.textContent = razon >= 7 ? 'Excelente (AAA)' : razon >= 4.5 ? 'Bueno (AA)' : 'Poco contraste con texto blanco';
        juicio.classList.toggle('ed-aviso', razon < 4.5);
    });
    document.querySelectorAll('#edPaletas .ed-paleta').forEach(boton => {
        const paleta = PALETAS[boton.dataset.paleta];
        boton.classList.toggle('activa', ['primario', 'secundario', 'acento'].every(c => paleta[c] === marcaEstilo.colores[c]));
    });
    document.querySelectorAll('#edTipografias .ed-tipografia').forEach(boton => {
        const activa = boton.dataset.tipografia === marcaEstilo.tipografia;
        boton.classList.toggle('activa', activa);
        boton.setAttribute('aria-pressed', String(activa));
    });
    document.querySelectorAll('#edBotonesEstilo .ed-forma').forEach(boton => {
        const activa = boton.dataset.botones === marcaEstilo.botones;
        boton.classList.toggle('activa', activa);
        boton.setAttribute('aria-pressed', String(activa));
    });
}

function cambioMarca() {
    renderMarca();
    aplicarMarcaEn(document.getElementById('edMarco'));
    aplicarMarcaEn(document.getElementById('edMarcoMarca'));
    actualizarEstadoBarra();
}

function clicMarca(evento) {
    const paleta = evento.target.closest('[data-paleta]');
    const tipografia = evento.target.closest('[data-tipografia]');
    const botones = evento.target.closest('[data-botones]');
    if (paleta) marcaEstilo.colores = Object.assign({}, PALETAS[paleta.dataset.paleta]);
    else if (tipografia) marcaEstilo.tipografia = tipografia.dataset.tipografia;
    else if (botones) marcaEstilo.botones = botones.dataset.botones;
    else return;
    cambioMarca();
}

function entradaColor(evento) {
    const input = evento.target.closest('.ed-color-input');
    if (!input) return;
    marcaEstilo.colores[input.name] = input.value;
    cambioMarca();
}

function mostrarVista(vista) {
    vistaEstilo = vista;
    const marca = vista === 'marca';
    document.getElementById('edEditor').hidden = marca;
    document.getElementById('edMarcaVista').hidden = !marca;
    document.querySelector('.ed-dispositivos').hidden = marca;
    document.getElementById('btnRestablecerMarca').hidden = !marca;
    document.getElementById('btnGuardarMarca').hidden = !marca;
    document.getElementById('edTituloBarra').textContent = marca ? 'Marca y colores' : 'Estilo del sitio';
    if (marca) {
        const marco = document.getElementById('edMarcoMarca');
        if (!marco.getAttribute('data-listo')) {
            marco.onload = () => { marco.setAttribute('data-listo', '1'); aplicarMarcaEn(marco); ajustarMarco(); };
            marco.src = './index.html';
        } else {
            aplicarMarcaEn(marco);
        }
        renderMarca();
    }
    renderNavegacion();
    ajustarMarco();
}

function accionAtajo(atajo) {
    if (atajo === 'biblioteca') abrirBiblioteca(null);
    else if (atajo === 'marca') mostrarVista('marca');
    else if (atajo === 'historial') abrirHistorial();
}

/* ----- Historial ----- */

async function abrirHistorial() {
    const dialogo = document.getElementById('dialogoHistorial');
    dialogo.showModal();
    bloquearScroll(true);
    try {
        const data = await fetchJson(API_PUBLICACION_HISTORIAL);
        renderHistorial(data.historial || []);
    } catch (error) {
        mostrarAviso('No se pudo cargar el historial', error.message);
    }
}

function renderHistorial(entradas) {
    const cuerpo = document.getElementById('adminCuerpoHistorial');
    const vacio = document.getElementById('adminHistorialVacio');
    if (!entradas || entradas.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    cuerpo.innerHTML = entradas.map(entrada => {
        const colores = entrada.estilo && entrada.estilo.colores ? entrada.estilo.colores : {};
        const swatches = [colores.primario, colores.secundario, colores.acento].filter(Boolean).map(color =>
            `<span class="admin-color-muestra" style="background:${escaparHTML(color)}" title="${escaparHTML(color)}"></span>`
        ).join('');
        return `
            <tr>
                <td>${escaparHTML(entrada.version)}</td>
                <td>${formatearFecha(entrada.fecha)}</td>
                <td>${escaparHTML((entrada.usuario && entrada.usuario.nombre) || (entrada.usuario && entrada.usuario.email) || '-')}</td>
                <td class="admin-numero">${escaparHTML(entrada.productos)}</td>
                <td>${escaparHTML(entrada.estilo && entrada.estilo.titulo || '-')}</td>
                <td>${swatches}</td>
                <td class="admin-acciones">
                    <button class="boton boton-texto admin-restaurar-version" data-version="${escaparHTML(entrada.version)}" type="button">Restaurar</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function restaurarVersion(version) {
    if (!window.confirm(`¿Restaurar la versión ${version} como borrador nuevo?`)) return;
    try {
        await fetchJson(`${API_PUBLICACION_RESTAURAR}/${version}`, { method: 'POST' });
        cerrarDialogo(document.getElementById('dialogoHistorial'));
        mostrarAviso('Versión restaurada', 'La versión se cargó como borrador. Revisala y publicá si te gusta.');
        cargarEstilo();
    } catch (error) {
        mostrarAviso('No se pudo restaurar la versión', error.message);
    }
}

/* ----- Biblioteca de imágenes ----- */

async function listarImagenes() {
    const data = await fetchJson(API_IMAGENES);
    imagenesBiblioteca = Array.isArray(data.imagenes) ? data.imagenes : [];
    return imagenesBiblioteca;
}

function usosDeImagen(id) {
    let usos = 0;
    Object.values(contenidoEstilo).forEach(secciones => Object.values(secciones).forEach(campos => Object.values(campos).forEach(valor => {
        if (valor && valor.id === id) usos += 1;
    })));
    return usos;
}

function campoDeBiblioteca() {
    return campoBiblioteca ? ESQUEMA.buscarCampo(campoBiblioteca.pagina, campoBiblioteca.seccion, campoBiblioteca.campo) : null;
}

async function abrirBiblioteca(campo) {
    campoBiblioteca = campo;
    bibliotecaCategoria = 'todas';
    bibliotecaElegida = null;
    document.getElementById('bibliotecaBuscar').value = '';
    const campoEsquema = campoDeBiblioteca();
    if (campoEsquema) {
        const pagina = ESQUEMA.buscarPagina(campo.pagina);
        const seccion = pagina.secciones.find(s => s.id === campo.seccion);
        document.getElementById('bibliotecaContexto').textContent = `${pagina.titulo.toUpperCase()} · ${seccion.titulo.toUpperCase()}`;
        document.getElementById('dialogoBibliotecaTitulo').textContent = 'Elegí una imagen';
        const actual = valorGuardado(campo.pagina, campo.seccion, campo.campo);
        if (actual) bibliotecaElegida = actual.id;
        if (campoEsquema.categoria && campoEsquema.categoria !== 'productos') bibliotecaCategoria = 'todas';
    } else {
        document.getElementById('bibliotecaContexto').textContent = 'BIBLIOTECA';
        document.getElementById('dialogoBibliotecaTitulo').textContent = 'Biblioteca de imágenes';
    }
    document.getElementById('dialogoBiblioteca').showModal();
    bloquearScroll(true);
    renderBiblioteca();
    try {
        await listarImagenes();
        renderBiblioteca();
        renderNavegacion();
    } catch (error) {
        mostrarAviso('No se pudo cargar la biblioteca', error.message);
    }
}

function imagenesFiltradas() {
    const texto = document.getElementById('bibliotecaBuscar').value.trim().toLowerCase();
    return imagenesBiblioteca.filter(imagen => (bibliotecaCategoria === 'todas' || imagen.categoria === bibliotecaCategoria)
        && (!texto || (imagen.nombre || '').toLowerCase().includes(texto)));
}

function nombreImagen(imagen) {
    return imagen.nombre || `imagen-${imagen.id.slice(-6)}`;
}

function renderBiblioteca() {
    document.getElementById('bibliotecaFiltros').innerHTML = CATEGORIAS_IMAGEN.map(categoria => {
        const n = categoria.id === 'todas' ? imagenesBiblioteca.length : imagenesBiblioteca.filter(i => i.categoria === categoria.id).length;
        return `<button class="ed-filtro${bibliotecaCategoria === categoria.id ? ' activa' : ''}" type="button" data-categoria="${categoria.id}">${categoria.nombre}<em>${n}</em></button>`;
    }).join('');

    const lista = imagenesFiltradas();
    document.getElementById('bibliotecaGrilla').innerHTML = lista.length ? lista.map(imagen => `
        <button class="ed-tarjeta-imagen${imagen.id === bibliotecaElegida ? ' elegida' : ''}" type="button" data-imagen="${imagen.id}">
            <span class="ed-tarjeta-foto"><img src="${escaparHTML(imagen.url)}" alt="" loading="lazy"></span>
            <span class="ed-tarjeta-nombre">${escaparHTML(nombreImagen(imagen))}</span>
            ${imagen.id === bibliotecaElegida ? '<span class="ed-tarjeta-check material-symbols-outlined" aria-hidden="true">check</span>' : ''}
        </button>`).join('') : '<p class="estado-vacio ed-grilla-vacia">No hay imágenes en esta categoría. Subí la primera arriba.</p>';
    renderDetalleImagen();
}

function renderDetalleImagen() {
    const cont = document.getElementById('bibliotecaDetalle');
    const imagen = imagenesBiblioteca.find(i => i.id === bibliotecaElegida);
    if (!imagen) {
        cont.innerHTML = '<p class="ed-vacio">Elegí una imagen para ver sus datos.</p>';
        return;
    }
    const campo = campoDeBiblioteca();
    const actual = campo ? valorGuardado(campoBiblioteca.pagina, campoBiblioteca.seccion, campoBiblioteca.campo) : null;
    const alt = actual && actual.id === imagen.id ? actual.alt || '' : '';
    const usos = usosDeImagen(imagen.id);
    cont.innerHTML = `
        <div class="ed-detalle-foto"><img id="bibliotecaVista" src="${escaparHTML(imagen.url)}" alt=""></div>
        <h3>${escaparHTML(nombreImagen(imagen))}</h3>
        <p class="ed-detalle-datos" id="bibliotecaDatos">${Math.round(imagen.bytes / 1024)} KB · ${imagen.creada ? formatearFecha(imagen.creada) : ''}</p>
        <ul class="ed-chequeos" id="bibliotecaChequeos">
            <li class="${imagen.bytes < 500 * 1024 ? 'ok' : 'aviso'}"><span class="material-symbols-outlined" aria-hidden="true">${imagen.bytes < 500 * 1024 ? 'check_circle' : 'warning'}</span>${imagen.bytes < 500 * 1024 ? 'Liviana, carga rápido' : 'Pesada: puede tardar en cargar'}</li>
            <li class="ok" id="chequeoProporcion" hidden></li>
            <li class="ok"><span class="material-symbols-outlined" aria-hidden="true">link</span>${usos ? `Se usa en ${usos} ${usos === 1 ? 'lugar' : 'lugares'}` : 'Todavía no se usa'}</li>
        </ul>
        ${campo ? `<label class="ed-campo-etiqueta" for="bibliotecaAlt">Descripción (alt)</label>
        <input id="bibliotecaAlt" type="text" maxlength="160" value="${escaparHTML(alt)}" placeholder="Qué se ve en la foto">
        <button class="ed-boton-verde ed-ancho" id="bibliotecaUsar" type="button">Usar esta imagen</button>
        <button class="ed-boton-sec ed-ancho" id="bibliotecaRecortar" type="button">Recortar antes de usar</button>` : ''}`;

    const vista = document.getElementById('bibliotecaVista');
    vista.onload = () => {
        document.getElementById('bibliotecaDatos').textContent = `${vista.naturalWidth} × ${vista.naturalHeight} px · ${Math.round(imagen.bytes / 1024)} KB`;
        if (!campo) return;
        const [a, b] = campo.proporcion;
        const real = vista.naturalWidth / vista.naturalHeight;
        const buena = Math.abs(real / (a / b) - 1) <= 0.08;
        const fila = document.getElementById('chequeoProporcion');
        fila.hidden = false;
        fila.className = buena ? 'ok' : 'aviso';
        fila.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${buena ? 'check_circle' : 'crop'}</span>${buena ? `Proporción ${a}:${b}, ideal para este lugar` : `Proporción distinta de ${a}:${b}, se puede recortar`}`;
    };
}

function usarImagen(id) {
    const c = campoBiblioteca;
    const alt = document.getElementById('bibliotecaAlt');
    guardarValor(c.pagina, c.seccion, c.campo, { id, alt: alt ? limpiarValor(alt.value).slice(0, 160) : '' });
    const pagina = ESQUEMA.buscarPagina(c.pagina);
    const seccion = pagina.secciones.find(s => s.id === c.seccion);
    aplicarCampoVivo(pagina, seccion, ESQUEMA.buscarCampo(c.pagina, c.seccion, c.campo));
    cerrarDialogo(document.getElementById('dialogoBiblioteca'));
    renderInspector();
    despuesDeCambio();
}

async function subirABiblioteca(blob, nombre, categoria) {
    const consulta = new URLSearchParams({ categoria, nombre });
    const respuesta = await fetch(`${API_IMAGENES}?${consulta}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'image/jpeg', Accept: 'application/json' },
        body: blob
    });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    return respuesta.json();
}

function categoriaDeSubida() {
    const campo = campoDeBiblioteca();
    if (bibliotecaCategoria !== 'todas') return bibliotecaCategoria;
    return campo && campo.categoria ? campo.categoria : 'productos';
}

async function subirArchivosBiblioteca(archivos) {
    const estado = document.getElementById('bibliotecaEstado');
    const original = estado.textContent;
    for (const archivo of archivos) {
        try {
            estado.textContent = `Subiendo ${archivo.name}…`;
            const blob = await reducirImagen(archivo, 1600);
            const datos = await subirABiblioteca(blob, archivo.name.replace(/\.[^.]+$/, ''), categoriaDeSubida());
            bibliotecaElegida = datos.id;
            await listarImagenes();
            renderBiblioteca();
        } catch (error) {
            estado.textContent = `No se pudo subir ${archivo.name}: ${error.message}`;
            return;
        }
    }
    estado.textContent = original;
}

/* Recorta al centro con la proporción del lugar y usa la copia recortada. */
async function recortarYUsar() {
    const campo = campoDeBiblioteca();
    const imagen = imagenesBiblioteca.find(i => i.id === bibliotecaElegida);
    if (!campo || !imagen) return;
    const boton = document.getElementById('bibliotecaRecortar');
    boton.disabled = true;
    boton.textContent = 'Recortando…';
    try {
        const origen = await (await fetch(imagen.url, { credentials: 'include' })).blob();
        const bitmap = await createImageBitmap(origen);
        const [a, b] = campo.proporcion;
        const objetivo = a / b;
        let ancho = bitmap.width;
        let alto = bitmap.height;
        if (ancho / alto > objetivo) ancho = Math.round(alto * objetivo);
        else alto = Math.round(ancho / objetivo);
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        lienzo.getContext('2d').drawImage(bitmap, Math.round((bitmap.width - ancho) / 2), Math.round((bitmap.height - alto) / 2), ancho, alto, 0, 0, ancho, alto);
        bitmap.close();
        const blob = await new Promise((resolve, reject) => lienzo.toBlob(r => (r ? resolve(r) : reject(new Error('No se pudo recortar.'))), 'image/jpeg', 0.85));
        const datos = await subirABiblioteca(blob, `${nombreImagen(imagen)}-${a}x${b}`, imagen.categoria || 'productos');
        await listarImagenes();
        usarImagen(datos.id);
    } catch (error) {
        boton.disabled = false;
        boton.textContent = 'Recortar antes de usar';
        mostrarAviso('No se pudo recortar', error.message);
    }
}

function clicBiblioteca(evento) {
    const categoria = evento.target.closest('[data-categoria]');
    const tarjeta = evento.target.closest('[data-imagen]');
    if (categoria) {
        bibliotecaCategoria = categoria.dataset.categoria;
        renderBiblioteca();
    } else if (tarjeta) {
        bibliotecaElegida = tarjeta.dataset.imagen;
        renderBiblioteca();
    } else if (evento.target.closest('#bibliotecaUsar')) {
        usarImagen(bibliotecaElegida);
    } else if (evento.target.closest('#bibliotecaRecortar')) {
        recortarYUsar();
    } else if (evento.target.closest('#bibliotecaZona')) {
        document.getElementById('estiloArchivos').click();
    }
}

/* ----- Carga, guardado y publicación ----- */

async function cargarEstilo() {
    try {
        const [borradorDatos, publicado] = await Promise.all([
            fetchJson(API_PUBLICACION_BORRADOR),
            fetchJson('/api/publicado').catch(() => null)
        ]);
        const borrador = borradorDatos && borradorDatos.borrador ? borradorDatos.borrador : null;
        publicadoEstilo = publicado ? { contenido: publicado.contenido || {}, estilo: publicado.estilo || {} } : { contenido: {}, estilo: {} };
        const origen = borrador || publicadoEstilo;
        contenidoEstilo = origen.contenido ? copiar(origen.contenido) : {};
        const estilo = origen.estilo || {};
        marcaEstilo = {
            colores: Object.assign({}, ESTILO_BASE.colores, estilo.colores || {}),
            tipografia: estilo.tipografia || ESTILO_BASE.tipografia,
            botones: estilo.botones || ESTILO_BASE.botones
        };
        document.getElementById('estadoEstilo').hidden = true;
        listarImagenes().then(renderNavegacion).catch(() => { /* la biblioteca se carga al abrirla */ });
        actualizarEstadoBarra();
        marcoListo = null;
        await seleccionar(seleccion.pagina, seleccion.seccion);
        renderMarca();
    } catch (error) {
        mostrarAviso('No se pudo cargar el estilo', error.message);
    }
}

/* El servidor guarda también el título, el subtítulo y el botón de la portada
   en "estilo": salen de lo que se editó o, si no se tocó, del original. */
async function estiloParaGuardar() {
    const originales = await cargarOriginales(ESQUEMA.buscarPagina('inicio'));
    const valor = campo => {
        const guardado = valorGuardado('inicio', 'portada', campo);
        const original = originales[claveCampo('inicio', 'portada', campo)];
        return limpiarValor(typeof guardado === 'string' ? guardado : original || '').slice(0, 300);
    };
    return {
        titulo: valor('titulo') || 'ZAPI',
        subtitulo: valor('texto') || 'Vivero agroecológico',
        boton: valor('boton') || 'Explorar catálogo',
        colores: Object.assign({}, marcaEstilo.colores),
        tipografia: marcaEstilo.tipografia,
        botones: marcaEstilo.botones
    };
}

function coloresValidos() {
    const errores = [];
    ['primario', 'secundario', 'acento'].forEach(clave => {
        const sufijo = NOMBRES_COLOR[clave];
        const error = document.getElementById(`errorEstiloColor${sufijo}`);
        const valido = COLOR_HEX.test(marcaEstilo.colores[clave]);
        error.textContent = valido ? '' : `Color ${clave} inválido.`;
        if (!valido) errores.push(error.textContent);
    });
    return errores;
}

async function enviarBorrador() {
    const estilo = await estiloParaGuardar();
    const catalogo = Array.isArray(PRODUCTOS) ? PRODUCTOS : [];
    if (catalogo.length === 0) throw new Error('No hay productos en el catálogo para guardar el borrador.');
    await fetchJson(API_PUBLICACION_BORRADOR, {
        method: 'POST',
        body: JSON.stringify({ estilo, catalogo, contenido: contenidoEstilo })
    });
}

function estadoInspector(texto, tipo) {
    const estado = document.getElementById('estadoEstilo');
    mostrarEstadoFormulario(estado, texto, tipo);
    estado.hidden = false;
}

async function guardarBorrador() {
    const errores = coloresValidos();
    if (errores.length) { estadoInspector(errores[0], 'error'); return; }
    const botones = [document.getElementById('btnGuardarBorrador'), document.getElementById('btnGuardarMarca')];
    botones.forEach(b => { b.disabled = true; });
    try {
        await enviarBorrador();
        estadoInspector('Borrador guardado. Todavía no se ve en el sitio.', 'ok');
    } catch (error) {
        mostrarAviso('No se pudo guardar el borrador', error.message);
    } finally {
        botones.forEach(b => { b.disabled = false; });
    }
}

async function publicar() {
    const errores = coloresValidos();
    if (errores.length) { estadoInspector(errores[0], 'error'); return; }
    const n = contarCambios();
    if (!window.confirm(n ? `¿Publicar ${n} ${n === 1 ? 'cambio' : 'cambios'}? Se van a ver enseguida en el sitio.` : '¿Publicar esta versión del sitio?')) return;
    const boton = document.getElementById('btnPublicar');
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Publicando…';
    try {
        await enviarBorrador();
        const data = await fetchJson(API_PUBLICACION_PUBLICAR, { method: 'POST' });
        publicadoEstilo = { contenido: copiar(contenidoEstilo), estilo: { colores: copiar(marcaEstilo.colores), tipografia: marcaEstilo.tipografia, botones: marcaEstilo.botones } };
        actualizarEstadoBarra();
        estadoInspector(`Publicado: versión ${data.version}. Ya se ve en el sitio.`, 'ok');
    } catch (error) {
        mostrarAviso('No se pudo publicar', error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = texto;
    }
}

function descartarCambios() {
    if (!window.confirm('¿Descartar los cambios sin guardar y volver al último borrador?')) return;
    cargarEstilo();
}

function restablecerMarca() {
    marcaEstilo = copiar(ESTILO_BASE);
    cambioMarca();
}

function salirDelEditor() {
    mostrarPanel('resumen');
    cargarResumen();
}

function iniciarEditorEstilo() {
    document.getElementById('edPaginas').addEventListener('click', evento => {
        const seccion = evento.target.closest('.ed-seccion');
        const pagina = evento.target.closest('.ed-pagina-boton');
        const atajo = evento.target.closest('[data-atajo]');
        if (seccion) seleccionar(seccion.dataset.pagina, seccion.dataset.seccion);
        else if (pagina) seleccionar(pagina.dataset.pagina, null);
        else if (atajo) accionAtajo(atajo.dataset.atajo);
    });
    const inspector = document.getElementById('edInspector');
    inspector.addEventListener('input', entradaInspector);
    inspector.addEventListener('click', clicInspector);
    document.getElementById('edTabs').addEventListener('click', evento => {
        const tab = evento.target.closest('.ed-tab');
        if (!tab) return;
        pestanaInspector = tab.dataset.tab;
        renderInspector();
    });
    document.getElementById('edDispositivos').addEventListener('click', evento => {
        const boton = evento.target.closest('.ed-dispositivo');
        if (!boton) return;
        dispositivo = boton.dataset.dispositivo;
        document.querySelectorAll('#edDispositivos .ed-dispositivo').forEach(b => {
            b.classList.toggle('activo', b === boton);
            b.classList.toggle('activa', b === boton);
            b.setAttribute('aria-pressed', String(b === boton));
        });
        ajustarMarco();
    });
    document.getElementById('edMarcaVista').addEventListener('click', clicMarca);
    document.getElementById('edMarcaVista').addEventListener('input', entradaColor);
    document.getElementById('edVolver').addEventListener('click', () => {
        if (vistaEstilo === 'marca') mostrarVista('editor');
        else salirDelEditor();
    });
    document.getElementById('btnRestablecerMarca').addEventListener('click', restablecerMarca);
    document.getElementById('btnGuardarMarca').addEventListener('click', guardarBorrador);
    document.getElementById('btnDescartar').addEventListener('click', descartarCambios);

    const dialogoBiblioteca = document.getElementById('dialogoBiblioteca');
    dialogoBiblioteca.addEventListener('click', clicBiblioteca);
    dialogoBiblioteca.addEventListener('close', () => bloquearScroll(false));
    document.querySelector('[data-cerrar-biblioteca]').addEventListener('click', () => cerrarDialogo(dialogoBiblioteca));
    document.getElementById('bibliotecaBuscar').addEventListener('input', renderBiblioteca);
    const zona = document.getElementById('bibliotecaZona');
    zona.addEventListener('keydown', evento => {
        if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); document.getElementById('estiloArchivos').click(); }
    });
    ['dragover', 'dragenter'].forEach(nombre => zona.addEventListener(nombre, evento => { evento.preventDefault(); zona.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach(nombre => zona.addEventListener(nombre, () => zona.classList.remove('sobre')));
    zona.addEventListener('drop', evento => {
        evento.preventDefault();
        subirArchivosBiblioteca([...evento.dataTransfer.files].filter(f => /^image\//.test(f.type)));
    });
    document.getElementById('estiloArchivos').addEventListener('change', evento => {
        const archivos = [...evento.target.files];
        evento.target.value = '';
        subirArchivosBiblioteca(archivos);
    });

    const dialogoHistorial = document.getElementById('dialogoHistorial');
    dialogoHistorial.addEventListener('close', () => bloquearScroll(false));
    document.querySelector('[data-cerrar-historial]').addEventListener('click', () => cerrarDialogo(dialogoHistorial));

    if (window.ResizeObserver) {
        const observador = new ResizeObserver(ajustarMarco);
        observador.observe(document.getElementById('edLienzo'));
        observador.observe(document.getElementById('edLienzoMarca'));
    }
}

/* ----- Venta presencial ----- */

function cerrarDialogo(dialogo) {
    if (dialogo) dialogo.close();
    bloquearScroll(false);
}

async function abrirVentaPresencial() {
    const form = document.getElementById('formVentaPresencial');
    limpiarErrores(form);
    form.reset();
    document.getElementById('estadoVentaPresencial').hidden = true;
    lineasVenta = [{ productoId: '', cantidad: 1 }];
    if (productosVenta.length === 0) {
        try {
            const data = await fetchJson(API_PRODUCTOS);
            productosVenta = Array.isArray(data.products) ? data.products : [];
        } catch (error) {
            mostrarAviso('No se pudieron cargar los productos', error.message);
            return;
        }
    }
    renderLineasVenta();
    dialogoVentaPresencial.showModal();
    bloquearScroll(true);
}

function renderLineasVenta() {
    const contenedor = document.getElementById('ventaLineas');
    contenedor.innerHTML = lineasVenta.map((linea, indice) => {
        const seleccionada = linea.productoId || '';
        const opciones = productosVenta.map(producto => `
            <option value="${escaparHTML(producto.id)}" ${producto.id === seleccionada ? 'selected' : ''}>
                ${escaparHTML(producto.nombre)} (stock ${producto.stock})
            </option>
        `).join('');
        return `
            <div class="admin-linea-venta">
                <select class="campo-input admin-select-linea-producto" data-index="${indice}">
                    <option value="">Seleccioná un producto</option>
                    ${opciones}
                </select>
                <input class="campo-input admin-input-linea-cantidad" type="number" min="1" value="${linea.cantidad || 1}" data-index="${indice}">
                <button class="boton boton-texto admin-quitar-linea" data-index="${indice}" type="button">Quitar</button>
            </div>
        `;
    }).join('');
    actualizarTotalVenta();
}

function actualizarTotalVenta() {
    let total = 0;
    for (const linea of lineasVenta) {
        const producto = productosVenta.find(p => p.id === linea.productoId);
        if (producto) total += Number(producto.precioBase || 0) * (Number(linea.cantidad) || 0);
    }
    document.getElementById('ventaTotal').textContent = formatearPrecio(total);
}

async function guardarVentaPresencial(evento) {
    evento.preventDefault();
    const form = evento.target;
    limpiarErrores(form);
    const estado = document.getElementById('estadoVentaPresencial');
    estado.hidden = true;

    const nombre = limpiarValor(document.getElementById('ventaClienteNombre').value);
    const telefono = limpiarValor(document.getElementById('ventaClienteTelefono').value);

    let errores = [];
    if (!nombre) errores.push({ id: 'ventaClienteNombre', mensaje: 'Ingresá el nombre del cliente.' });
    if (!validarTelefono(telefono)) errores.push({ id: 'ventaClienteTelefono', mensaje: 'Ingresá un teléfono válido.' });
    if (lineasVenta.length === 0) errores.push({ id: 'ventaLineas', mensaje: 'Agregá al menos una línea de producto.' });
    for (const linea of lineasVenta) {
        if (!linea.productoId) errores.push({ id: 'ventaLineas', mensaje: 'Seleccioná un producto en todas las líneas.' });
        if (!linea.cantidad || Number(linea.cantidad) < 1) errores.push({ id: 'ventaLineas', mensaje: 'La cantidad debe ser mayor a 0.' });
    }

    if (errores.length > 0) {
        const ids = new Set(errores.map(e => e.id));
        ids.forEach(idCampo => {
            const mensaje = errores.find(e => e.id === idCampo).mensaje;
            const input = document.getElementById(idCampo);
            if (input) {
                input.classList.add('campo-con-error');
                input.setAttribute('aria-invalid', 'true');
            }
            const error = document.getElementById('error' + idCampo.charAt(0).toUpperCase() + idCampo.slice(1));
            if (error) error.textContent = mensaje;
        });
        mostrarEstadoFormulario(estado, errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    const boton = document.getElementById('adminGuardarVentaPresencial');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando...';

    try {
        await fetchJson(API_PEDIDO_PRESENCIAL, {
            method: 'POST',
            body: JSON.stringify({
                cliente: { nombre, telefono },
                lineas: lineasVenta.map(linea => ({ productoId: linea.productoId, cantidad: Number(linea.cantidad) }))
            })
        });
        mostrarAviso('Venta creada', 'La venta presencial se registró correctamente.');
        cerrarVentaPresencial();
        cargarPedidos();
    } catch (error) {
        mostrarAviso('No se pudo crear la venta', error.message);
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

function cerrarVentaPresencial() {
    cerrarDialogo(dialogoVentaPresencial);
}

/* ----- Producto: alta y edición (datos + imágenes) ----- */

/* Las imágenes del sitio son relativas a la raíz publicada; el admin vive allí. */
function srcImagen(ruta) {
    return /^public\//.test(ruta) ? './' + ruta : ruta;
}

function renderGaleria() {
    const lista = document.getElementById('prodGaleria');
    document.getElementById('prodGaleriaVacia').hidden = imagenesProducto.length > 0;
    lista.innerHTML = imagenesProducto.map((ruta, indice) => `
        <li class="admin-galeria-item${indice === 0 ? ' es-principal' : ''}">
            <img src="${escaparHTML(srcImagen(ruta))}" alt="Imagen ${indice + 1}" loading="lazy">
            ${indice === 0 ? '<span class="admin-galeria-marca">Principal</span>' : ''}
            <div class="admin-galeria-botones">
                ${indice === 0 ? '' : `<button class="boton boton-texto" type="button" data-img="principal" data-i="${indice}">Principal</button>`}
                <button class="boton boton-texto" type="button" data-img="quitar" data-i="${indice}">Quitar</button>
            </div>
        </li>
    `).join('');
}

function abrirProducto(id) {
    const form = document.getElementById('formProducto');
    limpiarErrores(form);
    form.reset();
    document.getElementById('estadoProducto').hidden = true;
    const producto = id === null ? null : productosCatalogo.find(item => item.id === id);
    productoEnEdicion = producto ? producto.id : null;
    document.getElementById('dialogoProductoTitulo').textContent = producto ? `Editar producto #${producto.id}` : 'Nuevo producto';

    const categorias = [...new Set(productosCatalogo.map(item => item.categoria).filter(Boolean))];
    document.getElementById('prodCategorias').innerHTML = categorias.map(c => `<option value="${escaparHTML(c)}"></option>`).join('');

    const valor = (campo, defecto) => (producto ? producto[campo] : defecto);
    document.getElementById('prodNombre').value = valor('nombre', '');
    document.getElementById('prodSlug').value = valor('slug', '');
    document.getElementById('prodCategoria').value = valor('categoria', '');
    document.getElementById('prodDescripcion').value = valor('descripcion', '');
    document.getElementById('prodPrecio').value = valor('precioBase', '');
    document.getElementById('prodStock').value = valor('stock', 8);
    document.getElementById('prodVisible').value = String(valor('visible', true));
    document.getElementById('prodActivo').value = String(valor('active', true));
    document.getElementById('prodDestacado').value = String(valor('destacado', false));
    document.getElementById('prodInfo').value = producto ? (producto.infoDeVenta || []).join('\n') : '';
    imagenesProducto = producto ? [...(producto.imagenes && producto.imagenes.length ? producto.imagenes : (producto.imagen ? [producto.imagen] : []))] : [];
    renderGaleria();
    dialogoProducto.showModal();
    bloquearScroll(true);
}

function cerrarProducto() {
    cerrarDialogo(dialogoProducto);
}

/* Reduce la foto a 1200 px (JPEG) antes de subirla: livianas para el sitio y para la base. */
async function reducirImagen(archivo, lado = 1200) {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(bitmap.width * escala));
    lienzo.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = lienzo.getContext('2d');
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    bitmap.close();
    return new Promise((resolve, reject) => {
        lienzo.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', 0.85);
    });
}

async function subirImagenes(archivos) {
    const estado = document.getElementById('estadoProducto');
    for (const archivo of archivos) {
        if (imagenesProducto.length >= MAX_IMAGENES) {
            mostrarEstadoFormulario(estado, `Máximo ${MAX_IMAGENES} imágenes por producto.`, 'error');
            estado.hidden = false;
            break;
        }
        try {
            mostrarEstadoFormulario(estado, `Subiendo ${archivo.name}...`, 'info');
            estado.hidden = false;
            const blob = await reducirImagen(archivo);
            const respuesta = await fetch(API_IMAGENES, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'image/jpeg', Accept: 'application/json' },
                body: blob
            });
            if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
            const datos = await respuesta.json();
            imagenesProducto.push(datos.url);
            renderGaleria();
            estado.hidden = true;
        } catch (error) {
            mostrarEstadoFormulario(estado, `No se pudo subir ${archivo.name}: ${error.message}`, 'error');
            estado.hidden = false;
        }
    }
}

function agregarImagenUrl() {
    const campo = document.getElementById('prodUrl');
    const estado = document.getElementById('estadoProducto');
    const url = campo.value.trim();
    if (!/^https:\/\/[^\s"'<>]{4,480}$/.test(url)) {
        mostrarEstadoFormulario(estado, 'Ingresá una URL que empiece con https://', 'error');
        estado.hidden = false;
        return;
    }
    if (imagenesProducto.length >= MAX_IMAGENES) {
        mostrarEstadoFormulario(estado, `Máximo ${MAX_IMAGENES} imágenes por producto.`, 'error');
        estado.hidden = false;
        return;
    }
    if (!imagenesProducto.includes(url)) imagenesProducto.push(url);
    campo.value = '';
    estado.hidden = true;
    renderGaleria();
}

function accionGaleria(evento) {
    const boton = evento.target.closest('[data-img]');
    if (!boton) return;
    const indice = Number(boton.dataset.i);
    if (boton.dataset.img === 'quitar') {
        imagenesProducto.splice(indice, 1);
    } else if (boton.dataset.img === 'principal') {
        const [imagen] = imagenesProducto.splice(indice, 1);
        imagenesProducto.unshift(imagen);
    }
    renderGaleria();
}

async function guardarProductoForm(evento) {
    evento.preventDefault();
    const form = evento.target;
    limpiarErrores(form);
    const estado = document.getElementById('estadoProducto');
    estado.hidden = true;

    const slug = limpiarValor(document.getElementById('prodSlug').value);
    const nombre = limpiarValor(document.getElementById('prodNombre').value);
    const precioTexto = document.getElementById('prodPrecio').value.trim();
    const stockTexto = document.getElementById('prodStock').value.trim();
    const precio = Number(precioTexto);
    const stock = Number(stockTexto);

    const errores = [];
    if (!nombre) errores.push({ id: 'prodNombre', mensaje: 'Ingresá un nombre.' });
    if (!slug) errores.push({ id: 'prodSlug', mensaje: 'Ingresá un slug.' });
    else if (!/^[a-z0-9-]+$/.test(slug)) errores.push({ id: 'prodSlug', mensaje: 'Usá solo minúsculas, números y guiones.' });
    if (precioTexto === '' || !Number.isFinite(precio) || precio < 0) errores.push({ id: 'prodPrecio', mensaje: 'Ingresá un precio válido.' });
    if (stockTexto === '' || !Number.isInteger(stock) || stock < 0) errores.push({ id: 'prodStock', mensaje: 'Ingresá un stock entero válido.' });

    if (errores.length > 0) {
        errores.forEach(error => {
            const input = document.getElementById(error.id);
            input.classList.add('campo-con-error');
            input.setAttribute('aria-invalid', 'true');
            const errorEl = document.getElementById('error' + error.id.charAt(0).toUpperCase() + error.id.slice(1));
            if (errorEl) errorEl.textContent = error.mensaje;
        });
        mostrarEstadoFormulario(estado, errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    const cuerpo = {
        slug,
        nombre,
        categoria: limpiarValor(document.getElementById('prodCategoria').value),
        descripcion: limpiarValor(document.getElementById('prodDescripcion').value),
        precioBase: precio,
        stock,
        visible: document.getElementById('prodVisible').value === 'true',
        active: document.getElementById('prodActivo').value === 'true',
        destacado: document.getElementById('prodDestacado').value === 'true',
        infoDeVenta: document.getElementById('prodInfo').value.split('\n').map(linea => linea.trim()).filter(Boolean),
        imagenes: imagenesProducto,
        imagen: imagenesProducto[0] || ''
    };

    const boton = document.getElementById('adminGuardarProducto');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Guardando...';
    const edicion = productoEnEdicion !== null;

    try {
        await fetchJson(edicion ? `${API_PRODUCTOS}/${productoEnEdicion}` : API_PRODUCTOS, {
            method: edicion ? 'PATCH' : 'POST',
            body: JSON.stringify(cuerpo)
        });
        mostrarAviso(edicion ? 'Producto actualizado' : 'Producto creado', edicion ? 'Los cambios se guardaron correctamente.' : 'El producto se agregó al catálogo.');
        cerrarProducto();
        cargarCatalogo();
    } catch (error) {
        mostrarEstadoFormulario(estado, error.message, 'error');
        estado.hidden = false;
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const botonMenu = document.getElementById('adminBotonMenu');
    const fondo = document.querySelector('.admin-sidebar-fondo');
    const cerradoresSidebar = document.querySelectorAll('[data-cerrar-sidebar]');
    ajustarSidebar();
    ESCRITORIO.addEventListener('change', ajustarSidebar);

    botonMenu.addEventListener('click', () => {
        const sidebar = document.getElementById('adminSidebar');
        sidebar.hidden ? abrirSidebar() : cerrarSidebar();
    });
    fondo.addEventListener('click', cerrarSidebar);
    cerradoresSidebar.forEach(boton => boton.addEventListener('click', cerrarSidebar));
    document.getElementById('adminSidebar').addEventListener('click', evento => {
        if (evento.target.closest('.admin-menu-enlace')) cerrarSidebar();
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !document.getElementById('adminSidebar').hidden) cerrarSidebar();
    });

    document.querySelectorAll('.admin-menu-enlace').forEach(enlace => {
        enlace.addEventListener('click', evento => {
            evento.preventDefault();
            const panel = enlace.dataset.panel;
            mostrarPanel(panel);
            if (panel === 'resumen') cargarResumen();
            else if (panel === 'pedidos') cargarPedidos();
            else if (panel === 'catalogo') cargarCatalogo();
            else if (panel === 'auditoria') cargarAuditoria();
            else if (panel === 'estilo') cargarEstilo();
            else if (panel === 'analitica') cargarAnalitica();
            else if (panel === 'mensajes') cargarMensajes();
            else if (panel === 'testimonios') cargarTestimonios();
            else if (panel === 'accesos') cargarAccesos();
        });
    });

    document.getElementById('adminCerrarSesion').addEventListener('click', async () => {
        try {
            await fetchJson('/api/auth/logout', { method: 'POST' });
        } catch (error) { /* si falla igual salimos del panel */ }
        try { sessionStorage.removeItem('zapiModoCliente'); } catch (error) { /* sin almacenamiento */ }
        window.location.href = './login.html';
    });

    const selectorModo = document.getElementById('adminModo');
    selectorModo.addEventListener('change', evento => aplicarModo(evento.target.value));
    /* Al volver con "atrás" el selector debe mostrar de nuevo el modo administrador. */
    window.addEventListener('pageshow', () => { selectorModo.value = 'admin'; });

    document.querySelectorAll('[data-cerrar-aviso]').forEach(boton => {
        boton.addEventListener('click', cerrarAviso);
    });

    /* Cerrar diálogos con el botón de cierre o clic fuera del contenido. */
    document.querySelectorAll('[data-cerrar-dialogo]').forEach(boton => {
        boton.addEventListener('click', evento => {
            const dialogo = evento.target.closest('.admin-dialog');
            if (dialogo) cerrarDialogo(dialogo);
        });
    });
    [dialogoVentaPresencial, dialogoProducto].forEach(dialogo => {
        if (!dialogo) return;
        dialogo.addEventListener('click', evento => {
            if (evento.target === dialogo) cerrarDialogo(dialogo);
        });
    });

    const form = document.getElementById('adminFiltrosPedidos');
    form.addEventListener('submit', evento => {
        evento.preventDefault();
        filtros = {
            estado: document.getElementById('filtroEstado').value,
            canal: document.getElementById('filtroCanal').value,
            fechaDesde: document.getElementById('filtroDesde').value,
            fechaHasta: document.getElementById('filtroHasta').value,
            q: document.getElementById('filtroQ').value
        };
        paginaActual = 1;
        cargarPedidos();
    });
    document.getElementById('adminLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filtroEstado').value = '';
        document.getElementById('filtroCanal').value = '';
        document.getElementById('filtroDesde').value = '';
        document.getElementById('filtroHasta').value = '';
        document.getElementById('filtroQ').value = '';
        filtros = { estado: '', canal: '', fechaDesde: '', fechaHasta: '', q: '' };
        paginaActual = 1;
        cargarPedidos();
    });

    /* Paginación (delegación: los botones se regeneran en cada carga). */
    document.getElementById('adminPaginacion').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-dir], [data-page]');
        if (!boton) return;
        if (boton.dataset.dir === 'anterior' && paginaActual > 1) paginaActual -= 1;
        if (boton.dataset.dir === 'siguiente' && paginaActual < totalPaginas) paginaActual += 1;
        if (boton.dataset.page) paginaActual = Number(boton.dataset.page);
        cargarPedidos();
    });

    /* Cambio de estado de pedidos (delegación). */
    document.getElementById('adminCuerpoPedidos').addEventListener('change', evento => {
        const select = evento.target.closest('.admin-select-estado');
        if (!select) return;
        const id = select.dataset.id;
        const estado = select.value;
        const estadoActual = select.dataset.actual;
        if (!estado || estado === estadoActual) return;
        if (estado === 'cancelado') {
            if (!window.confirm(`¿Cancelar el pedido #${id}? Se devolverá el stock de los productos al catálogo.`)) {
                select.value = estadoActual;
                return;
            }
        }
        cambiarEstadoPedido(id, estado).then(() => {
            select.dataset.actual = estado;
        }).catch(() => {
            select.value = estadoActual;
        });
    });

    /* Edición del catálogo: el botón Editar abre el diálogo del producto. */
    document.getElementById('adminCuerpoCatalogo').addEventListener('click', evento => {
        const editar = evento.target.closest('[data-accion="editar"]');
        if (editar) abrirProducto(Number(editar.dataset.id));
    });

    /* Venta presencial: líneas. */
    document.getElementById('ventaLineas').addEventListener('change', evento => {
        const select = evento.target.closest('.admin-select-linea-producto');
        const input = evento.target.closest('.admin-input-linea-cantidad');
        if (select) {
            const indice = Number(select.dataset.index);
            lineasVenta[indice].productoId = select.value || '';
            renderLineasVenta();
        }
        if (input) {
            const indice = Number(input.dataset.index);
            lineasVenta[indice].cantidad = input.value;
            actualizarTotalVenta();
        }
    });
    document.getElementById('ventaLineas').addEventListener('click', evento => {
        const quitar = evento.target.closest('.admin-quitar-linea');
        if (!quitar) return;
        if (lineasVenta.length <= 1) return;
        const indice = Number(quitar.dataset.index);
        lineasVenta.splice(indice, 1);
        renderLineasVenta();
    });
    document.getElementById('adminAgregarLineaVenta').addEventListener('click', () => {
        lineasVenta.push({ productoId: '', cantidad: 1 });
        renderLineasVenta();
    });
    document.getElementById('formVentaPresencial').addEventListener('submit', guardarVentaPresencial);

    /* Venta presencial: abrir. */
    document.getElementById('adminVentaPresencial').addEventListener('click', abrirVentaPresencial);

    /* Nuevo producto. */
    iniciarGestion();
    document.getElementById('adminNuevoProducto').addEventListener('click', () => abrirProducto(null));
    document.getElementById('formProducto').addEventListener('submit', guardarProductoForm);
    document.getElementById('prodGaleria').addEventListener('click', accionGaleria);
    document.getElementById('prodAgregarUrl').addEventListener('click', agregarImagenUrl);
    document.getElementById('prodArchivos').addEventListener('change', async evento => {
        const archivos = [...evento.target.files];
        evento.target.value = '';
        await subirImagenes(archivos);
    });

    /* Estilo del sitio: guardar borrador, vista previa, publicar. */
    iniciarEditorEstilo();
    iniciarAnalitica();
    document.getElementById('btnGuardarBorrador').addEventListener('click', guardarBorrador);
    document.getElementById('btnPublicar').addEventListener('click', publicar);

    /* Historial de publicaciones: restaurar versión (delegación). */
    document.getElementById('adminCuerpoHistorial').addEventListener('click', evento => {
        const restaurar = evento.target.closest('.admin-restaurar-version');
        if (restaurar) restaurarVersion(restaurar.dataset.version);
    });

    mostrarPanel('resumen');
    cargarResumen();
});
