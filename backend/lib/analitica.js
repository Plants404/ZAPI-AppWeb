'use strict';

/* Cálculos de la pantalla "Analítica de clientes". Funciones puras: reciben
   eventos y pedidos ya leídos y devuelven números listos para mostrar. */

const DIA = 24 * 60 * 60 * 1000;
const UTC_URUGUAY = -3 * 60 * 60 * 1000;
const HORA_INICIAL = 8;
const BLOQUES_HORARIOS = 7; /* de 8 a 22 h, de a 2 h */
const DIAS_INACTIVO = 60;
const DIAS_CLIENTES = 90;

const tiempo = valor => new Date(valor).getTime();

function sesionesDe(eventos, tipo) {
    const sesiones = new Set();
    for (const evento of eventos) if (evento.tipo === tipo) sesiones.add(evento.idSesion);
    return sesiones;
}

function conteos(eventos) {
    const vistas = sesionesDe(eventos, 'vista_de_pagina');
    return {
        visitas: vistas.size,
        carrito: sesionesDe(eventos, 'agregar_al_carrito').size,
        pedidos: sesionesDe(eventos, 'inicio_de_pedido').size,
        whatsapp: sesionesDe(eventos, 'clic_a_whatsapp').size
    };
}

/* Sesiones distintas por día, en ventanas corridas de `dias` días. */
function seriePorDia(eventos, tipo, desdeMs, dias) {
    const porDia = Array.from({ length: dias }, () => new Set());
    for (const evento of eventos) {
        if (evento.tipo !== tipo) continue;
        const indice = Math.floor((tiempo(evento.timestamp) - desdeMs) / DIA);
        if (indice >= 0 && indice < dias) porDia[indice].add(evento.idSesion);
    }
    return porDia.map(conjunto => conjunto.size);
}

function dispositivos(eventos) {
    const porSesion = new Map();
    for (const evento of eventos) {
        if (!porSesion.has(evento.idSesion)) porSesion.set(evento.idSesion, { dispositivo: evento.dispositivo, vista: false, pedido: false });
        const sesion = porSesion.get(evento.idSesion);
        if (evento.tipo === 'vista_de_pagina') sesion.vista = true;
        if (evento.tipo === 'inicio_de_pedido') sesion.pedido = true;
    }
    const resultado = { movil: { sesiones: 0, pedidos: 0 }, computadora: { sesiones: 0, pedidos: 0 } };
    for (const sesion of porSesion.values()) {
        if (!sesion.vista) continue;
        const destino = resultado[sesion.dispositivo === 'movil' ? 'movil' : 'computadora'];
        destino.sesiones += 1;
        if (sesion.pedido) destino.pedidos += 1;
    }
    const total = resultado.movil.sesiones + resultado.computadora.sesiones;
    for (const destino of Object.values(resultado)) {
        destino.porcentaje = total ? Math.round((destino.sesiones / total) * 100) : 0;
        destino.conversion = destino.sesiones ? Math.round((destino.pedidos / destino.sesiones) * 100) : 0;
    }
    return resultado;
}

/* Visitas por día de la semana (lunes a domingo) y franja de 2 horas. */
function horarios(eventos) {
    const matriz = Array.from({ length: 7 }, () => Array(BLOQUES_HORARIOS).fill(0));
    for (const evento of eventos) {
        if (evento.tipo !== 'vista_de_pagina') continue;
        const local = new Date(tiempo(evento.timestamp) + UTC_URUGUAY);
        const dia = (local.getUTCDay() + 6) % 7;
        const bloque = Math.floor((local.getUTCHours() - HORA_INICIAL) / 2);
        if (bloque >= 0 && bloque < BLOQUES_HORARIOS) matriz[dia][bloque] += 1;
    }
    return matriz;
}

/* Por página: visitas, clics en botones clave y cuántas sesiones siguieron a otra. */
function paginas(eventos) {
    const porPagina = new Map();
    const dePagina = pagina => {
        if (!porPagina.has(pagina)) porPagina.set(pagina, { pagina, visitas: 0, clics: 0, sesiones: new Set(), siguen: new Set() });
        return porPagina.get(pagina);
    };
    const ordenados = [...eventos].sort((a, b) => tiempo(a.timestamp) - tiempo(b.timestamp));
    const porSesion = new Map();
    for (const evento of ordenados) {
        if (!evento.pagina) continue;
        const item = dePagina(evento.pagina);
        if (evento.tipo === 'vista_de_pagina') {
            item.visitas += 1;
            item.sesiones.add(evento.idSesion);
        } else {
            item.clics += 1;
        }
        if (!porSesion.has(evento.idSesion)) porSesion.set(evento.idSesion, []);
        porSesion.get(evento.idSesion).push(evento);
    }
    for (const [idSesion, lista] of porSesion) {
        lista.forEach((evento, i) => {
            if (evento.tipo !== 'vista_de_pagina') return;
            if (lista.slice(i + 1).some(otro => otro.pagina !== evento.pagina)) dePagina(evento.pagina).siguen.add(idSesion);
        });
    }
    return [...porPagina.values()]
        .filter(item => item.visitas > 0)
        .map(item => ({
            pagina: item.pagina,
            visitas: item.visitas,
            clics: item.clics,
            siguen: item.sesiones.size ? Math.round((item.siguen.size / item.sesiones.size) * 100) : 0
        }))
        .sort((a, b) => b.visitas - a.visitas)
        .slice(0, 8);
}

function productos(eventos, pedidos, nombres) {
    const mapa = new Map();
    const de = id => {
        if (!mapa.has(id)) mapa.set(id, { id, nombre: nombres.get(id) || id, agregados: 0, pedidos: 0 });
        return mapa.get(id);
    };
    for (const evento of eventos) {
        if (evento.tipo === 'agregar_al_carrito' && evento.productoId) de(evento.productoId).agregados += 1;
    }
    for (const pedido of pedidos) {
        const ids = new Set((pedido.lineas || []).map(linea => String(linea.id)));
        for (const id of ids) {
            const item = de(id);
            const linea = pedido.lineas.find(l => String(l.id) === id);
            if (linea && linea.nombre && !nombres.has(id)) item.nombre = linea.nombre;
            item.pedidos += 1;
        }
    }
    return [...mapa.values()]
        .sort((a, b) => (b.agregados - a.agregados) || (b.pedidos - a.pedidos))
        .slice(0, 8);
}

/* eventos: los del período actual y el anterior juntos. */
function calcularAnalitica({ eventos, pedidos = [], nombres = new Map(), dias, ahora = new Date() }) {
    const hastaMs = tiempo(ahora);
    const desdeMs = hastaMs - dias * DIA;
    const previoMs = desdeMs - dias * DIA;
    const actuales = eventos.filter(e => tiempo(e.timestamp) >= desdeMs && tiempo(e.timestamp) <= hastaMs);
    const previos = eventos.filter(e => tiempo(e.timestamp) >= previoMs && tiempo(e.timestamp) < desdeMs);
    const ahoraC = conteos(actuales);
    const antesC = conteos(previos);
    const pedidosPeriodo = pedidos.filter(p => tiempo(p.fecha) >= desdeMs && tiempo(p.fecha) <= hastaMs);

    return {
        dias,
        indicadores: { actual: ahoraC, previo: antesC },
        embudo: [
            { clave: 'visitas', valor: ahoraC.visitas },
            { clave: 'carrito', valor: ahoraC.carrito },
            { clave: 'pedidos', valor: ahoraC.pedidos },
            { clave: 'whatsapp', valor: ahoraC.whatsapp }
        ],
        serie: {
            visitas: seriePorDia(actuales, 'vista_de_pagina', desdeMs, dias),
            visitasPrevias: seriePorDia(previos, 'vista_de_pagina', previoMs, dias),
            carrito: seriePorDia(actuales, 'agregar_al_carrito', desdeMs, dias),
            pedidos: seriePorDia(actuales, 'inicio_de_pedido', desdeMs, dias)
        },
        dispositivos: dispositivos(actuales),
        horarios: horarios(actuales),
        paginas: paginas(actuales),
        productos: productos(actuales, pedidosPeriodo, nombres)
    };
}

/* ----- Clientes (a partir de los pedidos) ----- */

function claveCliente(cliente) {
    const telefono = String((cliente && cliente.telefono) || '').replace(/\D/g, '');
    if (telefono.length >= 6) return `tel:${telefono}`;
    const email = String((cliente && cliente.email) || '').trim().toLowerCase();
    if (email) return `mail:${email}`;
    return `nom:${String((cliente && cliente.nombre) || '').trim().toLowerCase()}`;
}

function calcularClientes(pedidos, ahora = new Date()) {
    const ahoraMs = tiempo(ahora);
    const validos = pedidos
        .filter(p => p && p.estado !== 'cancelado' && p.cliente)
        .sort((a, b) => tiempo(a.fecha) - tiempo(b.fecha));

    const porCliente = new Map();
    for (const pedido of validos) {
        const clave = claveCliente(pedido.cliente);
        if (!porCliente.has(clave)) porCliente.set(clave, []);
        porCliente.get(clave).push(pedido);
    }

    const diasDesde = fecha => Math.floor((ahoraMs - tiempo(fecha)) / DIA);
    const separaciones = [];
    const clientes = [];

    for (const [id, lista] of porCliente) {
        const ultimo = lista[lista.length - 1];
        const total = lista.reduce((suma, p) => suma + (Number(p.total) || 0), 0);
        const huecos = [];
        for (let i = 1; i < lista.length; i += 1) huecos.push((tiempo(lista[i].fecha) - tiempo(lista[i - 1].fecha)) / DIA);
        separaciones.push(...huecos);

        const cantidades = new Map();
        for (const pedido of lista) {
            for (const linea of pedido.lineas || []) {
                const actual = cantidades.get(linea.id) || { nombre: linea.nombre, cantidad: 0 };
                actual.cantidad += Number(linea.cantidad) || 0;
                cantidades.set(linea.id, actual);
            }
        }
        const dias = diasDesde(ultimo.fecha);
        const estado = dias > DIAS_INACTIVO ? 'inactivo' : lista.length > 1 ? 'recurrente' : 'nuevo';

        clientes.push({
            id,
            nombre: ultimo.cliente.nombre || 'Sin nombre',
            telefono: ultimo.cliente.telefono || '',
            zona: ultimo.cliente.zona || '',
            pedidos: lista.length,
            total,
            ticket: Math.round(total / lista.length),
            primera: new Date(lista[0].fecha).toISOString(),
            ultima: new Date(ultimo.fecha).toISOString(),
            dias,
            entreCompras: huecos.length ? Math.round(huecos.reduce((a, b) => a + b, 0) / huecos.length) : null,
            estado,
            favoritos: [...cantidades.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 3).map(item => item.nombre),
            ultimos: lista.slice(-3).reverse().map(p => ({
                dias: diasDesde(p.fecha),
                productos: (p.lineas || []).reduce((s, l) => s + (Number(l.cantidad) || 0), 0),
                estado: p.estado
            }))
        });
    }
    clientes.sort((a, b) => a.dias - b.dias);

    const recientes = clientes.filter(c => c.dias <= DIAS_CLIENTES);
    const recurrentes = recientes.filter(c => c.pedidos > 1).length;
    const desde = ahoraMs - DIAS_CLIENTES * DIA;
    const previoDesde = desde - DIAS_CLIENTES * DIA;
    const promedio = lista => (lista.length ? Math.round(lista.reduce((s, p) => s + (Number(p.total) || 0), 0) / lista.length) : 0);
    const enPeriodo = validos.filter(p => tiempo(p.fecha) >= desde);
    const enPrevio = validos.filter(p => tiempo(p.fecha) >= previoDesde && tiempo(p.fecha) < desde);

    return {
        resumen: {
            clientes: recientes.length,
            recurrentesPct: recientes.length ? Math.round((recurrentes / recientes.length) * 100) : 0,
            nuevosPct: recientes.length ? 100 - Math.round((recurrentes / recientes.length) * 100) : 0,
            ticket: { valor: promedio(enPeriodo), previo: promedio(enPrevio) },
            entreCompras: separaciones.length ? Math.round(separaciones.reduce((a, b) => a + b, 0) / separaciones.length) : null
        },
        segmentos: {
            todos: clientes.length,
            nuevos: clientes.filter(c => c.pedidos === 1).length,
            recurrentes: clientes.filter(c => c.pedidos > 1).length,
            inactivos: clientes.filter(c => c.estado === 'inactivo').length
        },
        clientes: clientes.slice(0, 200)
    };
}

module.exports = { calcularAnalitica, calcularClientes };
