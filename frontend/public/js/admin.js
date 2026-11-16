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
const API_EVENTOS = '/api/admin/eventos';
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

async function cargarAnalitica() {
    try {
        const data = await fetchJson(API_EVENTOS);
        renderAnalitica(data);
    } catch (error) {
        mostrarAviso('No se pudo cargar la analítica', error.message);
    }
}

function renderAnalitica(data) {
    const eventos = Array.isArray(data.eventos) ? data.eventos : [];
    const porTipo = data.porTipo || {};
    renderEmbudo(porTipo);
    renderFlujo(eventos);
    renderClicksPorPagina(eventos);
    renderRanking(eventos);
    renderDispositivos(eventos);
}

function renderEmbudo(porTipo) {
    const contenedor = document.getElementById('adminEmbudo');
    const vacio = document.getElementById('adminEmbudoVacio');
    const vistas = Number(porTipo.vista_de_pagina) || 0;
    if (vistas === 0) {
        contenedor.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    const pasos = [
        { clave: 'vista_de_pagina', label: 'Visitas' },
        { clave: 'agregar_al_carrito', label: 'Agregó al carrito' },
        { clave: 'inicio_de_pedido', label: 'Inició pedido' },
        { clave: 'clic_a_whatsapp', label: 'Contactó por WhatsApp' }
    ];
    contenedor.innerHTML = pasos.map(paso => {
        const valor = Number(porTipo[paso.clave]) || 0;
        const porcentaje = vistas > 0 ? Math.round((valor / vistas) * 100) : 0;
        const ancho = vistas > 0 ? (valor / vistas) * 100 : 0;
        return `
        <div class="admin-paso-embudo">
            <span class="admin-paso-valor">${valor}</span>
            <span class="admin-paso-label">${escaparHTML(paso.label)}</span>
            <span class="admin-paso-porcentaje">${porcentaje}%</span>
            <div class="admin-barra-embudo-wrap">
                <div class="admin-barra-embudo" style="width:${ancho}%" role="progressbar" aria-valuenow="${valor}" aria-valuemax="${vistas}" aria-label="${escaparHTML(paso.label)}: ${valor} (${porcentaje}%)"></div>
            </div>
        </div>`;
    }).join('');
}

function renderFlujo(eventos) {
    const svg = document.getElementById('adminFlujoSVG');
    const vacio = document.getElementById('adminFlujoVacio');
    if (!eventos || eventos.length === 0) {
        svg.hidden = true;
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    svg.hidden = false;

    const vistasPorPagina = {};
    for (const evento of eventos) {
        if (evento.tipo === 'vista_de_pagina' && evento.pagina) {
            vistasPorPagina[evento.pagina] = (vistasPorPagina[evento.pagina] || 0) + 1;
        }
    }
    const paginasOrdenadas = Object.entries(vistasPorPagina).sort((a, b) => b[1] - a[1]);
    const entrada = paginasOrdenadas[0] ? paginasOrdenadas[0][0] : '-';
    const segunda = paginasOrdenadas[1] ? paginasOrdenadas[1][0] : '-';
    const ultima = eventos[eventos.length - 1];
    const salida = (ultima && ultima.pagina) || '-';

    const nombreCorto = pagina => pagina === '-' ? 'Sin datos' : String(pagina).replace(/^\//, '') || 'inicio';
    const dato = (indice, fallback) => paginasOrdenadas[indice] ? paginasOrdenadas[indice][1] : fallback;

    svg.innerHTML = `<svg viewBox="0 0 560 140" class="admin-flujo-svg" aria-label="Flujo de navegación">
        <rect x="40" y="50" width="150" height="40" rx="8" class="admin-flujo-nodo"/>
        <text x="115" y="75" class="admin-flujo-texto" text-anchor="middle">${escaparHTML(nombreCorto(entrada))}</text>
        <text x="115" y="92" class="admin-flujo-dato" text-anchor="middle">${dato(0, 0)} vistas</text>
        <path d="M 190 70 L 260 70" class="admin-flujo-flecha"/>
        <path d="M 250 64 L 260 70 L 250 76" class="admin-flujo-flecha"/>
        <rect x="260" y="50" width="150" height="40" rx="8" class="admin-flujo-nodo"/>
        <text x="335" y="75" class="admin-flujo-texto" text-anchor="middle">${escaparHTML(nombreCorto(segunda))}</text>
        <text x="335" y="92" class="admin-flujo-dato" text-anchor="middle">${dato(1, 0)} vistas</text>
        <path d="M 410 70 L 480 70" class="admin-flujo-flecha"/>
        <path d="M 470 64 L 480 70 L 470 76" class="admin-flujo-flecha"/>
        <rect x="410" y="50" width="110" height="40" rx="8" class="admin-flujo-nodo admin-flujo-nodo--salida"/>
        <text x="465" y="75" class="admin-flujo-texto" text-anchor="middle">${escaparHTML(nombreCorto(salida))}</text>
        <text x="465" y="92" class="admin-flujo-dato" text-anchor="middle">Salida</text>
    </svg>`;
}

function renderClicksPorPagina(eventos) {
    const cuerpo = document.getElementById('adminCuerpoClicksPagina');
    const vacio = document.getElementById('adminClicksPaginaVacio');
    const porPagina = {};
    for (const evento of eventos) {
        if (evento.tipo === 'clic_elemento_clave' && evento.pagina) {
            porPagina[evento.pagina] = (porPagina[evento.pagina] || 0) + 1;
        }
    }
    const entradas = Object.entries(porPagina).sort((a, b) => b[1] - a[1]);
    if (entradas.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    cuerpo.innerHTML = entradas.map(([pagina, clics]) => `
        <tr>
            <td>${escaparHTML(pagina === '' ? '(inicio)' : pagina)}</td>
            <td class="admin-numero">${clics}</td>
        </tr>`).join('');
}

function renderRanking(eventos) {
    const cuerpo = document.getElementById('adminCuerpoRanking');
    const vacio = document.getElementById('adminRankingVacio');
    const porElemento = {};
    for (const evento of eventos) {
        if (!evento.elemento) continue;
        if (!porElemento[evento.elemento]) porElemento[evento.elemento] = { conteo: 0, tipo: evento.tipo };
        porElemento[evento.elemento].conteo += 1;
        if (evento.tipo !== 'clic_elemento_clave') porElemento[evento.elemento].tipo = evento.tipo;
    }
    const entradas = Object.entries(porElemento)
        .sort((a, b) => b[1].conteo - a[1].conteo)
        .slice(0, 10);
    if (entradas.length === 0) {
        cuerpo.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;
    const tipoLabel = {
        clic_elemento_clave: 'Elemento clave',
        agregar_al_carrito: 'Carrito',
        inicio_de_pedido: 'Pedido',
        clic_a_whatsapp: 'WhatsApp'
    };
    cuerpo.innerHTML = entradas.map(([elemento, datos]) => `
        <tr>
            <td>${escaparHTML(elemento)}</td>
            <td class="admin-numero">${datos.conteo}</td>
            <td>${tipoLabel[datos.tipo] || datos.tipo}</td>
        </tr>`).join('');
}

function renderDispositivos(eventos) {
    const contenedor = document.getElementById('adminDispositivos');
    const total = eventos.length;
    if (total === 0) {
        contenedor.innerHTML = '<p class="estado-vacio">No hay datos de dispositivos.</p>';
        return;
    }
    const porDispositivo = { desktop: 0, mobile: 0, desconocido: 0 };
    for (const evento of eventos) {
        const dispositivo = evento.dispositivo || 'desconocido';
        if (porDispositivo[dispositivo] === undefined) porDispositivo[dispositivo] = 0;
        porDispositivo[dispositivo] += 1;
    }
    const items = [
        { clave: 'desktop', label: 'Escritorio' },
        { clave: 'mobile', label: 'Móvil' },
        { clave: 'desconocido', label: 'Desconocido' }
    ];
    contenedor.innerHTML = items.map(item => {
        const valor = porDispositivo[item.clave] || 0;
        const porcentaje = Math.round((valor / total) * 100);
        const ancho = (valor / total) * 100;
        return `
        <div class="admin-dispositivo-item">
            <span class="admin-dispositivo-label">${escaparHTML(item.label)}</span>
            <span class="admin-dispositivo-valor">${valor}</span>
            <div class="admin-barra-dispositivo-wrap">
                <div class="admin-barra-dispositivo" style="width:${ancho}%" title="${escaparHTML(item.label)}: ${porcentaje}%"></div>
            </div>
            <span class="admin-dispositivo-porcentaje">${porcentaje}%</span>
        </div>`;
    }).join('');
}

/* ----- Estilo del sitio y publicación ----- */

/* ----- Estilo del sitio: editor por páginas ----- */

const ESQUEMA = window.ESQUEMA_EDITABLE;
const PESTANA_MARCA = 'marca';
const PESTANA_IMAGENES = 'imagenes';

let contenidoEstilo = {};          /* lo que la persona cambió: { pagina: { seccion: { campo: valor } } } */
let originalesPagina = {};         /* textos/imágenes originales leídos de cada página */
let pestanaEstilo = 'inicio';
let eleccionImagen = null;         /* { pagina, seccion, campo } mientras se elige una imagen */

function claveCampo(pagina, seccion, campo) {
    return `${pagina}.${seccion}.${campo}`;
}

function valorGuardado(pagina, seccion, campo) {
    const p = contenidoEstilo[pagina];
    return p && p[seccion] ? p[seccion][campo] : undefined;
}

function guardarValor(pagina, seccion, campo, valor) {
    if (valor === undefined) {
        const p = contenidoEstilo[pagina];
        if (p && p[seccion]) {
            delete p[seccion][campo];
            if (!Object.keys(p[seccion]).length) delete p[seccion];
            if (!Object.keys(p).length) delete contenidoEstilo[pagina];
        }
    } else {
        contenidoEstilo[pagina] = contenidoEstilo[pagina] || {};
        contenidoEstilo[pagina][seccion] = contenidoEstilo[pagina][seccion] || {};
        contenidoEstilo[pagina][seccion][campo] = valor;
    }
    marcarCambios(true);
}

function marcarCambios(hay) {
    const etiqueta = document.getElementById('estiloCambios');
    if (etiqueta) etiqueta.textContent = hay ? 'Cambios sin guardar' : '';
}

function contarModificados(paginaId) {
    const p = contenidoEstilo[paginaId] || {};
    return Object.values(p).reduce((total, campos) => total + Object.keys(campos).length, 0);
}

function urlDeImagenSitio(id) {
    return `/api/imagenes/${id}`;
}

/* Lee los textos e imágenes originales de una página del sitio. */
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

function renderPestanas() {
    const contenedor = document.getElementById('estiloPestanas');
    const paginas = ESQUEMA.paginas.map(pagina => {
        const n = contarModificados(pagina.id);
        return `<button class="estilo-pestana${pestanaEstilo === pagina.id ? ' activa' : ''}" type="button" role="tab" aria-selected="${pestanaEstilo === pagina.id}" data-pestana="${pagina.id}">${escaparHTML(pagina.titulo)}${n ? `<span class="estilo-pestana-n" aria-label="${n} cambios">${n}</span>` : ''}</button>`;
    });
    const extra = [
        `<button class="estilo-pestana${pestanaEstilo === PESTANA_MARCA ? ' activa' : ''}" type="button" role="tab" aria-selected="${pestanaEstilo === PESTANA_MARCA}" data-pestana="${PESTANA_MARCA}">Marca y colores</button>`,
        `<button class="estilo-pestana${pestanaEstilo === PESTANA_IMAGENES ? ' activa' : ''}" type="button" role="tab" aria-selected="${pestanaEstilo === PESTANA_IMAGENES}" data-pestana="${PESTANA_IMAGENES}">Imágenes</button>`
    ];
    contenedor.innerHTML = paginas.concat(extra).join('');
}

function campoTexto(pagina, seccion, campo, original) {
    const guardado = valorGuardado(pagina.id, seccion.id, campo.id);
    const valor = guardado !== undefined ? guardado : (original || '');
    const id = `ed-${pagina.id}-${seccion.id}-${campo.id}`;
    const entrada = campo.tipo === 'parrafo'
        ? `<textarea class="campo-input" id="${id}" rows="3" maxlength="${campo.max}" data-ed="${pagina.id}.${seccion.id}.${campo.id}">${escaparHTML(valor)}</textarea>`
        : `<input class="campo-input" id="${id}" type="text" maxlength="${campo.max}" value="${escaparHTML(valor)}" data-ed="${pagina.id}.${seccion.id}.${campo.id}">`;
    return `<div class="admin-campo estilo-campo${guardado !== undefined ? ' modificado' : ''}">
        <div class="estilo-campo-cabecera">
            <label class="campo-label" for="${id}">${escaparHTML(campo.etiqueta)}</label>
            <button class="estilo-restaurar" type="button" data-restaurar="${pagina.id}.${seccion.id}.${campo.id}"${guardado === undefined ? ' hidden' : ''}>Volver al original</button>
        </div>
        ${entrada}
        <span class="estilo-contador" data-contador-de="${id}">${valor.length} / ${campo.max}</span>
    </div>`;
}

function campoImagen(pagina, seccion, campo, original) {
    const guardado = valorGuardado(pagina.id, seccion.id, campo.id);
    const src = guardado ? urlDeImagenSitio(guardado.id) : (original && original.src) || '';
    const alt = guardado ? guardado.alt : (original && original.alt) || '';
    const ref = `${pagina.id}.${seccion.id}.${campo.id}`;
    return `<div class="admin-campo estilo-campo estilo-campo-imagen${guardado ? ' modificado' : ''}">
        <div class="estilo-campo-cabecera">
            <span class="campo-label">${escaparHTML(campo.etiqueta)}</span>
            <button class="estilo-restaurar" type="button" data-restaurar="${ref}"${guardado ? '' : ' hidden'}>Volver a la original</button>
        </div>
        <div class="estilo-imagen">
            ${src ? `<img class="estilo-imagen-vista" src="${escaparHTML(src)}" alt="">` : '<span class="estilo-imagen-vista estilo-imagen-vacia" aria-hidden="true"></span>'}
            <div class="estilo-imagen-datos">
                <button class="boton boton-secundario" type="button" data-elegir-imagen="${ref}">${guardado ? 'Cambiar imagen' : 'Elegir otra imagen'}</button>
                ${campo.ayuda ? `<span class="admin-ayuda">${escaparHTML(campo.ayuda)}</span>` : ''}
            </div>
        </div>
        <label class="campo-label" for="ed-alt-${pagina.id}-${seccion.id}-${campo.id}">Descripción de la imagen</label>
        <input class="campo-input" id="ed-alt-${pagina.id}-${seccion.id}-${campo.id}" type="text" maxlength="160" value="${escaparHTML(alt)}" data-ed-alt="${ref}"${guardado ? '' : ' disabled'}>
        <span class="admin-ayuda">${guardado ? 'La leen los lectores de pantalla y Google.' : 'Elegí una imagen nueva para poder cambiar su descripción.'}</span>
    </div>`;
}

async function renderPaginaEstilo() {
    const contenedor = document.getElementById('estiloPaginas');
    const marca = document.getElementById('estiloMarca');
    const imagenes = document.getElementById('estiloImagenes');
    renderPestanas();

    contenedor.hidden = pestanaEstilo === PESTANA_MARCA || pestanaEstilo === PESTANA_IMAGENES;
    marca.hidden = pestanaEstilo !== PESTANA_MARCA;
    imagenes.hidden = pestanaEstilo !== PESTANA_IMAGENES;

    if (pestanaEstilo === PESTANA_IMAGENES) {
        cargarBibliotecaPagina();
        return;
    }
    if (pestanaEstilo === PESTANA_MARCA) {
        actualizarContrastes();
        return;
    }

    const pagina = ESQUEMA.buscarPagina(pestanaEstilo);
    if (!pagina) return;
    contenedor.innerHTML = '<p class="admin-ayuda">Cargando página…</p>';
    const originales = await cargarOriginales(pagina);
    if (pestanaEstilo !== pagina.id) return;

    contenedor.innerHTML = pagina.secciones.map(seccion => `
        <section class="estilo-seccion" aria-labelledby="sec-${pagina.id}-${seccion.id}">
            <h2 class="estilo-seccion-titulo" id="sec-${pagina.id}-${seccion.id}">${escaparHTML(seccion.titulo)}</h2>
            ${seccion.campos.map(campo => {
                const original = originales[claveCampo(pagina.id, seccion.id, campo.id)];
                if (original === undefined) return '';
                return campo.tipo === 'imagen'
                    ? campoImagen(pagina, seccion, campo, original)
                    : campoTexto(pagina, seccion, campo, original);
            }).join('')}
        </section>
    `).join('');
}

function aplicarEntradaEstilo(evento) {
    const objetivo = evento.target;
    if (objetivo.matches('[data-ed]')) {
        const [pagina, seccion, campo] = objetivo.dataset.ed.split('.');
        const original = (originalesPagina[pagina] || {})[claveCampo(pagina, seccion, campo)] || '';
        const valor = objetivo.value.replace(/\s+/g, ' ').trim();
        const contador = document.querySelector(`[data-contador-de="${objetivo.id}"]`);
        if (contador) contador.textContent = `${objetivo.value.length} / ${objetivo.maxLength}`;
        const cambio = valor && valor !== original;
        guardarValor(pagina, seccion, campo, cambio ? valor : undefined);
        const caja = objetivo.closest('.estilo-campo');
        caja.classList.toggle('modificado', Boolean(cambio));
        caja.querySelector('[data-restaurar]').hidden = !cambio;
        renderPestanas();
    } else if (objetivo.matches('[data-ed-alt]')) {
        const [pagina, seccion, campo] = objetivo.dataset.edAlt.split('.');
        const actual = valorGuardado(pagina, seccion, campo);
        if (actual) guardarValor(pagina, seccion, campo, { id: actual.id, alt: objetivo.value.trim() });
    } else if (objetivo.matches('#estiloColorPrimario, #estiloColorSecundario, #estiloColorAcento')) {
        marcarCambios(true);
        actualizarContrastes();
    }
}

function clicEstilo(evento) {
    const pestana = evento.target.closest('[data-pestana]');
    if (pestana) {
        pestanaEstilo = pestana.dataset.pestana;
        renderPaginaEstilo();
        return;
    }
    const restaurar = evento.target.closest('[data-restaurar]');
    if (restaurar) {
        const [pagina, seccion, campo] = restaurar.dataset.restaurar.split('.');
        guardarValor(pagina, seccion, campo, undefined);
        renderPaginaEstilo();
        return;
    }
    const elegir = evento.target.closest('[data-elegir-imagen]');
    if (elegir) {
        const [pagina, seccion, campo] = elegir.dataset.elegirImagen.split('.');
        abrirBiblioteca({ pagina, seccion, campo });
    }
}

/* Relación de contraste del texto blanco sobre cada color de la marca. */
function luminancia(hex) {
    const limpio = hex.replace('#', '');
    const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(completo.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function actualizarContrastes() {
    const salida = document.getElementById('estiloContrastes');
    if (!salida) return;
    const colores = [
        ['Primario', 'estiloColorPrimario'],
        ['Secundario', 'estiloColorSecundario'],
        ['Acento', 'estiloColorAcento']
    ];
    salida.textContent = colores.map(([nombre, id]) => {
        const valor = document.getElementById(id).value;
        if (!COLOR_HEX.test(valor)) return `${nombre}: color inválido`;
        const razon = 1.05 / (luminancia(valor) + 0.05);
        const juicio = razon >= 4.5 ? 'se lee bien' : 'el texto blanco se lee poco';
        return `${nombre}: ${razon.toFixed(1).replace('.', ',')} · ${juicio}`;
    }).join('   ·   ');
}

/* ----- Biblioteca de imágenes ----- */

async function listarImagenes() {
    const data = await fetchJson(API_IMAGENES);
    return Array.isArray(data.imagenes) ? data.imagenes : [];
}

function tarjetasImagenes(imagenes, seleccionable) {
    if (!imagenes.length) return '<p class="estado-vacio">Todavía no subiste imágenes.</p>';
    return imagenes.map(imagen => `
        <${seleccionable ? 'button type="button" data-usar-imagen="' + imagen.id + '"' : 'div'} class="estilo-miniatura">
            <img src="${escaparHTML(imagen.url)}" alt="" loading="lazy">
            <span>${Math.round(imagen.bytes / 1024)} KB</span>
        </${seleccionable ? 'button' : 'div'}>`).join('');
}

async function cargarBibliotecaPagina() {
    const cont = document.getElementById('estiloBibliotecaPagina');
    try {
        cont.innerHTML = tarjetasImagenes(await listarImagenes(), false);
    } catch (error) {
        cont.innerHTML = `<p class="estado-vacio">No se pudo cargar la biblioteca: ${escaparHTML(error.message)}</p>`;
    }
}

async function abrirBiblioteca(eleccion) {
    eleccionImagen = eleccion;
    const dialogo = document.getElementById('dialogoBiblioteca');
    const grilla = document.getElementById('bibliotecaGrilla');
    document.getElementById('bibliotecaEstado').textContent = '';
    grilla.innerHTML = '<p class="admin-ayuda">Cargando…</p>';
    dialogo.showModal();
    bloquearScroll(true);
    try {
        grilla.innerHTML = tarjetasImagenes(await listarImagenes(), true);
    } catch (error) {
        grilla.innerHTML = `<p class="estado-vacio">No se pudo cargar la biblioteca: ${escaparHTML(error.message)}</p>`;
    }
}

async function subirArchivosEstilo(archivos, alTerminar) {
    const estado = document.getElementById('bibliotecaEstado');
    const aviso = document.getElementById('estadoEstilo');
    const informar = (mensaje, tipo) => {
        if (estado && document.getElementById('dialogoBiblioteca').open) estado.textContent = mensaje;
        else { mostrarEstadoFormulario(aviso, mensaje, tipo); aviso.hidden = !mensaje; }
    };
    let subidas = 0;
    for (const archivo of archivos) {
        try {
            informar(`Subiendo ${archivo.name}…`, 'info');
            const blob = await reducirImagen(archivo, 1600);
            const respuesta = await fetch(API_IMAGENES, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'image/jpeg', Accept: 'application/json' },
                body: blob
            });
            if (respuesta.status === 401) { window.location.href = './login.html'; return; }
            if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
            subidas += 1;
        } catch (error) {
            informar(`No se pudo subir ${archivo.name}: ${error.message}`, 'error');
            return;
        }
    }
    informar(subidas ? `Se subieron ${subidas} imagen${subidas === 1 ? '' : 'es'}.` : '', 'ok');
    if (alTerminar) await alTerminar();
}

function usarImagen(id) {
    if (!eleccionImagen) return;
    const { pagina, seccion, campo } = eleccionImagen;
    const previa = valorGuardado(pagina, seccion, campo);
    const original = (originalesPagina[pagina] || {})[claveCampo(pagina, seccion, campo)];
    guardarValor(pagina, seccion, campo, { id, alt: previa ? previa.alt : (original && original.alt) || '' });
    cerrarDialogo(document.getElementById('dialogoBiblioteca'));
    eleccionImagen = null;
    renderPaginaEstilo();
}

function iniciarEditorEstilo() {
    const formulario = document.getElementById('formEstilo');
    formulario.addEventListener('input', aplicarEntradaEstilo);
    formulario.addEventListener('click', clicEstilo);
    formulario.addEventListener('submit', evento => evento.preventDefault());

    const archivos = document.getElementById('estiloArchivos');
    document.getElementById('estiloSubirImagen').addEventListener('click', () => archivos.click());
    document.getElementById('bibliotecaSubir').addEventListener('click', () => archivos.click());
    archivos.addEventListener('change', async () => {
        const lista = [...archivos.files];
        archivos.value = '';
        if (!lista.length) return;
        const dialogoAbierto = document.getElementById('dialogoBiblioteca').open;
        await subirArchivosEstilo(lista, async () => {
            if (dialogoAbierto) {
                document.getElementById('bibliotecaGrilla').innerHTML = tarjetasImagenes(await listarImagenes(), true);
            } else {
                cargarBibliotecaPagina();
            }
        });
    });

    document.getElementById('bibliotecaGrilla').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-usar-imagen]');
        if (boton) usarImagen(boton.dataset.usarImagen);
    });
    document.getElementById('dialogoBiblioteca').addEventListener('close', () => bloquearScroll(false));
}

async function cargarEstilo() {
    try {
        const data = await fetchJson(API_PUBLICACION_BORRADOR);
        const borrador = data && data.borrador ? data.borrador : null;
        contenidoEstilo = borrador && borrador.contenido ? JSON.parse(JSON.stringify(borrador.contenido)) : {};
        if (borrador && borrador.estilo) {
            const c = borrador.estilo.colores || {};
            document.getElementById('estiloColorPrimario').value = c.primario || '#1f3a2e';
            document.getElementById('estiloColorSecundario').value = c.secundario || '#3d6b4f';
            document.getElementById('estiloColorAcento').value = c.acento || '#4a7c59';
        }
        marcarCambios(false);
        await renderPaginaEstilo();
        cargarHistorial();
    } catch (error) {
        mostrarAviso('No se pudo cargar el estilo', error.message);
    }
}

async function cargarHistorial() {
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

/* Colores de la marca, tomados del formulario. */
function coloresDelFormulario() {
    return {
        primario: document.getElementById('estiloColorPrimario').value,
        secundario: document.getElementById('estiloColorSecundario').value,
        acento: document.getElementById('estiloColorAcento').value
    };
}

/* El servidor guarda también el título, el subtítulo y el botón de la portada
   en "estilo": salen de lo que se editó o, si no se tocó, del original. */
async function estiloParaGuardar() {
    const inicio = ESQUEMA.buscarPagina('inicio');
    const originales = await cargarOriginales(inicio);
    const valor = campo => {
        const guardado = valorGuardado('inicio', 'portada', campo);
        const original = originales[claveCampo('inicio', 'portada', campo)];
        return limpiarValor(typeof guardado === 'string' ? guardado : original || '').slice(0, 300);
    };
    return {
        titulo: valor('titulo') || 'ZAPI',
        subtitulo: valor('texto') || 'Vivero agroecológico',
        boton: valor('boton') || 'Explorar catálogo',
        colores: coloresDelFormulario()
    };
}

function validarEstiloFormulario(formulario) {
    limpiarErrores(formulario);
    const colores = coloresDelFormulario();
    const errores = [];
    if (!COLOR_HEX.test(colores.primario)) errores.push({ id: 'estiloColorPrimario', mensaje: 'Color primario inválido.' });
    if (!COLOR_HEX.test(colores.secundario)) errores.push({ id: 'estiloColorSecundario', mensaje: 'Color secundario inválido.' });
    if (!COLOR_HEX.test(colores.acento)) errores.push({ id: 'estiloColorAcento', mensaje: 'Color acento inválido.' });

    errores.forEach(error => {
        const input = document.getElementById(error.id);
        if (input) {
            input.classList.add('campo-con-error');
            input.setAttribute('aria-invalid', 'true');
        }
        const errorEl = document.getElementById('error' + error.id.charAt(0).toUpperCase() + error.id.slice(1));
        if (errorEl) errorEl.textContent = error.mensaje;
    });

    return { valido: errores.length === 0, errores };
}

async function enviarBorrador() {
    const estilo = await estiloParaGuardar();
    const catalogo = Array.isArray(PRODUCTOS) ? PRODUCTOS : [];
    if (catalogo.length === 0) throw new Error('No hay productos en el catálogo para guardar el borrador.');
    await fetchJson(API_PUBLICACION_BORRADOR, {
        method: 'POST',
        body: JSON.stringify({ estilo, catalogo, contenido: contenidoEstilo })
    });
    marcarCambios(false);
}

async function guardarBorrador() {
    const form = document.getElementById('formEstilo');
    const estado = document.getElementById('estadoEstilo');
    estado.hidden = true;

    const validacion = validarEstiloFormulario(form);
    if (!validacion.valido) {
        pestanaEstilo = PESTANA_MARCA;
        renderPaginaEstilo();
        mostrarEstadoFormulario(estado, validacion.errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    const botonGuardar = document.getElementById('btnGuardarBorrador');
    const textoOriginal = botonGuardar.textContent;
    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';

    try {
        await enviarBorrador();
        mostrarEstadoFormulario(estado, 'Borrador guardado correctamente.', 'ok');
        estado.hidden = false;
        cargarHistorial();
    } catch (error) {
        mostrarAviso('No se pudo guardar el borrador', error.message);
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = textoOriginal;
    }
}

async function publicar() {
    const form = document.getElementById('formEstilo');
    const estado = document.getElementById('estadoEstilo');
    estado.hidden = true;

    const validacion = validarEstiloFormulario(form);
    if (!validacion.valido) {
        pestanaEstilo = PESTANA_MARCA;
        renderPaginaEstilo();
        mostrarEstadoFormulario(estado, validacion.errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    if (!window.confirm('¿Publicar esta versión del sitio? Los cambios se verán enseguida en la página.')) return;

    const botonPublicar = document.getElementById('btnPublicar');
    const textoOriginal = botonPublicar.textContent;
    botonPublicar.disabled = true;
    botonPublicar.textContent = 'Publicando...';

    try {
        await enviarBorrador();
        const data = await fetchJson(API_PUBLICACION_PUBLICAR, { method: 'POST' });
        mostrarEstadoFormulario(estado, `Publicado: versión ${data.version}. Ya se ve en el sitio.`, 'ok');
        estado.hidden = false;
        cargarHistorial();
    } catch (error) {
        mostrarAviso('No se pudo publicar', error.message);
    } finally {
        botonPublicar.disabled = false;
        botonPublicar.textContent = textoOriginal;
    }
}

async function restaurarVersion(version) {
    if (!window.confirm(`¿Restaurar la versión ${version} como borrador nuevo?`)) return;
    try {
        await fetchJson(`${API_PUBLICACION_RESTAURAR}/${version}`, { method: 'POST' });
        mostrarAviso('Versión restaurada', 'La versión se cargó como borrador. Revisá el formulario y guardá si necesitás cambios.');
        cargarEstilo();
    } catch (error) {
        mostrarAviso('No se pudo restaurar la versión', error.message);
    }
}

function abrirVistaPrevia() {
    const validacion = validarEstiloFormulario(document.getElementById('formEstilo'));
    if (!validacion.valido) return;
    const pagina = ESQUEMA.buscarPagina(ESQUEMA.buscarPagina(pestanaEstilo) ? pestanaEstilo : 'inicio');
    const colores = coloresDelFormulario();
    const dialogo = document.getElementById('dialogoVistaPrevia');
    const marco = document.getElementById('marcoVistaPrevia');
    document.getElementById('vistaPreviaAyuda').textContent =
        `Así se vería la página “${pagina.titulo}” con tus cambios. Todavía no está publicada.`;

    const aplicar = () => {
        try {
            const ventana = marco.contentWindow;
            const doc = marco.contentDocument;
            if (!doc || !doc.body || !ventana.ZapiEditable) return;
            ventana.ZapiEditable.aplicarColores(doc, colores);
            ventana.ZapiEditable.aplicarContenido(doc, pagina.id, contenidoEstilo);
        } catch (error) {
            /* Misma origen: no debería fallar; si falla se ve la página sin cambios. */
        }
    };
    marco.onload = aplicar;
    marco.src = './' + pagina.archivo;
    dialogo.showModal();
    bloquearScroll(true);
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
    document.getElementById('btnGuardarBorrador').addEventListener('click', guardarBorrador);
    document.getElementById('btnVistaPrevia').addEventListener('click', abrirVistaPrevia);
    document.getElementById('btnPublicar').addEventListener('click', publicar);

    /* Historial de publicaciones: restaurar versión (delegación). */
    document.getElementById('adminCuerpoHistorial').addEventListener('click', evento => {
        const restaurar = evento.target.closest('.admin-restaurar-version');
        if (restaurar) restaurarVersion(restaurar.dataset.version);
    });

    mostrarPanel('resumen');
    cargarResumen();
});
