'use strict';

(function () {

    async function asegurarseAdmin() {
        if (!window.zapiAuth || !window.zapiAuth.listo) {
            if (window.zapiAuth && window.zapiAuth.listo) {
                try {
                    await window.zapiAuth.listo;
                } catch (error) {
                }
            }
        }

        const usuario = window.zapiAuth && window.zapiAuth.usuario;
        if (!usuario || usuario.role !== 'admin') {
            if (window.zapiAuth && typeof window.zapiAuth.exigirCuenta === 'function') {
                window.zapiAuth.exigirCuenta();
            }
            return false;
        }

        return true;
    }

    function urlApi(ruta) {
        return window.urlApi ? window.urlApi(ruta) : ruta;
    }

    async function fetchJson(ruta, opciones) {
        const respuesta = await fetch(urlApi(ruta), {
            credentials: 'include',
            headers: { Accept: 'application/json', ...(opciones && opciones.headers ? opciones.headers : {}) },
            ...(opciones ? opciones : {}),
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            if (window.zapiAuth && typeof window.zapiAuth.exigirCuenta === 'function') {
                window.zapiAuth.exigirCuenta();
            }
            throw new Error('No autorizado');
        }

        return respuesta;
    }

    function formatearMonto(valor) {
        return new Intl.NumberFormat('es-UY', {
            style: 'currency',
            currency: 'UYU',
            maximumFractionDigits: 0,
        }).format(Number(valor) || 0);
    }

    function formatearFecha(iso) {
        if (!iso) return '—';
        const fecha = new Date(iso);
        if (Number.isNaN(fecha.getTime())) return '—';
        return new Intl.DateTimeFormat('es-UY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(fecha);
    }

    function escaparHTML(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ---------- Estadísticas ---------- */
    async function cargarEstadisticas() {
        try {
            const respuesta = await fetchJson('/api/admin/dashboard');
            const datos = await respuesta.json();

            const set = (id, valor) => {
                const el = document.getElementById(id);
                if (el) el.textContent = valor;
            };

            set('statTotalPedidos', datos.totalPedidos ?? 0);
            set('statPedidosPendientes', datos.pedidosPendientes ?? 0);
            set('statTotalUsuarios', datos.totalUsuarios ?? 0);
            set('statTotalAdmins', datos.totalAdmins ?? 0);
            set('statTestimoniosPendientes', datos.testimoniosPendientes ?? 0);
            set('statStockBajo', datos.stockBajo ?? 0);

            renderPedidosRecientes(datos.pedidosRecientes || []);
        } catch (error) {
            console.error('No se pudieron cargar las estadísticas:', error);
        }
    }

    function renderPedidosRecientes(pedidos) {
        const contenedor = document.getElementById('adminPedidosRecientes');
        if (!contenedor) return;

        if (!pedidos || pedidos.length === 0) {
            contenedor.innerHTML = '<p class="admin-vacio">No hay pedidos recientes.</p>';
            return;
        }

        const filas = pedidos.map(p => `
            <div class="admin-fila">
                <span class="admin-codigo">#${String(p.id).slice(-6).toUpperCase()}</span>
                <span class="admin-nombre">${escaparHTML(p.nombre)}</span>
                <span class="admin-telefono">${escaparHTML(p.telefono)}</span>
                <span class="admin-total">${formatearMonto(p.total)}</span>
                <span class="admin-estado admin-estado-${p.estado}">${escaparHTML(p.estado)}</span>
                <span class="admin-fecha">${formatearFecha(p.creado)}</span>
            </div>
        `).join('');

        contenedor.innerHTML = `
            <div class="admin-cabecera-tabla">
                <span>Pedido</span>
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Total</span>
                <span>Estado</span>
                <span>Fecha</span>
            </div>
            ${filas}
        `;
    }

    /* ---------- Testimonios pendientes ---------- */
    async function cargarTestimoniosPendientes() {
        try {
            const respuesta = await fetchJson('/api/admin/testimonios/pendientes');
            const datos = await respuesta.json();
            renderTestimonios(datos.testimonios || []);
        } catch (error) {
            console.error('No se pudieron cargar los testimonios:', error);
        }
    }

    function renderTestimonios(testimonios) {
        const contenedor = document.getElementById('adminTestimoniosPendientes');
        if (!contenedor) return;

        if (!testimonios || testimonios.length === 0) {
            contenedor.innerHTML = '<p class="admin-vacio">No hay testimonios pendientes.</p>';
            return;
        }

        const filas = testimonios.map(t => `
            <div class="admin-fila">
                <span class="admin-autor">${escaparHTML(t.autor)}</span>
                <span class="admin-estrellas">${'★'.repeat(t.estrellas)}${'☆'.repeat(5 - t.estrellas)}</span>
                <span class="admin-texto">${escaparHTML(t.texto)}</span>
                <span class="admin-fecha">${formatearFecha(t.creado)}</span>
            </div>
        `).join('');

        contenedor.innerHTML = `
            <div class="admin-cabecera-tabla">
                <span>Autor</span>
                <span>Calificación</span>
                <span>Opinión</span>
                <span>Fecha</span>
            </div>
            ${filas}
        `;
    }

    /* ---------- Stock bajo ---------- */
    async function cargarStockBajo() {
        try {
            const respuesta = await fetchJson('/api/admin/stock/bajo?umbral=5');
            const datos = await respuesta.json();
            renderStockBajo(datos.stockBajo || []);
        } catch (error) {
            console.error('No se pudo cargar el stock bajo:', error);
        }
    }

    function renderStockBajo(items) {
        const contenedor = document.getElementById('adminStockBajo');
        if (!contenedor) return;

        if (!items || items.length === 0) {
            contenedor.innerHTML = '<p class="admin-vacio">No hay productos con stock bajo.</p>';
            return;
        }

        const filas = items.map(s => `
            <div class="admin-fila">
                <span class="admin-producto">${escaparHTML(s.nombre)} (ID ${s.productoId})</span>
                <span class="admin-unidades">${s.unidades}</span>
                <span class="admin-precio">${formatearMonto(s.precioBase)}</span>
                <span class="admin-accion"><button type="button" class="admin-btn-ver-stock" data-id="${s.productoId}">Ver stock</button></span>
            </div>
        `).join('');

        contenedor.innerHTML = `
            <div class="admin-cabecera-tabla">
                <span>Producto</span>
                <span>Unidades</span>
                <span>Precio</span>
                <span>Acción</span>
            </div>
            ${filas}
        `;
    }

    /* ---------- Inicialización ---------- */
    function iniciar() {
        const estilo = document.createElement('style');
        estilo.textContent = `
            .admin-page { padding: 1.5rem var(--gutter); max-width: 1200px; margin: 0 auto; }
            .admin-header { margin-bottom: 2rem; }
            .admin-header h1 { font-size: 2rem; margin: 0 0 .25rem; color: var(--ink); }
            .admin-subtitle { margin: 0; color: var(--muted-texto); font-size: 1rem; }

            .admin-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }
            .admin-stat-card { background: var(--white); border: 1px solid var(--borde); border-radius: 18px; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .25rem; }
            .admin-stat-label { font-size: .85rem; color: var(--muted-texto); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
            .admin-stat-value { font-size: 1.75rem; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }

            .admin-seccion { margin-bottom: 2.5rem; }
            .admin-seccion-titulo { font-size: 1.25rem; font-weight: 700; color: var(--ink); margin: 0 0 1rem; }

            .admin-tabla { background: var(--white); border: 1px solid var(--borde); border-radius: 18px; overflow: hidden; }
            .admin-cabecera-tabla { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: .5rem; padding: .75rem 1rem; background: var(--cream); border-bottom: 1px solid var(--borde); font-size: .85rem; font-weight: 700; color: var(--muted-texto); text-transform: uppercase; letter-spacing: .05em; }
            .admin-fila { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: .5rem; padding: .75rem 1rem; border-bottom: 1px solid rgba(61, 107, 79, .08); font-size: .95rem; color: var(--ink); align-items: center; }
            .admin-fila:last-child { border-bottom: none; }
            .admin-estado { font-size: .85rem; font-weight: 700; padding: .2rem .6rem; border-radius: 999px; background: var(--sand); color: var(--forest); }
            .admin-estado-pendiente { background: var(--error-bg); color: var(--error); }
            .admin-estado-confirmado { background: var(--amber-bg); color: var(--amber-text); }
            .admin-estado-preparando { background: var(--forest-bg); color: var(--forest); }
            .admin-estado-enviado { background: var(--leaf-bg); color: var(--forest); }
            .admin-estado-entregado { background: rgba(74, 124, 89, .15); color: var(--leaf); }
            .admin-estado-cancelado { background: rgba(163, 52, 31, .1); color: var(--error); }

            .admin-vacio { padding: 1.5rem; text-align: center; color: var(--muted-texto); font-size: 1rem; margin: 0; }
            .admin-estrellas { font-size: 1.25rem; letter-spacing: .25rem; color: var(--forest); }

            .header-admin { order: 2; position: relative; z-index: 70; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0 10px; background: none; border: 1px solid rgba(31, 58, 46, .12); border-radius: 10px; flex-shrink: 0; color: var(--forest); text-decoration: none; font-size: 1.25rem; }
            .header-admin:hover { background: rgba(74, 124, 89, .12); }
            .header-admin:focus-visible { outline: 2px solid var(--leaf); outline-offset: 3px; border-radius: 10px; }

            @media (max-width: 767px) {
                .admin-cabecera-tabla, .admin-fila { grid-template-columns: 1fr 1fr 1fr 1fr; }
                .admin-cabecera-tabla span:nth-child(5), .admin-fila span:nth-child(5) { display: none; }
            }
        `;
        document.head.appendChild(estilo);

        if (window.zapiAuth && window.zapiAuth.listo) {
            window.zapiAuth.listo.then(() => {
                if (asegurarseAdmin()) {
                    cargarEstadisticas();
                    cargarTestimoniosPendientes();
                    cargarStockBajo();
                }
            }).catch(() => {});
        } else {
            asegurarseAdmin().then(ok => {
                if (ok) {
                    cargarEstadisticas();
                    cargarTestimoniosPendientes();
                    cargarStockBajo();
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', iniciar);

})();
