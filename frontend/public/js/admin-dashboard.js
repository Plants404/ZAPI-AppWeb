'use strict';

/* Dashboard: ventas online y presenciales, comparación con el período
   anterior, gráfico SVG propio, métodos de pago, ranking y pendientes. */

function etiquetaEje(valor) {
    const numero = Number(valor) || 0;

    if (numero >= 1000) {
        return '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(numero / 1000) + 'k';
    }

    return '$ ' + new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(numero);
}

function puntosGrafico(dias, clave, x, y) {
    return dias.map((dia, indice) => x(indice) + ',' + y(dia[clave].ingresos)).join(' ');
}

function circulosGrafico(dias, clave, clase, x, y) {
    if (dias.length > 31) return '';

    return dias.map((dia, indice) => {
        const valor = dia[clave].ingresos;

        return `<circle class="${clase}" cx="${x(indice)}" cy="${y(valor)}" r="3">`
            + `<title>${escaparHTML(dia.fecha)}: ${escaparHTML(formatearPrecio(valor))}</title></circle>`;
    }).join('');
}

function construirGrafico(dias) {
    if (!Array.isArray(dias) || !dias.length) {
        return '<p class="admin-vacio">Sin ventas en el período.</p>';
    }

    const ancho = 860;
    const alto = 300;
    const margen = { arriba: 20, derecha: 18, abajo: 38, izquierda: 70 };
    const maximo = Math.max(
        1,
        ...dias.map(dia => Math.max(dia.online.ingresos, dia.presencial.ingresos))
    );
    const tope = Math.ceil((maximo * 1.15) / 100) * 100;
    const anchoUtil = ancho - margen.izquierda - margen.derecha;
    const altoUtil = alto - margen.arriba - margen.abajo;
    const x = indice => dias.length === 1
        ? margen.izquierda + anchoUtil / 2
        : margen.izquierda + (anchoUtil * indice) / (dias.length - 1);
    const y = valor => margen.arriba + altoUtil - (altoUtil * (Number(valor) || 0)) / tope;

    const lineas = [0, 0.25, 0.5, 0.75, 1].map(parte => {
        const valor = tope * parte;
        const posicion = y(valor);

        return `<line class="grafico-eje" x1="${margen.izquierda}" y1="${posicion}" x2="${ancho - margen.derecha}" y2="${posicion}"></line>`
            + `<text class="grafico-etiqueta" x="${margen.izquierda - 8}" y="${posicion + 4}" text-anchor="end">${escaparHTML(etiquetaEje(valor))}</text>`;
    }).join('');

    const etiquetas = [0, Math.floor((dias.length - 1) / 2), dias.length - 1]
        .filter((indice, posicion, lista) => lista.indexOf(indice) === posicion)
        .map(indice => `<text class="grafico-etiqueta" x="${x(indice)}" y="${alto - 12}" text-anchor="middle">${escaparHTML(dias[indice].fecha.slice(5))}</text>`)
        .join('');

    return `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Ventas online y presenciales por día">`
        + lineas
        + `<polyline class="grafico-online" points="${puntosGrafico(dias, 'online', x, y)}"></polyline>`
        + `<polyline class="grafico-presencial" points="${puntosGrafico(dias, 'presencial', x, y)}"></polyline>`
        + circulosGrafico(dias, 'online', 'grafico-punto-online', x, y)
        + circulosGrafico(dias, 'presencial', 'grafico-punto-presencial', x, y)
        + etiquetas
        + '</svg>';
}

function textoVariacion(valor) {
    const numero = Number(valor) || 0;
    const clase = numero >= 0 ? 'sube' : 'baja';

    return `<span class="${clase}">${escaparHTML(adminPorcentaje(numero))}</span>`;
}

function pintarResumenes(datos) {
    const periodos = [
        ['kpiHoyTotal', 'kpiHoyDetalle', datos.resumenes.dia],
        ['kpiSemanaTotal', 'kpiSemanaDetalle', datos.resumenes.semana],
        ['kpiMesTotal', 'kpiMesDetalle', datos.resumenes.mes]
    ];

    periodos.forEach(([idTotal, idDetalle, resumen]) => {
        const total = document.getElementById(idTotal);
        const detalle = document.getElementById(idDetalle);

        if (total) total.textContent = formatearPrecio(resumen.total.ingresos);
        if (detalle) {
            detalle.textContent = resumen.total.ventas + (resumen.total.ventas === 1 ? ' venta' : ' ventas');
        }
    });

    const ticket = document.getElementById('kpiTicket');
    const ticketDetalle = document.getElementById('kpiTicketDetalle');

    if (ticket) ticket.textContent = formatearPrecio(datos.periodo.total.ticketPromedio);
    if (ticketDetalle) {
        ticketDetalle.textContent = datos.periodo.total.ventas + ' ventas en el período';
    }
}

function pintarPeriodo(datos) {
    const filas = [
        ['kpiOnline', 'kpiOnlineDetalle', datos.periodo.online],
        ['kpiPresencial', 'kpiPresencialDetalle', datos.periodo.presencial],
        ['kpiTotal', 'kpiTotalDetalle', datos.periodo.total],
        ['kpiMargen', 'kpiMargenDetalle', {
            ingresos: datos.periodo.total.margen,
            ventas: datos.periodo.total.ventas,
            margen: datos.periodo.total.margen
        }]
    ];

    filas.forEach(([idValor, idDetalle, resumen]) => {
        const valor = document.getElementById(idValor);
        const detalle = document.getElementById(idDetalle);

        if (valor) valor.textContent = formatearPrecio(resumen.ingresos);

        if (detalle) {
            detalle.textContent = idValor === 'kpiMargen'
                ? 'Margen bruto del período'
                : resumen.ventas + (resumen.ventas === 1 ? ' venta' : ' ventas')
                    + ' · margen ' + formatearPrecio(resumen.margen);
        }
    });

    const rango = document.getElementById('dashboardRango');
    const comparacion = document.getElementById('dashboardComparacion');

    if (rango) rango.textContent = datos.rango.desde + ' — ' + datos.rango.hasta;

    if (comparacion) {
        comparacion.innerHTML = 'Ingresos ' + textoVariacion(datos.comparacion.variacion.ingresos)
            + ' · ventas ' + textoVariacion(datos.comparacion.variacion.ventas)
            + ' · online ' + textoVariacion(datos.comparacion.variacion.online)
            + ' · presencial ' + textoVariacion(datos.comparacion.variacion.presencial)
            + ' respecto del período anterior ('
            + escaparHTML(datos.rango.anteriorDesde) + ' — ' + escaparHTML(datos.rango.anteriorHasta) + ').';
    }
}

function pintarMetodos(metodos) {
    const contenedor = document.getElementById('dashboardMetodos');

    if (!contenedor) return;

    if (!metodos.length) {
        contenedor.innerHTML = '<p class="admin-vacio">Sin cobros en el período.</p>';
        return;
    }

    const maximo = Math.max(...metodos.map(metodo => metodo.total), 1);

    contenedor.innerHTML = '<div class="admin-barras">' + metodos.map(metodo => `
        <div class="admin-barra">
            <div class="admin-barra-cabecera">
                <span>${escaparHTML(etiquetaMetodoPago(metodo.metodo))}</span>
                <strong>${formatearPrecio(metodo.total)}</strong>
            </div>
            <div class="admin-barra-pista"><span style="width:${Math.max(2, Math.round((metodo.total / maximo) * 100))}%"></span></div>
            <small class="admin-kpi small">${metodo.ventas} ${metodo.ventas === 1 ? 'venta' : 'ventas'}</small>
        </div>`).join('') + '</div>';
}

function pintarTopProductos(productos) {
    const cuerpo = document.getElementById('dashboardTop');

    if (!cuerpo) return;

    if (!productos.length) {
        cuerpo.innerHTML = '<tr><td colspan="4">Sin ventas en el período.</td></tr>';
        return;
    }

    cuerpo.innerHTML = productos.map(producto => `
        <tr>
            <td>${escaparHTML(producto.nombre)}</td>
            <td class="numero">${adminNumero(producto.cantidad)}</td>
            <td class="numero">${formatearPrecio(producto.ingresos)}</td>
            <td class="numero">${formatearPrecio(producto.margen)}</td>
        </tr>`).join('');
}

function pintarStockBajo(productos) {
    const contenedor = document.getElementById('dashboardStock');
    const contador = document.getElementById('dashboardStockContador');

    if (contador) contador.textContent = productos.length;

    if (!contenedor) return;

    if (!productos.length) {
        contenedor.innerHTML = '<p class="admin-vacio">Todo el stock está en orden.</p>';
        return;
    }

    contenedor.innerHTML = productos.map(producto => `
        <div class="admin-dato">
            <a href="./productos.html?q=${encodeURIComponent(producto.nombre)}">${escaparHTML(producto.nombre)}</a>
            <span><strong>${producto.stock}</strong> / mínimo ${producto.stockMinimo}</span>
        </div>`).join('');
}

function pintarPendientes(datos) {
    const contenedor = document.getElementById('dashboardPendientes');
    const contador = document.getElementById('dashboardPendientesContador');

    if (contador) contador.textContent = datos.total;

    if (!contenedor) return;

    if (!datos.ultimos.length) {
        contenedor.innerHTML = '<p class="admin-vacio">No hay pedidos pendientes.</p>';
        return;
    }

    contenedor.innerHTML = datos.ultimos.map(orden => `
        <div class="admin-dato">
            <a href="./pedidos.html?q=${encodeURIComponent(orden.codigo)}">${escaparHTML(orden.codigo)}</a>
            <span>${escaparHTML(orden.contacto.nombre)} · ${formatearPrecio(orden.total)}</span>
        </div>`).join('');
}

function pintarNovedades(datos) {
    const clientes = document.getElementById('dashboardClientesNuevos');
    const testimonios = document.getElementById('dashboardTestimoniosPendientes');

    if (clientes) clientes.textContent = datos.clientesNuevos;
    if (testimonios) testimonios.textContent = datos.testimoniosPendientes;
}

function actualizarExportar(desde, hasta) {
    const enlace = document.getElementById('dashboardExportar');

    if (!enlace) return;

    const parametros = new URLSearchParams();

    if (desde) parametros.set('desde', desde);
    if (hasta) parametros.set('hasta', hasta);

    enlace.href = '../api/admin/dashboard/export.csv?' + parametros.toString();
}

async function cargarDashboard(desde, hasta) {
    const estado = document.getElementById('dashboardEstado');
    const parametros = new URLSearchParams();

    if (desde) parametros.set('desde', desde);
    if (hasta) parametros.set('hasta', hasta);

    adminEstado(estado, 'Cargando…', '');

    try {
        const datos = await adminPedir('/api/admin/dashboard?' + parametros.toString());

        pintarResumenes(datos);
        pintarPeriodo(datos);
        pintarMetodos(datos.metodosPago);
        pintarTopProductos(datos.topProductos);
        pintarStockBajo(datos.stockBajo);
        pintarPendientes(datos.pedidosPendientes);
        pintarNovedades(datos);

        const grafico = document.getElementById('dashboardGrafico');
        if (grafico) grafico.innerHTML = construirGrafico(datos.ventasPorDia);

        actualizarExportar(desde, hasta);
        adminEstado(estado, '', '');
    } catch (error) {
        adminEstado(estado, mensajeDeError(error), 'error');
    }
}

function rangoRapido(tipo) {
    const hoy = new Date();
    let desde = new Date(hoy);

    if (tipo === 'semana') {
        const dia = desde.getDay();
        desde.setDate(desde.getDate() - (dia === 0 ? 6 : dia - 1));
    }

    if (tipo === 'mes') {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const inputDesde = document.getElementById('dashboardDesde');
    const inputHasta = document.getElementById('dashboardHasta');
    const valorDesde = adminFechaISO(desde);
    const valorHasta = adminFechaISO(hoy);

    if (inputDesde) inputDesde.value = valorDesde;
    if (inputHasta) inputHasta.value = valorHasta;

    cargarDashboard(valorDesde, valorHasta);
}

cuandoAdminListo(() => {
    const formulario = document.getElementById('dashboardFiltros');
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inputDesde = document.getElementById('dashboardDesde');
    const inputHasta = document.getElementById('dashboardHasta');

    if (inputDesde) inputDesde.value = adminFechaISO(desde);
    if (inputHasta) inputHasta.value = adminFechaISO(hoy);

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
            cargarDashboard(inputDesde ? inputDesde.value : '', inputHasta ? inputHasta.value : '');
        });
    }

    document.querySelectorAll('[data-rango]').forEach(boton => {
        boton.addEventListener('click', () => rangoRapido(boton.dataset.rango));
    });

    cargarDashboard(adminFechaISO(desde), adminFechaISO(hoy));
});
