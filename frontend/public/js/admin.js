'use strict';

/* Panel de administración de ZAPI — operaciones.
   Consume los endpoints protegidos /api/admin/* con la cookie de sesión
   (credentials: 'include'). Solo acceso de administradores. */

const API_RESUMEN = '/api/admin/resumen';
const API_PEDIDOS = '/api/admin/pedidos';
const API_PEDIDO_PRESENCIAL = '/api/admin/pedidos/presencial';
const API_PRODUCTOS = '/api/admin/productos';
const API_AUDITORIA = '/api/admin/auditoria';
const API_PUBLICACION_BORRADOR = '/api/admin/publicacion/borrador';
const API_PUBLICACION_PUBLICAR = '/api/admin/publicacion/publicar';
const API_PUBLICACION_HISTORIAL = '/api/admin/publicacion/historial';
const API_PUBLICACION_RESTAURAR = '/api/admin/publicacion/restaurar';
const API_EVENTOS = '/api/admin/eventos';
const POR_PAGINA = 20;

const COLOR_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LIMITE_TEXTO = 120;

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
let productoEnEdicion = null;

let productosVenta = [];
let lineasVenta = [];

const panels = {
    resumen: document.getElementById('panelResumen'),
    pedidos: document.getElementById('panelPedidos'),
    catalogo: document.getElementById('panelCatalogo'),
    auditoria: document.getElementById('panelAuditoria'),
    proximo: document.getElementById('panelProximo'),
    estilo: document.getElementById('panelEstilo'),
    analitica: document.getElementById('panelAnalitica')
};

const dialogoVentaPresencial = document.getElementById('dialogoVentaPresencial');
const dialogoNuevoProducto = document.getElementById('dialogoNuevoProducto');

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
    if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => '');
        throw new Error(`Error ${respuesta.status}${texto ? ': ' + texto : ''}`);
    }
    if (respuesta.status === 204) return null;
    return respuesta.json();
}

let panelActivo = 'resumen';

function aplicarModo(modo) {
    const vista = document.getElementById('vistaCliente');
    const marco = document.getElementById('adminMarcoCliente');
    const selector = document.getElementById('adminModo');
    const cliente = modo === 'cliente';
    document.body.dataset.modo = modo;
    if (selector) selector.value = modo;
    if (!vista) return;
    vista.hidden = !cliente;
    if (cliente) {
        for (const clave of Object.keys(panels)) panels[clave].hidden = true;
        if (marco && !marco.getAttribute('src')) marco.setAttribute('src', marco.dataset.src);
    } else {
        mostrarPanel(panelActivo);
    }
}

function mostrarPanel(id) {
    panelActivo = id;
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
    cuerpo.innerHTML = productos.map(producto => {
        const enEdicion = productoEnEdicion === producto.id;
        const estadoVisible = producto.visible ? 'true' : 'false';
        const opcionVisible = `<option value="${estadoVisible}" selected>${producto.visible ? 'Sí' : 'No'}</option><option value="${producto.visible ? 'false' : 'true'}">${producto.visible ? 'No' : 'Sí'}</option>`;
        if (enEdicion) {
            return `
                <tr id="fila-producto-${producto.id}">
                    <td class="admin-codigo">#${producto.id}</td>
                    <td>${escaparHTML(producto.slug)}</td>
                    <td>${escaparHTML(producto.nombre)}</td>
                    <td>${escaparHTML(producto.categoria)}</td>
                    <td class="admin-numero"><input class="campo-input" type="number" min="0" step="0.01" value="${producto.precioBase}" data-campo="precioBase"></td>
                    <td class="admin-numero"><input class="campo-input" type="number" min="0" value="${producto.stock}" data-campo="stock"></td>
                    <td><select class="campo-input">${opcionVisible}</select></td>
                    <td>${producto.active ? 'Sí' : 'No'}</td>
                    <td>${producto.destacado ? 'Sí' : 'No'}</td>
                    <td class="admin-acciones">
                        <button class="boton boton-primario admin-guardar-producto" data-id="${producto.id}" type="button">Guardar</button>
                        <button class="boton boton-texto admin-cancelar-edicion" data-id="${producto.id}" type="button">Cancelar</button>
                    </td>
                </tr>
            `;
        }
        return `
            <tr id="fila-producto-${producto.id}">
                <td class="admin-codigo">#${producto.id}</td>
                <td>${escaparHTML(producto.slug)}</td>
                <td>${escaparHTML(producto.nombre)}</td>
                <td>${escaparHTML(producto.categoria)}</td>
                <td class="admin-numero">${formatearPrecio(producto.precioBase)}</td>
                <td><span class="stock ${claseDeStock(producto.stock)}">${textoDeStock(producto.stock)}</span></td>
                <td>${producto.visible ? 'Sí' : 'No'}</td>
                <td>${producto.active ? 'Sí' : 'No'}</td>
                <td>${producto.destacado ? 'Sí' : 'No'}</td>
                <td class="admin-acciones"><button class="boton boton-texto" data-accion="editar" data-id="${producto.id}" type="button">Editar</button></td>
            </tr>
        `;
    }).join('');
}

async function guardarProducto(id) {
    const fila = document.getElementById(`fila-producto-${id}`);
    if (!fila) return;
    const precioInput = fila.querySelector('[data-campo="precioBase"]');
    const stockInput = fila.querySelector('[data-campo="stock"]');
    const visibleSelect = fila.querySelector('select');
    const precio = Number(precioInput.value);
    const stock = Number(stockInput.value);
    if (!Number.isFinite(precio) || precio < 0) {
        mostrarAviso('Precio inválido', 'Ingresá un precio mayor o igual a 0.');
        return;
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
        mostrarAviso('Stock inválido', 'Ingresá un stock entero mayor o igual a 0.');
        return;
    }
    try {
        await fetchJson(`${API_PRODUCTOS}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ precioBase: precio, stock: stock, visible: visibleSelect.value === 'true' })
        });
        productoEnEdicion = null;
        mostrarAviso('Producto actualizado', 'Los cambios se guardaron correctamente.');
        cargarCatalogo();
    } catch (error) {
        mostrarAviso('No se pudo guardar el producto', error.message);
    }
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

async function cargarEstilo() {
    try {
        const data = await fetchJson(API_PUBLICACION_BORRADOR);
        const borrador = data && data.borrador ? data.borrador : null;
        if (borrador && borrador.estilo) {
            const { estilo } = borrador;
            const c = estilo.colores || {};
            document.getElementById('estiloTitulo').value = estilo.titulo || '';
            document.getElementById('estiloSubtitulo').value = estilo.subtitulo || '';
            document.getElementById('estiloBoton').value = estilo.boton || '';
            document.getElementById('estiloColorPrimario').value = c.primario || '#1f3a2e';
            document.getElementById('estiloColorSecundario').value = c.secundario || '#3d6b4f';
            document.getElementById('estiloColorAcento').value = c.acento || '#4a7c59';
        }
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

function obtenerEstiloDelFormulario() {
    return {
        titulo: limpiarValor(document.getElementById('estiloTitulo').value),
        subtitulo: limpiarValor(document.getElementById('estiloSubtitulo').value),
        boton: limpiarValor(document.getElementById('estiloBoton').value),
        colores: {
            primario: document.getElementById('estiloColorPrimario').value,
            secundario: document.getElementById('estiloColorSecundario').value,
            acento: document.getElementById('estiloColorAcento').value
        }
    };
}

function validarEstiloFormulario(formulario) {
    limpiarErrores(formulario);
    const estilo = obtenerEstiloDelFormulario();
    const errores = [];

    if (!estilo.titulo) errores.push({ id: 'estiloTitulo', mensaje: 'Ingresá el título de la portada.' });
    else if (estilo.titulo.length > LIMITE_TEXTO) errores.push({ id: 'estiloTitulo', mensaje: 'El título debe tener máximo 120 caracteres.' });
    if (!estilo.subtitulo) errores.push({ id: 'estiloSubtitulo', mensaje: 'Ingresá el subtítulo de la portada.' });
    else if (estilo.subtitulo.length > LIMITE_TEXTO) errores.push({ id: 'estiloSubtitulo', mensaje: 'El subtítulo debe tener máximo 120 caracteres.' });
    if (!estilo.boton) errores.push({ id: 'estiloBoton', mensaje: 'Ingresá el texto del botón.' });
    else if (estilo.boton.length > LIMITE_TEXTO) errores.push({ id: 'estiloBoton', mensaje: 'El texto del botón debe tener máximo 120 caracteres.' });
    if (!COLOR_HEX.test(estilo.colores.primario)) errores.push({ id: 'estiloColorPrimario', mensaje: 'Color primario inválido.' });
    if (!COLOR_HEX.test(estilo.colores.secundario)) errores.push({ id: 'estiloColorSecundario', mensaje: 'Color secundario inválido.' });
    if (!COLOR_HEX.test(estilo.colores.acento)) errores.push({ id: 'estiloColorAcento', mensaje: 'Color acento inválido.' });

    errores.forEach(error => {
        const input = document.getElementById(error.id);
        if (input) {
            input.classList.add('campo-con-error');
            input.setAttribute('aria-invalid', 'true');
        }
        const errorEl = document.getElementById('error' + error.id.charAt(0).toUpperCase() + error.id.slice(1));
        if (errorEl) errorEl.textContent = error.mensaje;
    });

    return { valido: errores.length === 0, estilo, errores };
}

async function guardarBorrador() {
    const form = document.getElementById('formEstilo');
    const estado = document.getElementById('estadoEstilo');
    estado.hidden = true;

    const validacion = validarEstiloFormulario(form);
    if (!validacion.valido) {
        mostrarEstadoFormulario(estado, validacion.errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    const catalogo = Array.isArray(PRODUCTOS) ? PRODUCTOS : [];
    if (catalogo.length === 0) {
        mostrarEstadoFormulario(estado, 'No hay productos en el catálogo para guardar el borrador.', 'error');
        estado.hidden = false;
        return;
    }

    const botonGuardar = document.getElementById('btnGuardarBorrador');
    const textoOriginal = botonGuardar.textContent;
    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';

    try {
        await fetchJson(API_PUBLICACION_BORRADOR, {
            method: 'POST',
            body: JSON.stringify({ estilo: validacion.estilo, catalogo })
        });
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
        mostrarEstadoFormulario(estado, validacion.errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    if (!window.confirm('¿Publicar esta versión del sitio? Se creará una nueva versión y se activará el despliegue.')) return;

    const catalogo = Array.isArray(PRODUCTOS) ? PRODUCTOS : [];
    const botonPublicar = document.getElementById('btnPublicar');
    const textoOriginal = botonPublicar.textContent;
    botonPublicar.disabled = true;
    botonPublicar.textContent = 'Publicando...';

    try {
        await fetchJson(API_PUBLICACION_BORRADOR, {
            method: 'POST',
            body: JSON.stringify({ estilo: validacion.estilo, catalogo })
        });
        const data = await fetchJson(API_PUBLICACION_PUBLICAR, { method: 'POST' });
        form.reset();
        document.getElementById('estiloColorPrimario').value = '#1f3a2e';
        document.getElementById('estiloColorSecundario').value = '#3d6b4f';
        document.getElementById('estiloColorAcento').value = '#4a7c59';
        mostrarEstadoFormulario(estado, `Publicado: versión ${data.version}.`, 'ok');
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
    const estilo = validacion.estilo;
    const params = new URLSearchParams({ estilo: JSON.stringify(estilo) });
    const url = `index.html?${params.toString()}`;
    const win = window.open(url, '_blank');
    if (!win) {
        mostrarAviso('Vista previa bloqueada', 'Permití ventanas emergentes para ver la vista previa.');
        return;
    }
    const aplicar = () => {
        try {
            const { colores } = estilo;
            const css = `
:root {
    --zapi-color-primario: ${escaparHTML(colores.primario)};
    --zapi-color-secundario: ${escaparHTML(colores.secundario)};
    --zapi-color-acento: ${escaparHTML(colores.acento)};
}
`;
            const style = win.document.createElement('style');
            style.textContent = css;
            win.document.head.appendChild(style);
        } catch (e) {
            /* No crítica: la ventana puede no estar lista aún. */
        }
    };
    if (win.document.readyState === 'complete') aplicar();
    else win.addEventListener('load', aplicar, { once: true });
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

/* ----- Nuevo producto ----- */

function abrirNuevoProducto() {
    const form = document.getElementById('formNuevoProducto');
    limpiarErrores(form);
    form.reset();
    document.getElementById('estadoNuevoProducto').hidden = true;
    dialogoNuevoProducto.showModal();
    bloquearScroll(true);
}

function cerrarNuevoProducto() {
    cerrarDialogo(dialogoNuevoProducto);
}

async function guardarNuevoProducto(evento) {
    evento.preventDefault();
    const form = evento.target;
    limpiarErrores(form);
    const estado = document.getElementById('estadoNuevoProducto');
    estado.hidden = true;

    const slug = limpiarValor(document.getElementById('nuevoSlug').value);
    const nombre = limpiarValor(document.getElementById('nuevoNombre').value);
    const precio = Number(document.getElementById('nuevoPrecio').value);
    const stock = Number(document.getElementById('nuevoStock').value);
    const visible = document.getElementById('nuevoVisible').value === 'true';

    let errores = [];
    if (!slug) errores.push({ id: 'nuevoSlug', mensaje: 'Ingresá un slug.' });
    else if (!/^[a-z0-9-]+$/.test(slug)) errores.push({ id: 'nuevoSlug', mensaje: 'Usá solo letras minúsculas, números y guiones.' });
    if (!nombre) errores.push({ id: 'nuevoNombre', mensaje: 'Ingresá un nombre.' });
    if (!Number.isFinite(precio) || precio < 0) errores.push({ id: 'nuevoPrecio', mensaje: 'Ingresá un precio válido.' });
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) errores.push({ id: 'nuevoStock', mensaje: 'Ingresá un stock válido.' });

    if (errores.length > 0) {
        errores.forEach(error => {
            const input = document.getElementById(error.id);
            if (input) {
                input.classList.add('campo-con-error');
                input.setAttribute('aria-invalid', 'true');
            }
            const errorEl = document.getElementById('error' + error.id.charAt(0).toUpperCase() + error.id.slice(1));
            if (errorEl) errorEl.textContent = error.mensaje;
        });
        mostrarEstadoFormulario(estado, errores[0].mensaje, 'error');
        estado.hidden = false;
        return;
    }

    const boton = document.getElementById('adminGuardarNuevoProducto');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Creando...';

    try {
        await fetchJson(API_PRODUCTOS, {
            method: 'POST',
            body: JSON.stringify({
                slug,
                nombre,
                categoria: '',
                imagen: '',
                imagenes: [],
                descripcion: '',
                precioBase: precio,
                stock,
                visible,
                destacado: false,
                infoDeVenta: ''
            })
        });
        mostrarAviso('Producto creado', 'El producto se agregó al catálogo.');
        cerrarNuevoProducto();
        cargarCatalogo();
    } catch (error) {
        mostrarAviso('No se pudo crear el producto', error.message);
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
            if (enlace.hasAttribute('aria-disabled') || panel === 'proximo') {
                mostrarPanel('proximo');
                return;
            }
            mostrarPanel(panel);
            if (panel === 'resumen') cargarResumen();
            else if (panel === 'pedidos') cargarPedidos();
            else if (panel === 'catalogo') cargarCatalogo();
            else if (panel === 'auditoria') cargarAuditoria();
            else if (panel === 'estilo') cargarEstilo();
            else if (panel === 'analitica') cargarAnalitica();
        });
    });

    document.getElementById('adminModo').addEventListener('change', evento => {
        aplicarModo(evento.target.value);
    });
    const volverAdmin = document.getElementById('adminVolverAdmin');
    if (volverAdmin) volverAdmin.addEventListener('click', () => aplicarModo('admin'));

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
    [dialogoVentaPresencial, dialogoNuevoProducto].forEach(dialogo => {
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

    /* Edición del catálogo (delegación: editar / guardar / cancelar). */
    document.getElementById('adminCuerpoCatalogo').addEventListener('click', evento => {
        const editar = evento.target.closest('[data-accion="editar"]');
        const guardar = evento.target.closest('.admin-guardar-producto');
        const cancelar = evento.target.closest('.admin-cancelar-edicion');
        if (editar) {
            productoEnEdicion = Number(editar.dataset.id);
            renderCatalogo(productosCatalogo);
            return;
        }
        if (cancelar) {
            productoEnEdicion = null;
            renderCatalogo(productosCatalogo);
            return;
        }
        if (guardar) {
            guardarProducto(Number(guardar.dataset.id));
            return;
        }
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
    document.getElementById('adminNuevoProducto').addEventListener('click', abrirNuevoProducto);
    document.getElementById('formNuevoProducto').addEventListener('submit', guardarNuevoProducto);

    /* Estilo del sitio: guardar borrador, vista previa, publicar. */
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
