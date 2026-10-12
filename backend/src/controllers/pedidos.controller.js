'use strict';
/* ==========================================================
   CONTROLADOR: PEDIDOS
   ------------------------------------------------------------
   POST /api/pedidos { nombre, telefono, email?, zona?, notas? }

   Con { items: [{ id, cantidad }] } en el cuerpo, el pedido se
   arma de ahi (es el carrito de localStorage del front). Sin
   items, se arma del carrito de la sesion (cookie). En los dos
   casos el total lo calcula el servidor con el precio releido de
   la base: lo que llegue en el cuerpo nunca se cobra tal cual.

   Sin nombre y telefono no hay forma de coordinar el envio; el
   telefono se cuenta por digitos porque en Uruguay se escribe
   con + y guiones.
   ========================================================== */

const { limpiarTexto, soloDigitos } = require('../utils/texto');
const { LARGO, MINIMOS } = require('../constants');
const carrito = require('../services/carrito.service');
const { nuevoPedido, lineasDesdeBruto, listarDeUsuario } = require('../services/pedidos.service');

/* De donde salen las lineas del pedido. Son DOS caminos a
   proposito:

   1. El carrito en localStorage del front manda el pedido en el
      cuerpo ({ items: [{ id, cantidad }] }): se relee precio y
      nombre de la base, igual que siempre.
   2. Sin items en el cuerpo, el pedido se arma del carrito de la
      sesion (cookie), el del backend anterior.

   Devuelve null si ya respondio un error, o un objeto
   { lineas, deCarritoServidor } para seguir. */
async function definirLineas(req, res) {
    if (req.body && Array.isArray(req.body.items)) {
        const { tipo, lineas } = await lineasDesdeBruto(req.body.items);

        if (tipo === 'formato') {
            res.status(400).json({ error: 'El pedido no trae productos válidos' });
            return null;
        }

        if (tipo === 'vacio') {
            res.status(400).json({ error: 'El carrito está vacío' });
            return null;
        }

        if (tipo === 'inexistente') {
            res.status(400).json({ error: 'Producto no encontrado' });
            return null;
        }

        return { lineas, deCarritoServidor: false };
    }

    const armado = await carrito.armar(req.sesion);

    if (armado.items.length === 0) {
        res.status(400).json({ error: 'El carrito está vacío' });
        return null;
    }

    const lineas = armado.items.map(item => ({
        producto_id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
    }));

    return { lineas, deCarritoServidor: true };
}

async function crear(req, res, next) {
    try {
        const nombre = limpiarTexto(req.body && req.body.nombre, LARGO.nombre);
        const telefono = limpiarTexto(req.body && req.body.telefono, LARGO.telefono);

        if (nombre.length < MINIMOS.nombre) {
            return res.status(400).json({ error: 'Escribí tu nombre', campo: 'nombre' });
        }

        if (soloDigitos(telefono).length < MINIMOS.telefonoDigitos) {
            return res.status(400).json({ error: 'Falta un teléfono de contacto', campo: 'telefono' });
        }

        const resultado = await definirLineas(req, res);

        if (!resultado) return;

        const { lineas, deCarritoServidor } = resultado;

        const pedido = await nuevoPedido({
            sesion: req.sesion,
            /* La ruta pasa por exigirSesion, asi que req.usuario
               siempre esta: el pedido queda a nombre de la cuenta. */
            usuario: req.usuario ? req.usuario._id : null,
            nombre,
            telefono,
            email: limpiarTexto(req.body && req.body.email, LARGO.correo) || null,
            zona: limpiarTexto(req.body && req.body.zona, LARGO.zona) || null,
            notas: limpiarTexto(req.body && req.body.notas, LARGO.notas) || null,
            lineas,
        });

        if (pedido.tipo === 'shortage') {
            /* 409, no 500: es falta de stock real, no un error de
               servidor. Se mandan las unidades reales para que el
               cliente baje la cantidad y pueda seguir. */
            const shortages = pedido.problemas.filter(
                problema => problema.disponibles === null || problema.disponibles < problema.pedido
            );

            return res.status(409).json({ error: 'No hay stock suficiente', shortages });
        }

        /* Si el pedido salio del carrito de la sesion, ese carrito
           se vacia recien aca: si no se cerro, queda igual y el
           cliente puede corregirlo. El carrito de localStorage del
           front lo vacia el propio front cuando llega el 201. */
        if (deCarritoServidor) {
            await carrito.vaciar(req.sesion);
        }

        res.status(201).json({ ok: true, id: pedido.id, total: pedido.total });
    } catch (error) {
        next(error);
    }
}

/* GET /api/pedidos — el historial de la cuenta con sesion. La ruta
   pasa por exigirSesion, asi que req.usuario siempre esta: se listan
   solo los pedidos de esa cuenta, del mas nuevo al mas viejo. */
async function listar(req, res, next) {
    try {
        const pedidos = await listarDeUsuario(req.usuario._id);

        res.json({ pedidos });
    } catch (error) {
        next(error);
    }
}

module.exports = { crear, listar };