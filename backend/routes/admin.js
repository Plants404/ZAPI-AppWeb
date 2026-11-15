'use strict';

const express = require('express');
const { HttpError } = require('../lib/http-error.js');
const { requerirAdmin } = require('../lib/auth.js');

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'];
const CANALES_VALIDOS = ['web', 'presencial'];
const LIMITE_POR_PAGINA_DEFAULT = 20;
const LIMITE_POR_PAGINA_MAX = 100;
const SEMANAS_VENTAS = 8;
const STOCK_BAJO_MAX = 3;

/* Devuelve [anio, numeroSemana] para una fecha (semana comienza el lunes). */
function anioSemana(fecha) {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = d.getUTCDay() || 7; // domingo = 7
    d.setUTCDate(d.getUTCDate() + 4 - dia);
    const anioInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semana = Math.ceil(((d - anioInicio) / 86400000 + 1) / 7);
    return [d.getUTCFullYear(), semana];
}

function formatoSemana(anio, semana) {
    return `${anio}-W${String(semana).padStart(2, '0')}`;
}

function textoOpcional(valor, maximo) {
    if (valor === undefined || valor === null) return undefined;
    if (typeof valor !== 'string') throw new HttpError(400, 'Filtro inválido.');
    const limpio = valor.trim();
    if (!limpio) return undefined;
    if (limpio.length > maximo) throw new HttpError(400, 'Filtro demasiado largo.');
    return limpio;
}

function enteroPositivo(valor, defecto, maximo) {
    if (valor === undefined || valor === null || valor === '') return defecto;
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1 || n > maximo) {
        throw new HttpError(400, 'Paginación inválida.');
    }
    return n;
}

function fechaOpcional(valor) {
    if (valor === undefined || valor === null || valor === '') return undefined;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Fecha inválida.');
    return d;
}

function crearRouter(getDatabase) {
    const router = express.Router();

    /* Resumen del panel (solo lectura). */
    router.get('/resumen', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const pedidos = await db.collection('orders').find().toArray();

        const validos = pedidos.filter(p =>
            p.estado === 'confirmado' || p.estado === 'entregado'
        );
        const ventas = validos.reduce((total, p) => total + (p.total || 0), 0);
        const ticketPromedio = validos.length
            ? ventas / validos.length
            : 0;

        /* Ventas por semana de las últimas 8 semanas, por canal. */
        const ahora = new Date();
        const semanas = [];
        for (let i = SEMANAS_VENTAS - 1; i >= 0; i -= 1) {
            const d = new Date(ahora);
            d.setDate(d.getDate() - i * 7);
            const [a, s] = anioSemana(d);
            semanas.push({ anio: a, semana: s, web: 0, presencial: 0 });
        }
        const indiceSemana = new Map(semanas.map((s, idx) => [formatoSemana(s.anio, s.semana), idx]));

        for (const p of validos) {
            const [a, s] = anioSemana(p.fecha || new Date());
            const clave = formatoSemana(a, s);
            const idx = indiceSemana.get(clave);
            if (idx !== undefined) {
                const canal = p.canal === 'presencial' ? 'presencial' : 'web';
                semanas[idx][canal] += (p.total || 0);
            }
        }

        /* Stock bajo: productos con entre 1 y 3 unidades. */
        const productos = await db.collection('products').find().toArray();
        const stockBajo = productos
            .filter(p => typeof p.stock === 'number' && p.stock >= 1 && p.stock <= STOCK_BAJO_MAX)
            .sort((a, b) => a.stock - b.stock)
            .map(p => ({
                id: p.id,
                slug: p.slug,
                nombre: p.nombre,
                stock: p.stock,
                active: !!p.active
            }));

        /* Pedidos por confirmar. */
        const pedidosPorConfirmar = pedidos.filter(p => p.estado === 'pendiente').length;

        /* Conversión: pedidos confirmados / visitantes únicos. */
        const visitantesUnicos = 0; /* Se actualiza con la entrega de analítica de clientes. */
        const conversion = visitantesUnicos
            ? pedidos.filter(p => p.estado === 'confirmado').length / visitantesUnicos
            : null;

        res.json({
            ventas,
            ticketPromedio,
            ventasPorSemana: semanas.map(s => ({
                semana: formatoSemana(s.anio, s.semana),
                web: s.web,
                presencial: s.presencial
            })),
            stockBajo,
            pedidosPorConfirmar,
            conversion,
            visitantesUnicos
        });
    });

    /* Listado de pedidos con filtros y paginación (solo lectura). */
    router.get('/pedidos', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const pagina = enteroPositivo(req.query.page, 1, LIMITE_POR_PAGINA_MAX);
        const porPagina = enteroPositivo(req.query.limit, LIMITE_POR_PAGINA_DEFAULT, LIMITE_POR_PAGINA_MAX);
        const estadoFiltro = textoOpcional(req.query.estado, 20);
        const canalFiltro = textoOpcional(req.query.canal, 20);
        const fechaDesde = fechaOpcional(req.query.fechaDesde);
        const fechaHasta = fechaOpcional(req.query.fechaHasta);
        const q = textoOpcional(req.query.q, 100);

        if (estadoFiltro && !ESTADOS_VALIDOS.includes(estadoFiltro)) {
            throw new HttpError(400, 'Estado de pedido no válido.');
        }
        if (canalFiltro && !CANALES_VALIDOS.includes(canalFiltro)) {
            throw new HttpError(400, 'Canal no válido.');
        }

        const filtro = {};
        if (estadoFiltro) filtro.estado = estadoFiltro;
        if (canalFiltro) filtro.canal = canalFiltro;
        if (q) {
            filtro.$or = [
                { id: q },
                { 'cliente.nombre': { $regex: q, $options: 'i' } },
                { 'cliente.email': { $regex: q, $options: 'i' } }
            ];
        }
        if (fechaDesde || fechaHasta) {
            filtro.fecha = {};
            if (fechaDesde) filtro.fecha.$gte = fechaDesde;
            if (fechaHasta) filtro.fecha.$lte = fechaHasta;
        }

        const total = await db.collection('orders').countDocuments(filtro);
        const cursor = db.collection('orders').find(filtro).sort({ fecha: -1 });
        const pedidos = await cursor
            .skip((pagina - 1) * porPagina)
            .limit(porPagina)
            .toArray();

        const resultado = pedidos.map(p => ({
            id: p.id,
            fecha: p.fecha,
            estado: p.estado,
            canal: p.canal || 'web',
            cliente: p.cliente || {},
            lineas: p.lineas || [],
            subtotal: p.subtotal,
            envio: p.envio,
            total: p.total
        }));

        res.json({
            pedidos: resultado,
            total,
            pagina,
            porPagina,
            totalPaginas: Math.ceil(total / porPagina)
        });
    });

    /* Catálogo completo para admin, incluidos los inactivos (solo lectura). */
    router.get('/productos', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const productos = await db.collection('products').find({}).sort({ id: 1 }).toArray();

        res.json({
            products: productos.map(p => ({
                id: p.id,
                slug: p.slug,
                nombre: p.nombre,
                categoria: p.categoria,
                imagen: p.imagen || '',
                imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
                descripcion: p.descripcion || '',
                infoDeVenta: Array.isArray(p.infoDeVenta) ? p.infoDeVenta : [],
                precioBase: p.precioBase,
                stock: p.stock,
                active: !!p.active,
                visible: p.visible !== false,
                destacado: !!p.destacado
            }))
        });
    });

    /* Últimos cambios: lectura de auditoría (solo admin). */
    router.get('/auditoria', requerirAdmin(getDatabase), async (req, res) => {
        const db = getDatabase();
        const entradas = await db.collection('auditoria')
            .find()
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        res.json({
            auditoria: entradas.map(e => ({
                id: e._id ? String(e._id) : '',
                usuario: e.usuario,
                email: e.email,
                rol: e.rol,
                accion: e.accion,
                antes: e.antes,
                despues: e.despues,
                resumen: e.resumen,
                fecha: e.createdAt
            }))
        });
    });

    return router;
}

module.exports = { crearRouter };
