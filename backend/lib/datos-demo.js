'use strict';

/* Datos de demostración (mensajes, testimonios, pedidos y eventos de analítica).
   Sirven para mostrar el panel con información cuando todavía no hay clientes
   reales. Todos llevan `ejemplo: true` para poder borrarlos con ese filtro.
   El generador es determinista: la misma fecha produce los mismos datos. */

const { randomUUID } = require('node:crypto');

const DIA = 24 * 60 * 60 * 1000;

const PRODUCTOS = [
    { id: 1, slug: 'albahaca', nombre: 'Albahaca', precio: 150 },
    { id: 2, slug: 'ruda', nombre: 'Ruda', precio: 120 },
    { id: 3, slug: 'suculenta', nombre: 'Suculenta', precio: 180 },
    { id: 4, slug: 'cactus', nombre: 'Cactus', precio: 220 },
    { id: 5, slug: 'suculentas-mix', nombre: 'Suculentas mix', precio: 90 },
    { id: 6, slug: 'cretona', nombre: 'Cretona', precio: 320 },
    { id: 7, slug: 'kit-de-huerta-sustentable', nombre: 'Kit de huerta sustentable', precio: 650 }
];

const CLIENTES = [
    ['Camila Rodríguez', '099 123 456', 'Pocitos'], ['Martín Techera', '098 220 311', 'Cordón'],
    ['Lucía Fernández', '091 555 010', 'Malvín'], ['Andrés Silva', '094 802 771', 'Ciudad de la Costa'],
    ['Valentina Cabrera', '099 410 238', 'Punta Carretas'], ['Joaquín Pereira', '092 337 604', 'Tres Cruces'],
    ['Sofía Márquez', '098 761 902', 'Parque Rodó'], ['Diego Olivera', '095 118 450', 'Carrasco'],
    ['Florencia Núñez', '099 902 133', 'La Blanqueada'], ['Mateo Acosta', '091 640 287', 'Canelones'],
    ['Agustina Long', '098 455 019', 'Buceo'], ['Bruno Castro', '094 370 826', 'Prado']
];

const TESTIMONIOS = [
    { autor: 'Sofía M.', lugar: 'Pocitos, Montevideo', estrellas: 5, productoId: 3, estado: 'approved', dias: 6,
        texto: 'Las plantas llegaron perfectas y muy bien embaladas. La suculenta ya está en mi escritorio y se ve hermosa.' },
    { autor: 'Diego R.', lugar: 'Ciudad de la Costa', estrellas: 5, productoId: 7, estado: 'approved', dias: 11,
        texto: 'Compré el kit de huerta y mis hijos lo disfrutaron muchísimo. Las instrucciones son claras y ya cosechamos las primeras hojas.' },
    { autor: 'Paula G.', lugar: 'Maldonado', estrellas: 4, productoId: 4, estado: 'approved', dias: 17,
        texto: 'El cactus es precioso y llegó en perfecto estado. Tardó un poco el envío, pero valió la pena.' },
    { autor: 'Nicolás B.', lugar: 'Cordón, Montevideo', estrellas: 5, productoId: null, estado: 'approved', dias: 23,
        texto: 'Excelente atención por WhatsApp y plantas sanas. Ya hice mi segunda compra y me asesoraron con los cuidados.' },
    { autor: 'Lucía F.', lugar: 'Malvín, Montevideo', estrellas: 5, productoId: 1, estado: 'approved', dias: 29,
        texto: 'La albahaca llegó fresca y con un aroma increíble. Me encanta que sea un cultivo agroecológico.' },
    { autor: 'Mateo A.', lugar: 'Canelones', estrellas: 5, productoId: 6, estado: 'approved', dias: 35,
        texto: 'La cretona le dio color a todo el living. Se nota el cuidado con que preparan cada planta.' },
    { autor: 'Romina A.', lugar: 'Colonia', estrellas: 2, productoId: 6, estado: 'rejected', dias: 40,
        texto: 'La cretona llegó con algunas hojas dañadas por el traslado.' },
    { autor: 'Camila R.', lugar: 'Punta Carretas', estrellas: 5, productoId: 5, estado: 'pending', dias: 1,
        texto: 'El pack de suculentas mix es hermoso y súper económico. Lo recomiendo para regalar.' }
];

function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generarPedidos(ahora = new Date(), cantidad = 30) {
    const r = azar(20261115);
    const pedidos = [];
    for (let i = 0; i < cantidad; i += 1) {
        const dias = Math.floor(r() * 55) + (r() < 0.2 ? 0 : 1);
        const fecha = new Date(ahora.getTime() - dias * DIA - Math.floor(r() * 10) * 3600000);
        const presencial = r() < 0.35;
        const [nombre, telefono, zona] = CLIENTES[Math.floor(r() * CLIENTES.length)];
        const cantLineas = 1 + Math.floor(r() * 3);
        const elegidos = new Set();
        while (elegidos.size < cantLineas) elegidos.add(Math.floor(r() * PRODUCTOS.length));
        const lineas = [...elegidos].map(indice => {
            const p = PRODUCTOS[indice];
            return { id: p.id, slug: p.slug, nombre: p.nombre, precio: p.precio, cantidad: 1 + Math.floor(r() * (p.precio < 200 ? 4 : 2)) };
        });
        const subtotal = lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);
        const envio = subtotal >= 2500 ? 0 : null;

        let estado;
        const x = r();
        if (dias < 3) estado = x < 0.6 ? 'pendiente' : 'confirmado';
        else if (x < 0.62) estado = 'entregado';
        else if (x < 0.85) estado = 'confirmado';
        else if (x < 0.93) estado = 'pendiente';
        else estado = 'cancelado';

        const historial = [{ estado: 'pendiente', fecha, usuario: 'sistema', email: '', resumen: 'Pedido creado' }];
        if (estado !== 'pendiente') {
            historial.push({ estado, fecha: new Date(fecha.getTime() + 3 * 3600000), usuario: 'demo', email: 'zapi.vivero@gmail.com', resumen: `Pedido pasó a ${estado}` });
        }
        pedidos.push({
            id: `ZAPI-${randomUUID()}`,
            fecha,
            estado,
            canal: presencial ? 'presencial' : 'web',
            cliente: { nombre, telefono, zona: presencial ? 'Retiro en vivero' : zona, notas: '', email: '' },
            lineas,
            subtotal,
            envio,
            total: subtotal + (envio || 0),
            historial,
            ejemplo: true
        });
    }
    return pedidos.sort((a, b) => a.fecha - b.fecha);
}

function generarEventos(ahora = new Date(), sesiones = 70) {
    const r = azar(777);
    const eventos = [];
    const paginasCat = ['/', '/catalogo', '/servicios', '/nosotros', '/contacto'];
    const ttl = new Date(ahora.getTime() + 90 * DIA);
    const base = {};

    function evento(tipo, idSesion, pagina, elemento, dispositivo, t) {
        eventos.push({ tipo, idSesion, pagina, elemento, dispositivo, timestamp: new Date(t), ttl, ejemplo: true, ...base });
    }

    for (let s = 0; s < sesiones; s += 1) {
        const idSesion = randomUUID();
        const dispositivo = r() < 0.62 ? 'movil' : 'computadora';
        let t = ahora.getTime() - Math.floor(r() * 28 * DIA) - Math.floor(r() * 12) * 3600000;
        const vistas = 1 + Math.floor(r() * 4);
        const visitadas = [];
        for (let v = 0; v < vistas; v += 1) {
            const pagina = v === 0 ? (r() < 0.7 ? '/' : '/catalogo')
                : (r() < 0.45 ? '/producto-' + PRODUCTOS[Math.floor(r() * PRODUCTOS.length)].slug
                    : paginasCat[Math.floor(r() * paginasCat.length)]);
            visitadas.push(pagina);
            evento('vista_de_pagina', idSesion, pagina, null, dispositivo, t);
            if (r() < 0.4) evento('clic_elemento_clave', idSesion, pagina, r() < 0.6 ? 'boton-primario' : 'boton-secundario', dispositivo, t + 8000);
            t += 20000 + Math.floor(r() * 90000);
        }
        if (r() < 0.38) {
            const pagina = visitadas.find(p => p.startsWith('/producto-')) || '/catalogo';
            const slug = pagina.startsWith('/producto-') ? pagina.slice(10) : null;
            const producto = PRODUCTOS.find(p => p.slug === slug) || PRODUCTOS[Math.floor(r() * PRODUCTOS.length)];
            evento('agregar_al_carrito', idSesion, pagina, 'add-cart', dispositivo, t);
            eventos[eventos.length - 1].productoId = String(producto.id);
            t += 15000;
            if (r() < 0.55) {
                evento('inicio_de_pedido', idSesion, '/carrito', 'boton-confirmar-pedido', dispositivo, t);
                t += 12000;
                if (r() < 0.5) evento('clic_a_whatsapp', idSesion, '/carrito', 'whatsapp', dispositivo, t);
            }
        } else if (r() < 0.12) {
            evento('clic_a_whatsapp', idSesion, '/contacto', 'whatsapp', dispositivo, t);
        }
    }
    return eventos.sort((a, b) => a.timestamp - b.timestamp);
}

module.exports = { PRODUCTOS, TESTIMONIOS, generarPedidos, generarEventos };
